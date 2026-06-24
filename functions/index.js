const os = require("os");
const path = require("path");
const fs = require("fs/promises");
const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onObjectFinalized } = require("firebase-functions/v2/storage");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const sharp = require("sharp");
const {
  nowIsoDate,
  sanitizeString,
  sanitizeObject,
  flattenStrings,
  extractLikelyMediaUrls,
  roleFromToken,
  hasAnyRole,
  clientIp,
  stableHash
} = require("./lib/core-utils");

admin.initializeApp();

const REGION = "us-central1";
const DEFAULT_ALLOWED_ORIGINS = [
  "https://georgiahills.com",
  "https://www.georgiahills.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5000",
  "http://127.0.0.1:5000"
];

async function upsertMediaUsage(url, usage) {
  if (!url) return;
  try {
    const mediaId = stableHash(url);
    await admin.firestore().collection("media_assets").doc(mediaId).set({
      url,
      lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
      usages: admin.firestore.FieldValue.arrayUnion(usage)
    }, { merge: true });
  } catch (error) {
    logger.warn("upsertMediaUsage failed", { error: error.message });
  }
}

async function processScheduledPublishes() {
  const nowTs = Date.now();
  const queueSnap = await admin.firestore()
    .collection("cms_publish_queue")
    .where("status", "==", "scheduled")
    .where("scheduledAtMs", "<=", nowTs)
    .limit(20)
    .get();

  if (queueSnap.empty) return { processed: 0 };

  let processed = 0;
  for (const docSnap of queueSnap.docs) {
    const item = docSnap.data() || {};
    const pageId = sanitizeString(item.pageId, 80);
    if (!pageId) continue;

    const pageRef = admin.firestore().collection("cms_pages").doc(pageId);
    const settingsRef = admin.firestore().collection("settings").doc(`page_${pageId}`);
    const revisionRef = pageRef.collection("revisions").doc();

    const pageSnap = await pageRef.get();
    const draft = sanitizeObject(pageSnap.data()?.draft || {});
    if (!draft || Object.keys(draft).length === 0) {
      await docSnap.ref.set({ status: "failed", error: "no_draft_found", updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      continue;
    }

    await admin.firestore().runTransaction(async (tx) => {
      tx.set(settingsRef, draft, { merge: true });
      tx.set(pageRef, {
        pageId,
        published: draft,
        status: "published",
        publishedAt: admin.firestore.FieldValue.serverTimestamp(),
        publishedBy: sanitizeString(item.scheduledBy || "scheduler", 200),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: sanitizeString(item.scheduledBy || "scheduler", 200),
        lastPublishNote: sanitizeString(item.note || "", 600),
        lastChangeSummary: sanitizeString(item.changeSummary || "", 1000)
      }, { merge: true });
      tx.set(revisionRef, {
        type: "scheduled_publish",
        data: draft,
        note: sanitizeString(item.note || "", 600),
        changeSummary: sanitizeString(item.changeSummary || "", 1000),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: sanitizeString(item.scheduledBy || "scheduler", 200)
      });
      tx.set(docSnap.ref, {
        status: "published",
        publishedAt: admin.firestore.FieldValue.serverTimestamp(),
        revisionId: revisionRef.id,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    });

    processed += 1;
  }

  return { processed };
}

function getAllowedOrigins() {
  const env = process.env.ALLOWED_ORIGINS || "";
  const extra = env
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  return [...new Set([...DEFAULT_ALLOWED_ORIGINS, ...extra])];
}

function parseBoolEnv(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return defaultValue;
}

function getAdminAllowedOrigins() {
  const env = process.env.ADMIN_ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS || "";
  const extra = env
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  return [...new Set([...DEFAULT_ALLOWED_ORIGINS, ...extra])];
}

function validateAdminOrigin(req) {
  const origin = sanitizeString(req.get("origin") || "", 300);
  const requireOrigin = parseBoolEnv(process.env.ADMIN_REQUIRE_ORIGIN, true);
  const allowedOrigins = getAdminAllowedOrigins();
  if (!origin) {
    return {
      allowed: !requireOrigin,
      reason: requireOrigin ? "missing_origin" : "origin_optional",
      origin,
      allowedOrigins
    };
  }
  if (!allowedOrigins.includes(origin)) {
    return { allowed: false, reason: "origin_not_allowed", origin, allowedOrigins };
  }
  return { allowed: true, reason: "ok", origin, allowedOrigins };
}

function applyCors(req, res, methods = "POST, OPTIONS") {
  const origin = req.get("origin") || "";
  const allowedOrigins = getAllowedOrigins();
  const originAllowed = !origin || allowedOrigins.includes(origin);

  if (originAllowed && origin) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
  }
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Allow-Methods", methods);

  return originAllowed;
}

async function decodeAuthToken(req) {
  const authHeader = req.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const idToken = authHeader.slice(7).trim();
  if (!idToken) return null;
  return admin.auth().verifyIdToken(idToken);
}

async function requireRole(req, res, roles) {
  try {
    const decoded = await decodeAuthToken(req);
    if (!decoded || !hasAnyRole(decoded, roles)) {
      res.status(403).json({ ok: false, error: "forbidden" });
      return null;
    }
    return decoded;
  } catch (error) {
    logger.warn("Token verification failed", { error: error.message });
    res.status(401).json({ ok: false, error: "unauthorized" });
    return null;
  }
}

function isOwnerUid(decoded) {
  const ownerUid = sanitizeString(process.env.ADMIN_OWNER_UID || "", 128);
  if (!ownerUid) return false;
  return sanitizeString(decoded?.uid || "", 128) === ownerUid;
}

async function requireSingleOwnerAdmin(req, res) {
  try {
    const decoded = await decodeAuthToken(req);
    if (!decoded) {
      await writeSecurityAlert("admin_auth_missing_token", req, {}, null);
      res.status(403).json({ ok: false, error: "forbidden" });
      return null;
    }
    if (!hasAnyRole(decoded, ["admin"])) {
      await writeSecurityAlert("admin_auth_role_denied", req, {}, decoded);
      res.status(403).json({ ok: false, error: "forbidden" });
      return null;
    }
    if (!isOwnerUid(decoded)) {
      await writeSecurityAlert("admin_auth_owner_mismatch", req, {}, decoded);
      res.status(403).json({ ok: false, error: "forbidden" });
      return null;
    }
    return decoded;
  } catch (error) {
    logger.warn("Owner token verification failed", { error: error.message });
    await writeSecurityAlert("admin_auth_invalid_token", req, { error: error.message }, null);
    res.status(401).json({ ok: false, error: "unauthorized" });
    return null;
  }
}

function normalizeAdminAction(action = "") {
  const normalized = {
    listDestinations: "listDestinations",
    listArticles: "listArticles",
    listLeads: "listLeads",
    updateLeadStatus: "updateLeadStatus",
    addLeadNote: "addLeadNote",
    getDashboardSummary: "getDashboardSummary",
    getIntegrationHealth: "getIntegrationHealth",
    savePageDraft: "savePageDraft",
    getPageEditor: "getPageEditor",
    publishPage: "publishPage",
    rollbackPage: "rollbackPage",
    upsertDestination: "upsertDestination",
    deleteDestination: "deleteDestination",
    upsertArticle: "upsertArticle",
    deleteArticle: "deleteArticle",
    getMediaLibrary: "getMediaLibrary",
    saveMediaMeta: "saveMediaMeta",
    replaceMediaAsset: "replaceMediaAsset",
    getConversionDashboard: "getConversionDashboard",
    schedulePublish: "schedulePublish",
    runScheduledPublishes: "runScheduledPublishes",
    getAuditLogs: "getAuditLogs",
    setUserRole: "setUserRole",
    saveSettings: "saveSettings"
  };
  return normalized[String(action || "").trim()] || sanitizeString(action, 80);
}

function requiresRecentAdminAuth(action) {
  return new Set([
    "deleteDestination",
    "deleteArticle",
    "replaceMediaAsset",
    "rollbackPage",
    "publishPage",
    "setUserRole"
  ]).has(action);
}

function timestampToMillis(value) {
  if (!value) return 0;
  if (typeof value === "number") return value > 1e12 ? value : value * 1000;
  if (value instanceof Date) return value.getTime();
  if (typeof value?.toMillis === "function") return Number(value.toMillis()) || 0;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value === "object") {
    const sec = Number(value.seconds ?? value._seconds ?? 0);
    const nanos = Number(value.nanoseconds ?? value._nanoseconds ?? 0);
    if (sec > 0) return sec * 1000 + Math.floor(nanos / 1e6);
  }
  return 0;
}

function normalizeLeadAttribution(lead = {}) {
  const attribution = sanitizeObject(lead.attribution || {}) || {};
  const sourcePage = sanitizeString(lead.sourcePage || "", 200);
  const sourceLang = lead.sourceLang === "ar" ? "ar" : "en";
  const utmSource = sanitizeString(
    attribution.utm_source || attribution.source || attribution.channel || "",
    80
  ).toLowerCase();
  const utmCampaign = sanitizeString(
    attribution.utm_campaign || attribution.campaign || "",
    120
  ).toLowerCase();
  const utmMedium = sanitizeString(
    attribution.utm_medium || attribution.medium || "",
    80
  ).toLowerCase();
  const market = sanitizeString(
    attribution.market || attribution.country || attribution.geo || "",
    40
  ).toLowerCase();

  return {
    sourcePage,
    sourceLang,
    utmSource,
    utmMedium,
    utmCampaign,
    market: ["sa", "ae", "qa", "kw", "eg"].includes(market) ? market : ""
  };
}

function enrichLeadForAdmin(docSnap) {
  const data = docSnap.data() || {};
  const createdAtMs = timestampToMillis(data.createdAt);
  const ageMinutes = createdAtMs > 0 ? Math.floor((Date.now() - createdAtMs) / 60000) : null;
  const status = sanitizeString(data.crmStatus || data.status || "new", 20);
  const slaBreach = status === "new" && ageMinutes !== null && ageMinutes > 30;
  const attributionNormalized = normalizeLeadAttribution(data);

  return {
    id: docSnap.id,
    ...data,
    createdAtMs,
    leadAgeMinutes: ageMinutes,
    slaBreach,
    attributionNormalized
  };
}

function normalizeSegmentation(input = {}) {
  const intentAllowed = new Set(["family", "honeymoon", "women_only", "halal", "luxury"]);
  const tagAllowed = new Set(["family_friendly", "women_friendly", "halal_focus", "luxury_vehicle"]);
  const intent = sanitizeString(input.intent, 30);
  const rawTags = Array.isArray(input.tags) ? input.tags : [];
  const tags = [...new Set(rawTags.map((tag) => sanitizeString(tag, 40)).filter((tag) => tagAllowed.has(tag)))];
  return {
    intent: intentAllowed.has(intent) ? intent : "family",
    tags
  };
}

function normalizeFunnel(input = {}) {
  const currentStep = Math.max(1, Math.min(3, Number(input.currentStep || 1)));
  const maxStepReached = Math.max(currentStep, Math.min(3, Number(input.maxStepReached || currentStep)));
  const totalSteps = 3;
  const completionPercent = Math.max(0, Math.min(100, Math.round(Number(input.completionPercent || 0))));
  return { currentStep, maxStepReached, totalSteps, completionPercent };
}

function calculateLeadScoreServer(input = {}, segmentation = {}) {
  let score = 35;
  const pax = Number(input.passengers || 0);
  const vehicle = sanitizeString(input.vehicle, 40).toLowerCase();
  const duration = sanitizeString(input.duration, 80);
  const notes = sanitizeString(input.notes, 1500);
  if (pax >= 4) score += 10;
  if (vehicle.includes("minivan")) score += 10;
  if (duration.length > 0) score += 10;
  if (notes.trim().length >= 30) score += 10;
  if (segmentation.intent === "honeymoon" || segmentation.intent === "luxury") score += 10;
  if ((segmentation.tags || []).length >= 2) score += 5;
  return Math.max(0, Math.min(100, score));
}

function leadPriorityFromScore(score) {
  if (score >= 80) return "hot";
  if (score >= 60) return "warm";
  return "cold";
}

async function enforceRateLimit(key, maxHits, windowSeconds) {
  const docRef = admin.firestore().collection("rate_limits").doc(key);
  const now = Date.now();
  const resetAt = now + windowSeconds * 1000;

  return admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    const data = snap.exists ? snap.data() : null;

    if (!data || typeof data.resetAt !== "number" || now > data.resetAt) {
      tx.set(docRef, { count: 1, resetAt, updatedAt: now }, { merge: true });
      return { allowed: true, remaining: maxHits - 1, retryAfterSeconds: 0 };
    }

    const count = Number(data.count || 0);
    if (count >= maxHits) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((data.resetAt - now) / 1000))
      };
    }

    tx.set(docRef, { count: count + 1, updatedAt: now }, { merge: true });
    return { allowed: true, remaining: maxHits - (count + 1), retryAfterSeconds: 0 };
  });
}

function buildBookingPayload(input = {}, req) {
  const name = sanitizeString(input.name, 120);
  const phone = sanitizeString(input.phone, 40);
  const passengers = sanitizeString(input.passengers, 20);
  const vehicle = sanitizeString(input.vehicle, 40);
  const service = sanitizeString(input.service, 100);
  const dates = sanitizeString(input.dates, 160);
  const duration = sanitizeString(input.duration, 80);
  const price = sanitizeString(input.price, 60);
  const notes = sanitizeString(input.notes, 1500);
  const sourcePage = sanitizeString(input.sourcePage || req.path, 200);
  const sourceLang = input.sourceLang === "ar" ? "ar" : "en";
  const consent = input.consent === true;
  const source = sanitizeObject(input.attribution || {});
  const experiment = sanitizeObject(input.experiment || {});
  const segmentation = normalizeSegmentation(input.segmentation || {});
  const funnel = normalizeFunnel(input.funnel || {});
  const leadScoreClient = Math.max(0, Math.min(100, Number(input.leadScoreClient || 0)));
  const leadScoreServer = calculateLeadScoreServer(input, segmentation);
  const leadPriority = leadPriorityFromScore(leadScoreServer);
  const userAgent = sanitizeString(req.get("user-agent") || "", 300);

  if (!consent) return { valid: false, message: "Consent is required" };
  if (name.length < 2) return { valid: false, message: "Invalid name" };
  if (phone.length < 8 || phone.length > 25 || !/^\+?[0-9\s\-\(\)]+$/.test(phone)) return { valid: false, message: "Invalid phone" };
  if (service.length < 2) return { valid: false, message: "Invalid service" };

  return {
    valid: true,
    payload: {
      name,
      phone,
      passengers,
      vehicle,
      service,
      dates,
      duration,
      price,
      notes,
      sourcePage,
      sourceLang,
      attribution: source,
      experiment,
      segmentation,
      funnel,
      leadScoreClient,
      leadScoreServer,
      leadPriority,
      userAgent,
      ipHash: stableHash(clientIp(req)),
      status: "new",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }
  };
}

async function writeAuditLog(action, details, user = {}) {
  try {
    await admin.firestore().collection("admin_logs").add({
      action: sanitizeString(action, 80),
      details: sanitizeString(details, 300),
      userUid: sanitizeString(user.uid || "unknown", 128),
      userEmail: sanitizeString(user.email || "unknown", 200),
      role: roleFromToken(user),
      timestamp: Date.now()
    });
  } catch (error) {
    logger.warn("Failed to write audit log", { error: error.message });
  }
}

async function writeSecurityAlert(eventType, req, details = {}, user = null) {
  const event = sanitizeString(eventType, 100) || "admin_security_event";
  const ip = clientIp(req);
  const origin = sanitizeString(req.get("origin") || "", 300);
  const userAgent = sanitizeString(req.get("user-agent") || "", 300);
  const uid = sanitizeString(user?.uid || "unknown", 128);
  const email = sanitizeString(user?.email || "unknown", 200);
  const severity = sanitizeString(details.severity || "warn", 20);
  const safeDetails = sanitizeObject(details || {});

  try {
    await admin.firestore().collection("admin_security_alerts").add({
      event,
      severity,
      uid,
      email,
      ipHash: stableHash(ip),
      origin,
      method: sanitizeString(req.method || "", 20),
      path: sanitizeString(req.path || "", 200),
      userAgentHash: stableHash(userAgent),
      details: safeDetails,
      timestamp: Date.now()
    });
  } catch (error) {
    logger.warn("Failed to write security alert", { event, error: error.message });
  }

  const alertKey = stableHash(`security-alert:${event}:${stableHash(ip)}`);
  try {
    const throttle = await enforceRateLimit(alertKey, 1, 5 * 60);
    if (throttle.allowed) {
      await sendEmailAlert(
        `[Security] ${event}`,
        [
          `Event: ${event}`,
          `Severity: ${severity}`,
          `Path: ${sanitizeString(req.path || "", 200)}`,
          `Method: ${sanitizeString(req.method || "", 20)}`,
          `Origin: ${origin || "(none)"}`,
          `UID: ${uid}`,
          `Email: ${email}`,
          `IP Hash: ${stableHash(ip)}`,
          `Details: ${JSON.stringify(safeDetails || {})}`
        ].join("\n")
      );
    }
  } catch (error) {
    logger.warn("Failed to send security alert email", { event, error: error.message });
  }

  logger.warn("Admin security alert", { event, uid, origin, path: req.path, method: req.method, details: safeDetails });
}

async function verifyAdminAppCheck(req) {
  const required = parseBoolEnv(process.env.ADMIN_REQUIRE_APP_CHECK, true);
  if (!required) {
    return { ok: true, required: false, appId: null };
  }

  const appCheckToken = sanitizeString(req.get("x-firebase-appcheck") || "", 2000);
  if (!appCheckToken) {
    return { ok: false, required: true, reason: "missing_app_check" };
  }

  try {
    const decoded = await admin.appCheck().verifyToken(appCheckToken);
    return { ok: true, required: true, appId: sanitizeString(decoded?.app_id || "", 200) || null };
  } catch (error) {
    return { ok: false, required: true, reason: "invalid_app_check", error: sanitizeString(error.message, 300) };
  }
}

async function pushCrmWebhook(payload) {
  const webhookUrl = process.env.CRM_WEBHOOK_URL;
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    logger.warn("CRM webhook failed", { error: error.message });
  }
}

async function pushConversionEvent(eventName, bookingId, booking = {}) {
  const conversionApiUrl = process.env.CONVERSION_API_URL;
  if (!conversionApiUrl) return;
  const apiKey = process.env.CONVERSION_API_KEY || "";
  const eventPayload = {
    eventName: sanitizeString(eventName, 60),
    eventTime: Date.now(),
    bookingId: sanitizeString(bookingId, 128),
    sourcePage: sanitizeString(booking.sourcePage, 200),
    sourceLang: booking.sourceLang === "ar" ? "ar" : "en",
    leadScoreServer: Number(booking.leadScoreServer || 0),
    leadPriority: sanitizeString(booking.leadPriority, 20),
    segmentation: sanitizeObject(booking.segmentation || {}),
    experiment: sanitizeObject(booking.experiment || {}),
    ipHash: sanitizeString(booking.ipHash, 80),
    userAgentHash: stableHash(sanitizeString(booking.userAgent || "", 300))
  };

  try {
    const headers = { "Content-Type": "application/json" };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
    await fetch(conversionApiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(eventPayload)
    });
  } catch (error) {
    logger.warn("Conversion API call failed", { error: error.message });
  }
}

async function sendEmailAlert(subject, text) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_ALERT_EMAIL;
  const from = process.env.ALERT_FROM_EMAIL || "no-reply@georgiahills.com";
  if (!apiKey || !to) return;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ from, to: [to], subject, text })
    });
  } catch (error) {
    logger.warn("Email alert failed", { error: error.message });
  }
}

exports.createBookingLead = onRequest(
  { region: REGION, timeoutSeconds: 30, memory: "256MiB" },
  async (req, res) => {
    const originAllowed = applyCors(req, res, "POST, OPTIONS");

    if (req.method === "OPTIONS") {
      res.status(originAllowed ? 204 : 403).send("");
      return;
    }
    if (!originAllowed) {
      res.status(403).json({ ok: false, error: "origin_not_allowed" });
      return;
    }
    if (req.method !== "POST") {
      res.status(405).json({ ok: false, error: "method_not_allowed" });
      return;
    }

    const requireAppCheck = parseBoolEnv(process.env.REQUIRE_APP_CHECK, false);
    if (requireAppCheck) {
      const token = sanitizeString(req.get("x-firebase-appcheck") || "", 2000);
      if (!token) {
        res.status(401).json({ ok: false, error: "missing_app_check" });
        return;
      }
      try {
        await admin.appCheck().verifyToken(token);
      } catch (error) {
        res.status(401).json({ ok: false, error: "invalid_app_check" });
        return;
      }
    }

    const body = req.body || {};
    if (sanitizeString(body.companyWebsite || "", 300)) {
      res.status(202).json({ ok: true, trapped: true });
      return;
    }

    const limitKey = stableHash(`lead:${clientIp(req)}:${sanitizeString(req.get("user-agent"), 120)}`);
    const limit = await enforceRateLimit(limitKey, 5, 10 * 60);
    if (!limit.allowed) {
      res.status(429).json({
        ok: false,
        error: "rate_limited",
        retryAfterSeconds: limit.retryAfterSeconds
      });
      return;
    }

    const parsed = buildBookingPayload(body, req);
    if (!parsed.valid) {
      res.status(400).json({ ok: false, error: "invalid_payload", message: parsed.message });
      return;
    }

    try {
      const bookingRef = await admin.firestore().collection("bookings").add(parsed.payload);
      res.status(201).json({ ok: true, id: bookingRef.id });
    } catch (error) {
      logger.error("Failed to create booking lead", { error: error.message });
      res.status(500).json({ ok: false, error: "server_error" });
    }
  }
);

exports.adminApi = onRequest(
  { region: REGION, timeoutSeconds: 60, memory: "512MiB" },
  async (req, res) => {
    const originAllowed = applyCors(req, res, "POST, OPTIONS");

    if (req.method === "OPTIONS") {
      res.status(originAllowed ? 204 : 403).send("");
      return;
    }
    if (!originAllowed) {
      await writeSecurityAlert("admin_origin_cors_blocked", req, { severity: "high" }, null);
      res.status(403).json({ ok: false, error: "origin_not_allowed" });
      return;
    }
    const originCheck = validateAdminOrigin(req);
    if (!originCheck.allowed) {
      await writeSecurityAlert(
        originCheck.reason === "missing_origin" ? "admin_missing_origin" : "admin_origin_not_allowed",
        req,
        { severity: "high", reason: originCheck.reason, origin: originCheck.origin },
        null
      );
      res.status(403).json({ ok: false, error: "origin_not_allowed" });
      return;
    }
    if (req.method !== "POST") {
      await writeSecurityAlert("admin_method_not_allowed", req, { severity: "warn" }, null);
      res.status(405).json({ ok: false, error: "method_not_allowed" });
      return;
    }

    const appCheck = await verifyAdminAppCheck(req);
    if (!appCheck.ok) {
      await writeSecurityAlert(
        appCheck.reason || "admin_app_check_failed",
        req,
        { severity: "high", appCheckRequired: appCheck.required, error: appCheck.error || "" },
        null
      );
      res.status(401).json({ ok: false, error: "app_check_failed" });
      return;
    }

    const user = await requireSingleOwnerAdmin(req, res);
    if (!user) return;

    const limitKey = stableHash(`adminapi:${sanitizeString(user.uid, 128)}:${clientIp(req)}`);
    const limit = await enforceRateLimit(limitKey, 200, 5 * 60);
    if (!limit.allowed) {
      await writeSecurityAlert("admin_rate_limited", req, { severity: "high", retryAfterSeconds: limit.retryAfterSeconds }, user);
      res.status(429).json({
        ok: false,
        error: "rate_limited",
        retryAfterSeconds: limit.retryAfterSeconds
      });
      return;
    }

    const action = normalizeAdminAction(req.body?.action);
    const payload = sanitizeObject(req.body?.payload || {});

    if (requiresRecentAdminAuth(action)) {
      const authTimeMs = Number(user.auth_time || 0) * 1000;
      const ageMs = Date.now() - authTimeMs;
      if (!authTimeMs || ageMs > 15 * 60 * 1000) {
        await writeSecurityAlert("admin_reauth_required", req, { severity: "warn", action }, user);
        res.status(401).json({ ok: false, error: "reauth_required" });
        return;
      }
    }

    try {
      switch (action) {
        case "getDashboardSummary": {
          const days = 30;
          const refs = [];
          for (let i = 0; i < days; i++) {
            const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
            refs.push(admin.firestore().collection("analytics_booking_daily").doc(d));
          }
          const [snaps, queueSnap, pagesSnap] = await Promise.all([
            admin.firestore().getAll(...refs),
            admin.firestore().collection("cms_publish_queue").where("status", "==", "scheduled").limit(50).get(),
            admin.firestore().collection("cms_pages").limit(200).get()
          ]);

          const totals = { bookings: 0, en: 0, ar: 0 };
          snaps.forEach((snap) => {
            if (!snap.exists) return;
            const data = snap.data() || {};
            totals.bookings += Number(data.total || 0);
            totals.en += Number(data.byLang?.en || 0);
            totals.ar += Number(data.byLang?.ar || 0);
          });

          let draftCount = 0;
          let publishedCount = 0;
          pagesSnap.docs.forEach((d) => {
            const status = sanitizeString(d.data()?.status || "", 20);
            if (status === "published") publishedCount += 1;
            else draftCount += 1;
          });

          res.json({
            ok: true,
            data: {
              totals,
              publishing: {
                scheduledQueue: queueSnap.size,
                draftCount,
                publishedCount
              },
              integrations: {
                googleAds: { configured: Boolean(process.env.GOOGLE_ADS_ID), healthy: true },
                hotjar: { configured: Boolean(process.env.HOTJAR_ID), healthy: true },
                tidio: { configured: Boolean(process.env.TIDIO_KEY), healthy: true },
                newsletter: { configured: Boolean(process.env.NEWSLETTER_ENDPOINT), healthy: true },
                stripe: { configured: Boolean(process.env.STRIPE_PAYMENT_LINK), healthy: true },
                calendar: { configured: Boolean(process.env.BOOKING_CALENDAR_LINK), healthy: true }
              }
            }
          });
          return;
        }

        case "listDestinations": {
          const snap = await admin.firestore().collection("destinations").orderBy("id", "asc").limit(500).get();
          res.json({ ok: true, data: { destinations: snap.docs.map((d) => ({ id: d.id, ...d.data() })) } });
          return;
        }

        case "listArticles": {
          const snap = await admin.firestore().collection("articles").orderBy("date", "desc").limit(500).get();
          res.json({ ok: true, data: { articles: snap.docs.map((d) => ({ id: d.id, ...d.data() })) } });
          return;
        }

        case "listLeads": {
          const limit = Math.min(300, Math.max(1, Number(payload.limit || 100)));
          const snap = await admin.firestore().collection("bookings").orderBy("createdAt", "desc").limit(limit).get();
          const leads = snap.docs.map((d) => enrichLeadForAdmin(d));
          const summary = {
            total: leads.length,
            newCount: leads.filter((l) => sanitizeString(l.crmStatus || l.status || "new", 20) === "new").length,
            slaBreachCount: leads.filter((l) => l.slaBreach === true).length
          };
          res.json({ ok: true, data: { leads, summary } });
          return;
        }

        case "updateLeadStatus": {
          const bookingId = sanitizeString(payload.bookingId, 128);
          const status = sanitizeString(payload.status, 20);
          if (!bookingId || !["new", "contacted", "quoted", "won", "lost"].includes(status)) {
            res.status(400).json({ ok: false, error: "invalid_lead_status_payload" });
            return;
          }
          await admin.firestore().collection("bookings").doc(bookingId).set({
            crmStatus: status,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: sanitizeString(user.email || user.uid, 200)
          }, { merge: true });
          await writeAuditLog("update_lead_status", `Lead ${bookingId} set to ${status}`, user);
          res.json({ ok: true, data: { bookingId, status } });
          return;
        }

        case "addLeadNote": {
          const bookingId = sanitizeString(payload.bookingId, 128);
          const note = sanitizeString(payload.note, 1500);
          if (!bookingId || !note) {
            res.status(400).json({ ok: false, error: "invalid_lead_note_payload" });
            return;
          }
          const noteEntry = {
            note,
            by: sanitizeString(user.email || user.uid, 200),
            at: Date.now()
          };
          await admin.firestore().collection("bookings").doc(bookingId).set({
            crmNotes: admin.firestore.FieldValue.arrayUnion(noteEntry),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: sanitizeString(user.email || user.uid, 200)
          }, { merge: true });
          await writeAuditLog("add_lead_note", `Lead ${bookingId} note added`, user);
          res.json({ ok: true, data: { bookingId } });
          return;
        }

        case "getIntegrationHealth": {
          const integrations = {
            googleAds: { configured: Boolean(process.env.GOOGLE_ADS_ID), healthy: true, lastEventAt: null },
            hotjar: { configured: Boolean(process.env.HOTJAR_ID), healthy: true, lastEventAt: null },
            tidio: { configured: Boolean(process.env.TIDIO_KEY), healthy: true, lastEventAt: null },
            newsletter: { configured: Boolean(process.env.NEWSLETTER_ENDPOINT), healthy: true, lastEventAt: null },
            stripe: { configured: Boolean(process.env.STRIPE_PAYMENT_LINK), healthy: true, lastEventAt: null },
            calendar: { configured: Boolean(process.env.BOOKING_CALENDAR_LINK), healthy: true, lastEventAt: null }
          };

          const marketPages = {
            sa: { keywordCoverage: true, schemaCoverage: true },
            ae: { keywordCoverage: true, schemaCoverage: true },
            qa: { keywordCoverage: true, schemaCoverage: true },
            kw: { keywordCoverage: true, schemaCoverage: true },
            eg: { keywordCoverage: true, schemaCoverage: true }
          };

          res.json({ ok: true, data: { integrations, seo: { marketPages } } });
          return;
        }

        case "upsertDestination": {
          const id = sanitizeString(payload.id, 120) || admin.firestore().collection("destinations").doc().id;
          if (id && (id.includes('/') || id.includes('..'))) {
            res.status(400).json({ ok: false, error: "invalid_id_format" });
            return;
          }
          const data = sanitizeObject(payload.data || {});
          await admin.firestore().collection("destinations").doc(id).set({ ...data, id }, { merge: true });
          const mediaUrls = extractLikelyMediaUrls(data);
          await Promise.all(mediaUrls.map((u) => upsertMediaUsage(u, `destinations/${id}`)));
          await writeAuditLog("upsert_destination", `Destination ${id} saved`, user);
          res.json({ ok: true, id });
          return;
        }

        case "deleteDestination": {
          if (!hasAnyRole(user, ["admin"])) {
            res.status(403).json({ ok: false, error: "forbidden" });
            return;
          }
          const id = sanitizeString(payload.id, 120);
          if (id && (id.includes('/') || id.includes('..'))) {
            res.status(400).json({ ok: false, error: "invalid_id_format" });
            return;
          }
          await admin.firestore().collection("destinations").doc(id).delete();
          await writeAuditLog("delete_destination", `Destination ${id} deleted`, user);
          res.json({ ok: true });
          return;
        }

        case "upsertArticle": {
          const id = sanitizeString(payload.id, 120) || admin.firestore().collection("articles").doc().id;
          const data = sanitizeObject(payload.data || {});
          await admin.firestore().collection("articles").doc(id).set({ ...data, id }, { merge: true });
          const mediaUrls = extractLikelyMediaUrls(data);
          await Promise.all(mediaUrls.map((u) => upsertMediaUsage(u, `articles/${id}`)));
          await writeAuditLog("upsert_article", `Article ${id} saved`, user);
          res.json({ ok: true, id });
          return;
        }

        case "deleteArticle": {
          if (!hasAnyRole(user, ["admin"])) {
            res.status(403).json({ ok: false, error: "forbidden" });
            return;
          }
          const id = sanitizeString(payload.id, 120);
          await admin.firestore().collection("articles").doc(id).delete();
          await writeAuditLog("delete_article", `Article ${id} deleted`, user);
          res.json({ ok: true });
          return;
        }

        case "saveSettings": {
          if (!hasAnyRole(user, ["admin"])) {
            res.status(403).json({ ok: false, error: "forbidden" });
            return;
          }
          const type = sanitizeString(payload.type, 80);
          const data = sanitizeObject(payload.data || {});
          await admin.firestore().collection("settings").doc(type).set(data, { merge: true });
          await writeAuditLog("save_settings", `Settings ${type} updated`, user);
          res.json({ ok: true });
          return;
        }

        case "savePageDraft": {
          const pageId = sanitizeString(payload.pageId, 80);
          const data = sanitizeObject(payload.data || {});
          const pageRef = admin.firestore().collection("cms_pages").doc(pageId);
          const revisionRef = pageRef.collection("revisions").doc();

          await admin.firestore().runTransaction(async (tx) => {
            tx.set(pageRef, {
              pageId,
              draft: data,
              status: "draft",
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedBy: sanitizeString(user.email || user.uid, 200)
            }, { merge: true });
            tx.set(revisionRef, {
              type: "draft",
              data,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              createdBy: sanitizeString(user.email || user.uid, 200)
            });
          });
          const mediaUrls = extractLikelyMediaUrls(data);
          await Promise.all(mediaUrls.map((u) => upsertMediaUsage(u, `cms_pages/${pageId}:draft`)));

          await writeAuditLog("save_page_draft", `Page ${pageId} draft saved`, user);
          res.json({ ok: true, revisionId: revisionRef.id });
          return;
        }

        case "publishPage": {
          const pageId = sanitizeString(payload.pageId, 80);
          const note = sanitizeString(payload.note || "", 600);
          const changeSummary = sanitizeString(payload.changeSummary || "", 1000);
          const pageRef = admin.firestore().collection("cms_pages").doc(pageId);
          const revisionRef = pageRef.collection("revisions").doc();
          const settingsRef = admin.firestore().collection("settings").doc(`page_${pageId}`);

          const pageSnap = await pageRef.get();
          const draft = sanitizeObject(pageSnap.data()?.draft || {});
          if (!draft || Object.keys(draft).length === 0) {
            res.status(400).json({ ok: false, error: "no_draft_found" });
            return;
          }

          await admin.firestore().runTransaction(async (tx) => {
            tx.set(settingsRef, draft, { merge: true });
            tx.set(pageRef, {
              pageId,
              published: draft,
              status: "published",
              publishedAt: admin.firestore.FieldValue.serverTimestamp(),
              publishedBy: sanitizeString(user.email || user.uid, 200),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedBy: sanitizeString(user.email || user.uid, 200),
              lastPublishNote: note,
              lastChangeSummary: changeSummary
            }, { merge: true });
            tx.set(revisionRef, {
              type: "publish",
              data: draft,
              note,
              changeSummary,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              createdBy: sanitizeString(user.email || user.uid, 200)
            });
          });
          const mediaUrls = extractLikelyMediaUrls(draft);
          await Promise.all(mediaUrls.map((u) => upsertMediaUsage(u, `settings/page_${pageId}`)));

          await writeAuditLog("publish_page", `Page ${pageId} published`, user);
          res.json({ ok: true, revisionId: revisionRef.id });
          return;
        }

        case "getPageEditor": {
          const pageId = sanitizeString(payload.pageId, 80);
          const pageRef = admin.firestore().collection("cms_pages").doc(pageId);
          const settingsRef = admin.firestore().collection("settings").doc(`page_${pageId}`);

          const [pageSnap, settingsSnap, revSnap] = await Promise.all([
            pageRef.get(),
            settingsRef.get(),
            pageRef.collection("revisions").orderBy("createdAt", "desc").limit(20).get()
          ]);

          const pageData = pageSnap.exists ? pageSnap.data() : {};
          const published = sanitizeObject(pageData?.published || settingsSnap.data() || {});
          const draft = sanitizeObject(pageData?.draft || published || {});
          const revisions = revSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

          res.json({
            ok: true,
            pageId,
            draft,
            published,
            status: sanitizeString(pageData?.status || "draft", 30),
            updatedAt: pageData?.updatedAt || null,
            publishedAt: pageData?.publishedAt || null,
            lastPublishNote: sanitizeString(pageData?.lastPublishNote || "", 600),
            lastChangeSummary: sanitizeString(pageData?.lastChangeSummary || "", 1000),
            revisions
          });
          return;
        }

        case "rollbackPage": {
          if (!hasAnyRole(user, ["admin"])) {
            res.status(403).json({ ok: false, error: "forbidden" });
            return;
          }
          const pageId = sanitizeString(payload.pageId, 80);
          const revisionId = sanitizeString(payload.revisionId, 120);
          const publishNow = payload.publishNow === true;

          const pageRef = admin.firestore().collection("cms_pages").doc(pageId);
          const revRef = pageRef.collection("revisions").doc(revisionId);
          const newRevisionRef = pageRef.collection("revisions").doc();
          const settingsRef = admin.firestore().collection("settings").doc(`page_${pageId}`);

          const revSnap = await revRef.get();
          if (!revSnap.exists) {
            res.status(404).json({ ok: false, error: "revision_not_found" });
            return;
          }
          const revisionData = sanitizeObject(revSnap.data()?.data || {});

          await admin.firestore().runTransaction(async (tx) => {
            tx.set(pageRef, {
              draft: revisionData,
              status: publishNow ? "published" : "draft",
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedBy: sanitizeString(user.email || user.uid, 200)
            }, { merge: true });

            if (publishNow) {
              tx.set(settingsRef, revisionData, { merge: true });
              tx.set(pageRef, {
                published: revisionData,
                publishedAt: admin.firestore.FieldValue.serverTimestamp(),
                publishedBy: sanitizeString(user.email || user.uid, 200)
              }, { merge: true });
            }

            tx.set(newRevisionRef, {
              type: "rollback",
              sourceRevisionId: revisionId,
              data: revisionData,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              createdBy: sanitizeString(user.email || user.uid, 200)
            });
          });

          await writeAuditLog("rollback_page", `Page ${pageId} rolled back to ${revisionId}`, user);
          res.json({ ok: true, revisionId: newRevisionRef.id });
          return;
        }

        case "getAuditLogs": {
          const limit = Math.min(50, Math.max(1, Number(payload.limit || 10)));
          const snap = await admin.firestore().collection("admin_logs").orderBy("timestamp", "desc").limit(limit).get();
          res.json({ ok: true, logs: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
          return;
        }

        case "getConversionDashboard": {
          const days = Math.min(90, Math.max(1, Number(payload.days || 30)));
          const refs = [];
          for (let i = 0; i < days; i++) {
            const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
            refs.push(admin.firestore().collection("analytics_booking_daily").doc(d));
          }
          const snaps = await admin.firestore().getAll(...refs);

          const totals = { bookings: 0, en: 0, ar: 0 };
          const variants = {};
          snaps.forEach((snap) => {
            if (!snap.exists) return;
            const data = snap.data() || {};
            totals.bookings += Number(data.total || 0);
            totals.en += Number(data.byLang?.en || 0);
            totals.ar += Number(data.byLang?.ar || 0);

            const byVariant = data.byVariant || {};
            Object.keys(byVariant).forEach((k) => {
              variants[k] = (variants[k] || 0) + Number(byVariant[k] || 0);
            });
          });

          res.json({ ok: true, days, totals, variants });
          return;
        }

        case "schedulePublish": {
          const pageId = sanitizeString(payload.pageId, 80);
          const scheduledAt = sanitizeString(payload.scheduledAt, 40);
          const note = sanitizeString(payload.note || "", 600);
          const changeSummary = sanitizeString(payload.changeSummary || "", 1000);
          const scheduledDate = new Date(scheduledAt);
          if (!pageId || Number.isNaN(scheduledDate.getTime())) {
            res.status(400).json({ ok: false, error: "invalid_schedule_payload" });
            return;
          }
          if (scheduledDate.getTime() < Date.now() + 60 * 1000) {
            res.status(400).json({ ok: false, error: "scheduled_time_must_be_in_future" });
            return;
          }

          const scheduleRef = admin.firestore().collection("cms_publish_queue").doc();
          await scheduleRef.set({
            pageId,
            scheduledAt,
            scheduledAtMs: scheduledDate.getTime(),
            note,
            changeSummary,
            status: "scheduled",
            scheduledBy: sanitizeString(user.email || user.uid, 200),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          await writeAuditLog("schedule_publish", `Page ${pageId} scheduled for ${scheduledAt}`, user);
          res.json({ ok: true, id: scheduleRef.id });
          return;
        }

        case "runScheduledPublishes": {
          if (!hasAnyRole(user, ["admin"])) {
            res.status(403).json({ ok: false, error: "forbidden" });
            return;
          }
          const result = await processScheduledPublishes();
          res.json({ ok: true, ...result });
          return;
        }

        case "getMediaLibrary": {
          const queryText = sanitizeString(payload.query || "", 120).toLowerCase();
          const tag = sanitizeString(payload.tag || "", 60).toLowerCase();
          const [metaSnap] = await Promise.all([
            admin.firestore().collection("media_assets").orderBy("lastUsedAt", "desc").limit(400).get()
          ]);
          const metaByUrl = new Map();
          metaSnap.docs.forEach((d) => {
            const data = d.data() || {};
            if (data.url) metaByUrl.set(String(data.url), { id: d.id, ...data });
          });

          const [files] = await admin.storage().bucket().getFiles({ prefix: "uploads/" });
          const assets = files
            .filter((f) => !f.name.endsWith("/") && !f.name.includes("/optimized/"))
            .slice(0, 300)
            .map((f) => {
              const encoded = f.name.split("/").map(encodeURIComponent).join("/");
              const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${f.bucket.name}/o/${encoded}?alt=media`;
              const meta = metaByUrl.get(publicUrl) || {};
              return {
                path: f.name,
                url: publicUrl,
                size: Number(f.metadata?.size || 0),
                contentType: f.metadata?.contentType || "",
                updated: f.metadata?.updated || "",
                tags: Array.isArray(meta.tags) ? meta.tags : [],
                alt: sanitizeString(meta.alt || "", 240),
                usages: Array.isArray(meta.usages) ? meta.usages : [],
                optimizedVariants: Array.isArray(meta.optimizedVariants) ? meta.optimizedVariants : []
              };
            })
            .filter((a) => {
              if (queryText && !a.path.toLowerCase().includes(queryText) && !a.url.toLowerCase().includes(queryText)) return false;
              if (tag && !a.tags.map((t) => String(t).toLowerCase()).includes(tag)) return false;
              return true;
            });

          res.json({ ok: true, assets });
          return;
        }

        case "saveMediaMeta": {
          const url = sanitizeString(payload.url, 2000);
          const tags = Array.isArray(payload.tags) ? payload.tags.map((t) => sanitizeString(t, 40)).filter(Boolean).slice(0, 20) : [];
          const alt = sanitizeString(payload.alt || "", 240);
          if (!url) {
            res.status(400).json({ ok: false, error: "invalid_media_meta_payload" });
            return;
          }
          const mediaId = stableHash(url);
          await admin.firestore().collection("media_assets").doc(mediaId).set({
            url,
            tags,
            alt,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: sanitizeString(user.email || user.uid, 200)
          }, { merge: true });
          await writeAuditLog("save_media_meta", `Updated media meta for ${url}`, user);
          res.json({ ok: true, id: mediaId });
          return;
        }

        case "replaceMediaAsset": {
          if (!hasAnyRole(user, ["admin"])) {
            res.status(403).json({ ok: false, error: "forbidden" });
            return;
          }
          const oldUrl = sanitizeString(payload.oldUrl, 2000);
          const newUrl = sanitizeString(payload.newUrl, 2000);
          if (!oldUrl || !newUrl) {
            res.status(400).json({ ok: false, error: "invalid_replace_payload" });
            return;
          }

          let updatedDocs = 0;
          const collectionsToScan = ["settings", "destinations", "articles", "cms_pages"];
          for (const col of collectionsToScan) {
            const snap = await admin.firestore().collection(col).get();
            for (const docSnap of snap.docs) {
              const raw = docSnap.data() || {};
              const asText = JSON.stringify(raw);
              if (!asText.includes(oldUrl)) continue;
              const replaced = JSON.parse(asText.split(oldUrl).join(newUrl));
              await docSnap.ref.set(replaced, { merge: true });
              updatedDocs += 1;
            }
          }

          await writeAuditLog("replace_media_asset", `Replaced ${oldUrl} with ${newUrl} in ${updatedDocs} docs`, user);
          res.json({ ok: true, updatedDocs });
          return;
        }

        case "setUserRole": {
          if (!hasAnyRole(user, ["admin"])) {
            res.status(403).json({ ok: false, error: "forbidden" });
            return;
          }
          const uid = sanitizeString(payload.uid, 128);
          const role = sanitizeString(payload.role, 20);
          if (!uid || !["admin", "editor", "viewer"].includes(role)) {
            res.status(400).json({ ok: false, error: "invalid_role_payload" });
            return;
          }

          await admin.auth().setCustomUserClaims(uid, {
            role,
            admin: role === "admin"
          });
          await writeAuditLog("set_user_role", `Role ${role} assigned to ${uid}`, user);
          res.json({ ok: true });
          return;
        }

        default:
          res.status(400).json({ ok: false, error: "unknown_action" });
      }
    } catch (error) {
      logger.error("adminApi failed", { action, error: error.message });
      res.status(500).json({ ok: false, error: "server_error", message: "An internal server error occurred" });
    }
  }
);

exports.notifyNewBooking = onDocumentCreated(
  { document: "bookings/{bookingId}", region: REGION, timeoutSeconds: 60, memory: "256MiB" },
  async (event) => {
    const bookingId = event.params.bookingId;
    const snapshot = event.data;
    if (!snapshot) return;

    const booking = snapshot.data() || {};
    const dateKey = nowIsoDate();
    const lang = booking.sourceLang === "ar" ? "ar" : "en";
    const variant = sanitizeString(booking.experiment?.bookingFormVariant || "control", 40);

    try {
      await admin.firestore().collection("analytics_booking_daily").doc(dateKey).set({
        date: dateKey,
        total: admin.firestore.FieldValue.increment(1),
        [`byLang.${lang}`]: admin.firestore.FieldValue.increment(1),
        [`byVariant.${variant}`]: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (error) {
      logger.warn("Failed to update booking analytics", { error: error.message });
    }

    const text = [
      `New booking lead (${bookingId})`,
      `Name: ${booking.name || "-"}`,
      `Phone: ${booking.phone || "-"}`,
      `Vehicle: ${booking.vehicle || "-"}`,
      `Dates: ${booking.dates || "-"}`,
      `Source: ${booking.sourcePage || "-"}`
    ].join("\n");

    await Promise.all([
      pushCrmWebhook({ type: "new_booking", bookingId, booking }),
      pushConversionEvent("booking_lead_created", bookingId, booking),
      sendEmailAlert(`New booking lead: ${booking.name || bookingId}`, text)
    ]);

    logger.info("New booking created", { bookingId, lang, variant });
  }
);

exports.runScheduledPublishes = onRequest(
  { region: REGION, timeoutSeconds: 120, memory: "256MiB" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ ok: false, error: "method_not_allowed" });
      return;
    }

    const configuredKey = process.env.SCHEDULER_SECRET || "";
    const providedKey = sanitizeString(req.get("x-scheduler-secret") || "", 200);
    if (!configuredKey || providedKey !== configuredKey) {
      res.status(403).json({ ok: false, error: "forbidden" });
      return;
    }

    try {
      const result = await processScheduledPublishes();
      res.json({ ok: true, ...result });
    } catch (error) {
      logger.error("runScheduledPublishes failed", { error: error.message });
      res.status(500).json({ ok: false, error: "server_error" });
    }
  }
);

exports.optimizeUploadedImage = onObjectFinalized(
  { region: REGION, timeoutSeconds: 120, memory: "1GiB" },
  async (event) => {
    const object = event.data || {};
    const filePath = object.name || "";
    const contentType = object.contentType || "";

    if (!filePath.startsWith("uploads/")) return;
    if (filePath.includes("/optimized/")) return;
    if (!contentType.startsWith("image/")) return;
    if (!/\.(jpe?g|png|webp|avif)$/i.test(filePath)) return;

    const bucket = admin.storage().bucket(object.bucket);
    const file = bucket.file(filePath);
    const tempInput = path.join(os.tmpdir(), path.basename(filePath));
    await file.download({ destination: tempInput });

    const baseName = path.basename(filePath, path.extname(filePath));
    const parentDir = path.dirname(filePath);
    const optimizeConfigs = [
      { format: "webp", width: 1280, quality: 75 },
      { format: "avif", width: 1280, quality: 55 },
      { format: "webp", width: 640, quality: 70 }
    ];

    const variants = [];
    try {
      const meta = await sharp(tempInput).metadata();
      for (const cfg of optimizeConfigs) {
        const outName = `${baseName}_${cfg.width}.${cfg.format}`;
        const outPath = path.join(os.tmpdir(), outName);
        const storageOutPath = `${parentDir}/optimized/${outName}`;
        const transformer = sharp(tempInput).resize({ width: cfg.width, withoutEnlargement: true });

        if (cfg.format === "webp") transformer.webp({ quality: cfg.quality });
        if (cfg.format === "avif") transformer.avif({ quality: cfg.quality });

        await transformer.toFile(outPath);
        await bucket.upload(outPath, {
          destination: storageOutPath,
          metadata: {
            contentType: `image/${cfg.format}`,
            cacheControl: "public,max-age=31536000,immutable"
          }
        });
        const encoded = storageOutPath.split("/").map(encodeURIComponent).join("/");
        variants.push({
          format: cfg.format,
          width: cfg.width,
          url: `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encoded}?alt=media`
        });
        await fs.unlink(outPath).catch(() => {});
      }

      const encodedOriginal = filePath.split("/").map(encodeURIComponent).join("/");
      const originalUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedOriginal}?alt=media`;
      const mediaId = stableHash(originalUrl);
      await admin.firestore().collection("media_assets").doc(mediaId).set({
        url: originalUrl,
        optimizedVariants: variants,
        width: Number(meta.width || 0),
        height: Number(meta.height || 0),
        size: Number(object.size || 0),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } finally {
      await fs.unlink(tempInput).catch(() => {});
    }
  }
);

exports.__test = {
  sanitizeString,
  sanitizeObject,
  flattenStrings,
  extractLikelyMediaUrls,
  roleFromToken,
  hasAnyRole,
  stableHash,
  buildBookingPayload
};

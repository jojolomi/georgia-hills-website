const crypto = require("crypto");

function nowIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function sanitizeString(value = "", max = 200) {
  return String(value || "").trim().slice(0, max);
}

function sanitizeObject(input, maxDepth = 5, depth = 0) {
  if (depth > maxDepth) return null;
  if (input === null || input === undefined) return null;
  if (typeof input === "string") return sanitizeString(input, 5000);
  if (typeof input === "number" || typeof input === "boolean") return input;
  if (Array.isArray(input)) {
    return input.slice(0, 200).map((item) => sanitizeObject(item, maxDepth, depth + 1));
  }
  if (typeof input === "object") {
    const out = {};
    for (const [key, value] of Object.entries(input)) {
      if (!/^[a-zA-Z0-9_.-]{1,80}$/.test(key)) continue;
      out[key] = sanitizeObject(value, maxDepth, depth + 1);
    }
    return out;
  }
  return null;
}

function flattenStrings(input, out = []) {
  if (typeof input === "string") {
    out.push(input);
    return out;
  }
  if (Array.isArray(input)) {
    input.forEach((v) => flattenStrings(v, out));
    return out;
  }
  if (input && typeof input === "object") {
    Object.values(input).forEach((v) => flattenStrings(v, out));
  }
  return out;
}

function extractLikelyMediaUrls(input) {
  const all = flattenStrings(input, []);
  const found = new Set();
  const regex = /(https?:\/\/[^\s"'<>]+\.(?:webp|png|jpe?g|gif|svg|avif)(?:\?[^\s"'<>]*)?)/gi;
  all.forEach((str) => {
    let m;
    while ((m = regex.exec(str)) !== null) found.add(m[1]);
  });
  return Array.from(found);
}

function roleFromToken(decoded) {
  if (!decoded) return "viewer";
  if (decoded.admin === true || decoded.role === "admin") return "admin";
  if (decoded.role === "editor") return "editor";
  return "viewer";
}

function hasAnyRole(decoded, roles = []) {
  const role = roleFromToken(decoded);
  return roles.includes(role);
}

function clientIp(req) {
  const forwarded = req.get("x-forwarded-for");
  if (forwarded) {
    return sanitizeString(forwarded.split(",")[0], 80);
  }
  return sanitizeString(req.ip || "unknown", 80);
}

function stableHash(input) {
  return crypto.createHash("sha256").update(String(input)).digest("hex").slice(0, 40);
}

function buildBookingPayload(input = {}, req, options = {}) {
  const timestampFactory = options.timestampFactory || (() => Date.now());
  const ipHashFn = options.ipHashFn || stableHash;

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
  const userAgent = sanitizeString(req.get("user-agent") || "", 300);

  if (!consent) return { valid: false, message: "Consent is required" };
  if (name.length < 2) return { valid: false, message: "Invalid name" };
  if (phone.length < 4) return { valid: false, message: "Invalid phone" };
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
      userAgent,
      ipHash: ipHashFn(clientIp(req)),
      status: "new",
      createdAt: timestampFactory()
    }
  };
}

module.exports = {
  nowIsoDate,
  sanitizeString,
  sanitizeObject,
  flattenStrings,
  extractLikelyMediaUrls,
  roleFromToken,
  hasAnyRole,
  clientIp,
  stableHash,
  buildBookingPayload
};

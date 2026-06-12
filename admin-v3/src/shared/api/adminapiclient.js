import { getIdToken } from "firebase/auth";
import { auth, firebaseConfig, getAppCheckTokenOrEmpty } from "./firebase";
import { AdminActionRequestSchema, AdminActionResponseSchema } from "../types/contracts";

const endpoint = firebaseConfig.adminApiEndpoint || `https://${firebaseConfig.functionsRegion || "europe-west1"}-${firebaseConfig.projectId}.cloudfunctions.net/adminApi`;

export async function callAdminApi(action, payload = {}) {
  const parsed = AdminActionRequestSchema.parse({ action, payload });
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await getIdToken(user, true);
  const appCheckToken = await getAppCheckTokenOrEmpty();
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };
  if (appCheckToken) {
    headers["X-Firebase-AppCheck"] = appCheckToken;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(parsed)
  });

  const json = await response.json();
  const safe = AdminActionResponseSchema.safeParse(json);
  const body = safe.success ? safe.data : json;
  if (!response.ok || !body.ok) {
    throw new Error(body.error || body.message || "Admin API request failed");
  }
  return body;
}

export const AdminApi = {
  getDashboardSummary: () => callAdminApi("getDashboardSummary"),
  getPageEditor: (pageId) => callAdminApi("getPageEditor", { pageId }),
  savePageDraft: (pageId, data) => callAdminApi("savePageDraft", { pageId, data }),
  publishPage: (pageId, note = "", changeSummary = "") => callAdminApi("publishPage", { pageId, note, changeSummary }),
  rollbackPage: (pageId, revisionId) => callAdminApi("rollbackPage", { pageId, revisionId, publishNow: true }),
  listDestinations: () => callAdminApi("listDestinations"),
  upsertDestination: (id, data) => callAdminApi("upsertDestination", { id, data }),
  deleteDestination: (id) => callAdminApi("deleteDestination", { id }),
  listArticles: () => callAdminApi("listArticles"),
  upsertArticle: (id, data) => callAdminApi("upsertArticle", { id, data }),
  deleteArticle: (id) => callAdminApi("deleteArticle", { id }),
  getMediaLibrary: (query = "", tag = "") => callAdminApi("getMediaLibrary", { query, tag }),
  saveMediaMeta: (url, tags, alt) => callAdminApi("saveMediaMeta", { url, tags, alt }),
  replaceMediaAsset: (oldUrl, newUrl) => callAdminApi("replaceMediaAsset", { oldUrl, newUrl }),
  getConversionDashboard: (days = 30) => callAdminApi("getConversionDashboard", { days }),
  listLeads: (limit = 100) => callAdminApi("listLeads", { limit }),
  updateLeadStatus: (bookingId, status) => callAdminApi("updateLeadStatus", { bookingId, status }),
  addLeadNote: (bookingId, note) => callAdminApi("addLeadNote", { bookingId, note }),
  schedulePublish: (pageId, scheduledAt, note = "", changeSummary = "") => callAdminApi("schedulePublish", { pageId, scheduledAt, note, changeSummary }),
  runScheduledPublishes: () => callAdminApi("runScheduledPublishes"),
  getIntegrationHealth: () => callAdminApi("getIntegrationHealth"),
  getAuditLogs: (limit = 50) => callAdminApi("getAuditLogs", { limit })
};

import React, { useEffect, useState } from "react";
import { AdminApi } from "../../shared/api/adminApiClient";
import { Card, Table } from "../../shared/components/ui";
import { reauthenticateOwner } from "../../shared/auth/reauthenticateOwner";

const pages = ["home", "home-ar", "booking", "booking-ar", "about", "about-ar", "services", "services-ar", "guide", "guide-ar", "contact", "contact-ar"];

export function PagesModule() {
  const [selected, setSelected] = useState("home");
  const [draft, setDraft] = useState("{}");
  const [published, setPublished] = useState({});
  const [revisions, setRevisions] = useState([]);
  const [pendingAction, setPendingAction] = useState(null);
  const [message, setMessage] = useState("");

  async function load(pageId) {
    const res = await AdminApi.getPageEditor(pageId);
    const payload = res.data || res;
    setDraft(JSON.stringify(payload.draft || {}, null, 2));
    setPublished(payload.published || {});
    setRevisions(payload.revisions || []);
    setPendingAction(null);
  }

  useEffect(() => { load(selected).catch((e) => setMessage(e.message)); }, [selected]);

  async function saveDraft() {
    try {
      await AdminApi.savePageDraft(selected, JSON.parse(draft));
      setMessage("Draft saved.");
      await load(selected);
    } catch (e) { setMessage(e.message); }
  }

  function requestPublishReview() {
    const parsedDraft = parseDraftJson(draft);
    if (!parsedDraft.ok) {
      setMessage(parsedDraft.error);
      return;
    }
    setPendingAction({
      type: "publish",
      title: `Review Publish: ${selected}`,
      before: published || {},
      after: parsedDraft.value
    });
  }

  async function publish() {
    try {
      const authCheck = await reauthenticateOwner(`publish page "${selected}"`);
      if (authCheck.cancelled) {
        setMessage("Publish cancelled.");
        return;
      }
      await AdminApi.publishPage(selected, "admin-v3 publish", "single-owner publish");
      setMessage("Published.");
      setPendingAction(null);
      await load(selected);
    } catch (e) { setMessage(e.message); }
  }

  function requestRollbackReview(revisionId) {
    const revision = revisions.find((item) => item.id === revisionId);
    if (!revision) {
      setMessage("Revision not found.");
      return;
    }
    const parsedDraft = parseDraftJson(draft);
    if (!parsedDraft.ok) {
      setMessage(parsedDraft.error);
      return;
    }
    setPendingAction({
      type: "rollback",
      revisionId,
      title: `Review Rollback: ${selected} -> ${revisionId}`,
      before: parsedDraft.value,
      after: revision.data || {}
    });
  }

  async function rollback(revisionId) {
    try {
      const authCheck = await reauthenticateOwner(`rollback page "${selected}"`);
      if (authCheck.cancelled) {
        setMessage("Rollback cancelled.");
        return;
      }
      await AdminApi.rollbackPage(selected, revisionId);
      setMessage("Rolled back and published.");
      setPendingAction(null);
      await load(selected);
    } catch (e) { setMessage(e.message); }
  }

  async function confirmPendingAction() {
    if (!pendingAction) return;
    if (pendingAction.type === "publish") {
      await publish();
      return;
    }
    if (pendingAction.type === "rollback" && pendingAction.revisionId) {
      await rollback(pendingAction.revisionId);
    }
  }

  const diff = pendingAction ? diffObjects(pendingAction.before, pendingAction.after) : null;

  return (
    <>
      <Card title="Page Editor" actions={<>
        <select className="select" value={selected} onChange={(e) => setSelected(e.target.value)}>{pages.map((p) => <option key={p}>{p}</option>)}</select>
        <button className="btn" onClick={saveDraft}>Save Draft</button>
        <button className="btn btn-primary" onClick={requestPublishReview}>Review Publish</button>
      </>}>
        <textarea className="textarea" rows={18} value={draft} onChange={(e) => setDraft(e.target.value)} />
        {message && <p className="muted">{message}</p>}
      </Card>
      {pendingAction && diff && (
        <Card title={pendingAction.title} actions={<>
          <span className="badge">Added: {diff.summary.added}</span>
          <span className="badge">Changed: {diff.summary.changed}</span>
          <span className="badge">Removed: {diff.summary.removed}</span>
          <button className="btn btn-primary" onClick={confirmPendingAction}>
            Confirm {pendingAction.type === "publish" ? "Publish" : "Rollback"}
          </button>
          <button className="btn" onClick={() => setPendingAction(null)}>Cancel</button>
        </>}>
          <Table
            columns={["Type", "Path", "Before", "After"]}
            rows={diff.rows.slice(0, 30).map((row) => [row.type, row.path, row.before, row.after])}
          />
          {diff.rows.length > 30 && <p className="muted">Showing 30 of {diff.rows.length} total changes.</p>}
        </Card>
      )}
      <Card title="Revisions">
        <Table columns={["Revision", "Type", "By", "Action"]} rows={revisions.map((r) => [r.id, r.type || "-", r.createdBy || "-", <button className="btn" onClick={() => requestRollbackReview(r.id)}>Review Rollback</button>])} />
      </Card>
    </>
  );
}

function parseDraftJson(draftText) {
  try {
    const parsed = JSON.parse(draftText);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, error: "Draft must be a valid JSON object." };
    }
    return { ok: true, value: parsed };
  } catch (error) {
    return { ok: false, error: `Invalid JSON draft: ${error.message}` };
  }
}

function flattenObject(input, prefix = "", out = new Map()) {
  if (Array.isArray(input)) {
    input.forEach((value, idx) => flattenObject(value, `${prefix}[${idx}]`, out));
    return out;
  }
  if (input && typeof input === "object") {
    Object.entries(input).forEach(([key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      flattenObject(value, path, out);
    });
    return out;
  }
  const key = prefix || "$";
  out.set(key, stringifyValue(input));
  return out;
}

function stringifyValue(value) {
  if (typeof value === "string") return value;
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  try {
    return JSON.stringify(value);
  } catch (_) {
    return String(value);
  }
}

function truncateText(text, max = 120) {
  const value = String(text || "");
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

function diffObjects(before, after) {
  const beforeMap = flattenObject(before || {});
  const afterMap = flattenObject(after || {});
  const rows = [];
  let added = 0;
  let changed = 0;
  let removed = 0;

  const keys = [...new Set([...beforeMap.keys(), ...afterMap.keys()])].sort();
  keys.forEach((path) => {
    const beforeValue = beforeMap.get(path);
    const afterValue = afterMap.get(path);

    if (beforeValue === undefined && afterValue !== undefined) {
      added += 1;
      rows.push({ type: "added", path, before: "-", after: truncateText(afterValue) });
      return;
    }
    if (beforeValue !== undefined && afterValue === undefined) {
      removed += 1;
      rows.push({ type: "removed", path, before: truncateText(beforeValue), after: "-" });
      return;
    }
    if (beforeValue !== afterValue) {
      changed += 1;
      rows.push({ type: "changed", path, before: truncateText(beforeValue), after: truncateText(afterValue) });
    }
  });

  return {
    summary: { added, changed, removed },
    rows
  };
}

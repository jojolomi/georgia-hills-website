import React, { useEffect, useState } from "react";
import { AdminApi } from "../../shared/api/adminApiClient";
import { Card, Table } from "../../shared/components/ui";
import { reauthenticateOwner } from "../../shared/auth/reauthenticateOwner";

export function MediaModule() {
  const [assets, setAssets] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [query, setQuery] = useState("");
  const [bulkTag, setBulkTag] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    const res = await AdminApi.getMediaLibrary(query, "");
    const payload = res.data || res;
    const nextAssets = payload.assets || [];
    setAssets(nextAssets);
    const validKeys = new Set(nextAssets.map((a) => assetKey(a)));
    setSelectedKeys((prev) => prev.filter((key) => validKeys.has(key)));
  };

  useEffect(() => { load().catch((e) => setMessage(e.message)); }, []);

  function toggleSelected(key, checked) {
    setSelectedKeys((prev) => checked ? [...new Set([...prev, key])] : prev.filter((item) => item !== key));
  }

  function selectAllVisible() {
    setSelectedKeys(assets.map((asset) => assetKey(asset)).filter(Boolean));
  }

  function clearSelected() {
    setSelectedKeys([]);
  }

  async function applyBulkTag() {
    const nextTag = bulkTag.trim();
    if (!nextTag) {
      setMessage("Tag is required.");
      return;
    }
    if (selectedKeys.length === 0) {
      setMessage("No media assets selected.");
      return;
    }
    try {
      const selectedAssets = assets.filter((asset) => selectedKeys.includes(assetKey(asset)));
      const updates = selectedAssets.map((asset) => {
        const url = asset.url || asset.path;
        const currentTags = Array.isArray(asset.tags) ? asset.tags : [];
        const mergedTags = [...new Set([...currentTags, nextTag])];
        return AdminApi.saveMediaMeta(url, mergedTags, asset.alt || "");
      });
      const results = await Promise.allSettled(updates);
      const failed = results.filter((r) => r.status === "rejected").length;
      const updated = results.length - failed;
      await load();
      setBulkTag("");
      setMessage(`Bulk tag applied. Updated: ${updated}, Failed: ${failed}.`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <>
      <Card title="Media Library" actions={<>
        <input className="input" style={{ width: 220 }} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" />
        <button className="btn" onClick={() => load().catch((e) => setMessage(e.message))}>Refresh</button>
        <button className="btn" onClick={selectAllVisible}>Select All</button>
        <button className="btn" onClick={clearSelected}>Clear</button>
      </>}>
        <div className="stack" style={{ marginBottom: "0.7rem" }}>
          <input className="input" style={{ width: 240 }} value={bulkTag} onChange={(e) => setBulkTag(e.target.value)} placeholder="Bulk tag (e.g. hero)" />
          <button className="btn" onClick={applyBulkTag} disabled={selectedKeys.length === 0}>Apply Tag ({selectedKeys.length})</button>
        </div>
        <Table columns={["Select", "Path", "Size", "Tags", "Alt"]} rows={assets.map((a) => [
          <input type="checkbox" checked={selectedKeys.includes(assetKey(a))} onChange={(e) => toggleSelected(assetKey(a), e.target.checked)} aria-label={`Select media ${assetKey(a)}`} />,
          a.path || a.url || "-",
          String(a.size || 0),
          (a.tags || []).join(", "),
          a.alt || "-"
        ])} />
      </Card>
      <Card title="Replace Asset (Global)">
        <ReplaceAssetForm onDone={setMessage} />
      </Card>
      {message && <p className="muted">{message}</p>}
    </>
  );
}

function assetKey(asset) {
  return String(asset?.url || asset?.path || "");
}

function ReplaceAssetForm({ onDone }) {
  async function onSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      const authCheck = await reauthenticateOwner("replace media asset globally");
      if (authCheck.cancelled) {
        onDone("Asset replacement cancelled.");
        return;
      }
      await AdminApi.replaceMediaAsset(String(fd.get("oldUrl") || ""), String(fd.get("newUrl") || ""));
      onDone("Asset replacement completed.");
      e.currentTarget.reset();
    } catch (err) { onDone(err.message); }
  }

  return (
    <form onSubmit={onSubmit} className="grid-2">
      <input name="oldUrl" className="input" placeholder="Old asset URL" required />
      <input name="newUrl" className="input" placeholder="New asset URL" required />
      <div><button className="btn btn-danger" type="submit">Replace</button></div>
    </form>
  );
}

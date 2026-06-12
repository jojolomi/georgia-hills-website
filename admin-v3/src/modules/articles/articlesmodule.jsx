import React, { useEffect, useState } from "react";
import { AdminApi } from "../../shared/api/adminApiClient";
import { Card, Table } from "../../shared/components/ui";
import { reauthenticateOwner } from "../../shared/auth/reauthenticateOwner";

export function ArticlesModule() {
  const [items, setItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [message, setMessage] = useState("");

  const load = async () => {
    const res = await AdminApi.listArticles();
    const payload = res.data || res;
    const nextItems = payload.articles || payload.items || [];
    setItems(nextItems);
    setSelectedIds((prev) => prev.filter((id) => nextItems.some((item) => item.id === id)));
  };

  useEffect(() => { load().catch((e) => setMessage(e.message)); }, []);

  async function addQuick() {
    try {
      await AdminApi.upsertArticle("", { title: { en: "New post", ar: "مقال جديد" }, excerpt: { en: "Draft", ar: "مسودة" }, date: new Date().toISOString().slice(0, 10) });
      await load();
    } catch (e) { setMessage(e.message); }
  }

  async function remove(id) {
    try {
      const authCheck = await reauthenticateOwner(`delete article "${id}"`);
      if (authCheck.cancelled) {
        setMessage("Delete cancelled.");
        return;
      }
      await AdminApi.deleteArticle(id);
      await load();
      setMessage(`Article "${id}" deleted.`);
    }
    catch (e) { setMessage(e.message); }
  }

  function toggleSelected(id, checked) {
    setSelectedIds((prev) => checked ? [...new Set([...prev, id])] : prev.filter((item) => item !== id));
  }

  function selectAllVisible() {
    setSelectedIds(items.map((a) => a.id).filter(Boolean));
  }

  function clearSelected() {
    setSelectedIds([]);
  }

  async function removeSelected() {
    if (selectedIds.length === 0) {
      setMessage("No articles selected.");
      return;
    }
    try {
      const authCheck = await reauthenticateOwner(`bulk delete ${selectedIds.length} articles`);
      if (authCheck.cancelled) {
        setMessage("Bulk delete cancelled.");
        return;
      }
      const results = await Promise.allSettled(selectedIds.map((id) => AdminApi.deleteArticle(id)));
      const failed = results.filter((r) => r.status === "rejected").length;
      const deleted = results.length - failed;
      await load();
      setMessage(`Bulk delete completed. Deleted: ${deleted}, Failed: ${failed}.`);
    } catch (e) {
      setMessage(e.message);
    }
  }

  return <Card title="Articles" actions={<>
    <button className="btn btn-primary" onClick={addQuick}>Add Article</button>
    <button className="btn" onClick={selectAllVisible}>Select All</button>
    <button className="btn" onClick={clearSelected}>Clear</button>
    <button className="btn btn-danger" onClick={removeSelected} disabled={selectedIds.length === 0}>
      Delete Selected ({selectedIds.length})
    </button>
  </>}>
    <Table columns={["Select", "ID", "Title EN", "Date", "Action"]} rows={items.map((a) => [
      <input type="checkbox" checked={selectedIds.includes(a.id)} onChange={(e) => toggleSelected(a.id, e.target.checked)} aria-label={`Select article ${a.id}`} />,
      a.id,
      a.title?.en || "-",
      a.date || "-",
      <button className="btn btn-danger" onClick={() => remove(a.id)}>Delete</button>
    ])} />
    {message && <p className="muted">{message}</p>}
  </Card>;
}

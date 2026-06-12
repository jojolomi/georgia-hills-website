import React, { useEffect, useState } from "react";
import { AdminApi } from "../../shared/api/adminApiClient";
import { Card, Table } from "../../shared/components/ui";
import { reauthenticateOwner } from "../../shared/auth/reauthenticateOwner";

export function DestinationsModule() {
  const [items, setItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [message, setMessage] = useState("");

  const load = async () => {
    const res = await AdminApi.listDestinations();
    const payload = res.data || res;
    const nextItems = payload.destinations || payload.items || [];
    setItems(nextItems);
    setSelectedIds((prev) => prev.filter((id) => nextItems.some((item) => item.id === id)));
  };

  useEffect(() => { load().catch((e) => setMessage(e.message)); }, []);

  async function addQuick() {
    try {
      await AdminApi.upsertDestination("", { title_en: "New destination", title_ar: "وجهة جديدة", active: true, updatedAt: new Date().toISOString() });
      await load();
    } catch (e) { setMessage(e.message); }
  }

  async function remove(id) {
    try {
      const authCheck = await reauthenticateOwner(`delete destination "${id}"`);
      if (authCheck.cancelled) {
        setMessage("Delete cancelled.");
        return;
      }
      await AdminApi.deleteDestination(id);
      await load();
      setMessage(`Destination "${id}" deleted.`);
    }
    catch (e) { setMessage(e.message); }
  }

  function toggleSelected(id, checked) {
    setSelectedIds((prev) => checked ? [...new Set([...prev, id])] : prev.filter((item) => item !== id));
  }

  function selectAllVisible() {
    setSelectedIds(items.map((d) => d.id).filter(Boolean));
  }

  function clearSelected() {
    setSelectedIds([]);
  }

  async function removeSelected() {
    if (selectedIds.length === 0) {
      setMessage("No destinations selected.");
      return;
    }
    try {
      const authCheck = await reauthenticateOwner(`bulk delete ${selectedIds.length} destinations`);
      if (authCheck.cancelled) {
        setMessage("Bulk delete cancelled.");
        return;
      }
      const results = await Promise.allSettled(selectedIds.map((id) => AdminApi.deleteDestination(id)));
      const failed = results.filter((r) => r.status === "rejected").length;
      const deleted = results.length - failed;
      await load();
      setMessage(`Bulk delete completed. Deleted: ${deleted}, Failed: ${failed}.`);
    } catch (e) {
      setMessage(e.message);
    }
  }

  return <Card title="Destinations" actions={<>
    <button className="btn btn-primary" onClick={addQuick}>Add Destination</button>
    <button className="btn" onClick={selectAllVisible}>Select All</button>
    <button className="btn" onClick={clearSelected}>Clear</button>
    <button className="btn btn-danger" onClick={removeSelected} disabled={selectedIds.length === 0}>
      Delete Selected ({selectedIds.length})
    </button>
  </>}>
    <Table columns={["Select", "ID", "Title EN", "Active", "Action"]} rows={items.map((d) => [
      <input type="checkbox" checked={selectedIds.includes(d.id)} onChange={(e) => toggleSelected(d.id, e.target.checked)} aria-label={`Select destination ${d.id}`} />,
      d.id,
      d.title_en || d.title?.en || "-",
      String(d.active !== false),
      <button className="btn btn-danger" onClick={() => remove(d.id)}>Delete</button>
    ])} />
    {message && <p className="muted">{message}</p>}
  </Card>;
}

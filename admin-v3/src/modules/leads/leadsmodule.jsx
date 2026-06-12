import React, { useEffect, useState } from "react";
import { AdminApi } from "../../shared/api/adminApiClient";
import { Card, Table } from "../../shared/components/ui";

export function LeadsModule() {
  const [leads, setLeads] = useState([]);
  const [summary, setSummary] = useState({ total: 0, newCount: 0, slaBreachCount: 0 });
  const [statusFilter, setStatusFilter] = useState("all");
  const [slaOnly, setSlaOnly] = useState(false);
  const [noteDrafts, setNoteDrafts] = useState({});
  const [message, setMessage] = useState("");

  const load = async () => {
    const res = await AdminApi.listLeads(100);
    const payload = res.data || res;
    setLeads(payload.leads || []);
    setSummary(payload.summary || { total: (payload.leads || []).length, newCount: 0, slaBreachCount: 0 });
  };

  useEffect(() => { load().catch((e) => setMessage(e.message)); }, []);

  async function update(id, status) {
    try {
      await AdminApi.updateLeadStatus(id, status);
      await load();
    } catch (e) { setMessage(e.message); }
  }

  async function addNote(id) {
    const note = String(noteDrafts[id] || "").trim();
    if (!note) {
      setMessage("Note cannot be empty.");
      return;
    }
    try {
      await AdminApi.addLeadNote(id, note);
      setNoteDrafts((prev) => ({ ...prev, [id]: "" }));
      setMessage(`Note added to lead ${id}.`);
      await load();
    } catch (e) {
      setMessage(e.message);
    }
  }

  const filteredLeads = leads.filter((lead) => {
    const status = lead.crmStatus || lead.status || "new";
    if (statusFilter !== "all" && status !== statusFilter) return false;
    if (slaOnly && !lead.slaBreach) return false;
    return true;
  });

  return <Card title="Booking Leads" actions={<>
    <span className="badge">Total: {summary.total || leads.length}</span>
    <span className="badge">New: {summary.newCount || 0}</span>
    <span className="badge">SLA Breach: {summary.slaBreachCount || 0}</span>
    <select className="select" style={{ width: 140 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
      <option value="all">All Status</option>
      <option value="new">New</option>
      <option value="contacted">Contacted</option>
      <option value="quoted">Quoted</option>
      <option value="won">Won</option>
      <option value="lost">Lost</option>
    </select>
    <label className="stack" style={{ gap: ".35rem" }}>
      <input type="checkbox" checked={slaOnly} onChange={(e) => setSlaOnly(e.target.checked)} />
      <span className="muted">SLA only</span>
    </label>
  </>}>
    <Table
      columns={["Lead ID", "Name", "Phone", "Status", "Age", "SLA", "Market", "Campaign", "Source", "Actions"]}
      rows={filteredLeads.map((l) => {
        const attr = l.attributionNormalized || {};
        return [
          l.id,
          l.name || "-",
          l.phone || "-",
          l.crmStatus || l.status || "new",
          leadAgeLabel(l.leadAgeMinutes),
          l.slaBreach ? <span className="badge" style={{ borderColor: "#b91c1c", color: "#b91c1c" }}>Overdue</span> : <span className="badge">On time</span>,
          attr.market || "-",
          attr.utmCampaign || "-",
          attr.utmSource || "-",
          <div className="stack">
            <button className="btn" onClick={() => update(l.id, "contacted")}>Contacted</button>
            <button className="btn" onClick={() => update(l.id, "quoted")}>Quoted</button>
            <button className="btn btn-primary" onClick={() => update(l.id, "won")}>Won</button>
            <input
              className="input"
              style={{ width: 180 }}
              placeholder="Add note"
              value={noteDrafts[l.id] || ""}
              onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [l.id]: e.target.value }))}
            />
            <button className="btn" onClick={() => addNote(l.id)}>Save note</button>
          </div>
        ];
      })}
    />
    {message && <p className="muted">{message}</p>}
  </Card>;
}

function leadAgeLabel(minutes) {
  const value = Number(minutes);
  if (!Number.isFinite(value) || value < 0) return "-";
  if (value < 60) return `${value}m`;
  return `${Math.floor(value / 60)}h ${value % 60}m`;
}

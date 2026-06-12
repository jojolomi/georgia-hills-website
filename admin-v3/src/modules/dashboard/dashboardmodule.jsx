import React, { useEffect, useState } from "react";
import { AdminApi } from "../../shared/api/adminApiClient";
import { Card, Table } from "../../shared/components/ui";

export function DashboardModule() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    AdminApi.getDashboardSummary().then((res) => setData(res.data || res)).catch((e) => setError(e.message));
  }, []);

  if (error) return <Card title="Dashboard Error"><p className="muted">{error}</p></Card>;
  if (!data) return <Card title="Dashboard">Loading...</Card>;

  const totals = data.totals || data;
  const rows = Object.entries(data.integrations || {}).map(([k, v]) => [k, v?.configured ? "Configured" : "Missing", v?.healthy ? "Healthy" : "Unknown"]);

  return (
    <>
      <div className="grid-3">
        <Card title="Leads (30d)"><div className="kpi">{totals.bookings || 0}</div></Card>
        <Card title="Arabic Leads"><div className="kpi">{totals.ar || 0}</div></Card>
        <Card title="English Leads"><div className="kpi">{totals.en || 0}</div></Card>
      </div>
      <Card title="Integration Health">
        <Table columns={["Integration", "Configured", "Health"]} rows={rows} />
      </Card>
    </>
  );
}

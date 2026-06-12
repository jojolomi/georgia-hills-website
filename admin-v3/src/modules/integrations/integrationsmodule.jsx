import React, { useEffect, useState } from "react";
import { AdminApi } from "../../shared/api/adminApiClient";
import { Card, Table } from "../../shared/components/ui";

export function IntegrationsModule() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    AdminApi.getIntegrationHealth().then((r) => setData(r.data || r)).catch((e) => setErr(e.message));
  }, []);

  const rows = Object.entries(data?.integrations || {}).map(([name, val]) => [name, val.configured ? "Configured" : "Missing", val.healthy ? "Healthy" : "Check needed", val.lastEventAt || "-"]);

  return <Card title="Integrations Health">
    {!data ? "Loading..." : <Table columns={["Integration", "Configured", "Health", "Last Event"]} rows={rows} />}
    {err && <p className="muted">{err}</p>}
  </Card>;
}

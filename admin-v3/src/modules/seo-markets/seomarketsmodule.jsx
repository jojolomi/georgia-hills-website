import React, { useEffect, useState } from "react";
import { AdminApi } from "../../shared/api/adminApiClient";
import { Card, Table } from "../../shared/components/ui";

export function SeoMarketsModule() {
  const [health, setHealth] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    AdminApi.getIntegrationHealth().then((res) => setHealth((res.data || res).seo || (res.data || res))).catch((e) => setMessage(e.message));
  }, []);

  const rows = Object.entries(health?.marketPages || {}).map(([k, v]) => [k, v.keywordCoverage ? "OK" : "Needs work", v.schemaCoverage ? "OK" : "Needs work"]);

  return <Card title="SEO + Market Health">
    {!health ? "Loading..." : <Table columns={["Market", "Keyword Coverage", "Schema Coverage"]} rows={rows} />}
    {message && <p className="muted">{message}</p>}
  </Card>;
}

import React, { useEffect, useState } from "react";
import { AdminApi } from "../../shared/api/adminApiClient";
import { Card, Table } from "../../shared/components/ui";

export function AuditModule() {
  const [logs, setLogs] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    AdminApi.getAuditLogs(50)
      .then((res) => {
        const payload = res.data || res;
        setLogs(payload.logs || []);
      })
      .catch((e) => setMessage(e.message));
  }, []);

  return <Card title="Audit Log">
    <Table columns={["Time", "Action", "Details", "Actor"]} rows={logs.map((l) => [String(l.timestamp || "-"), l.action || "-", l.details || "-", l.userEmail || l.userUid || "-"])} />
    {message && <p className="muted">{message}</p>}
  </Card>;
}

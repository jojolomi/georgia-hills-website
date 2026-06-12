import React, { useState } from "react";
import { AdminApi } from "../../shared/api/adminApiClient";
import { Card } from "../../shared/components/ui";

export function PublishingModule() {
  const [message, setMessage] = useState("");

  async function schedule(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await AdminApi.schedulePublish(String(fd.get("pageId") || ""), String(fd.get("scheduledAt") || ""), String(fd.get("note") || ""), String(fd.get("summary") || ""));
      setMessage("Scheduled publish created.");
      e.currentTarget.reset();
    } catch (err) { setMessage(err.message); }
  }

  async function runNow() {
    try {
      await AdminApi.runScheduledPublishes();
      setMessage("Executed due publishes.");
    } catch (err) { setMessage(err.message); }
  }

  return <>
    <Card title="Schedule Publish">
      <form onSubmit={schedule} className="grid-2">
        <input name="pageId" className="input" placeholder="page id (e.g. home)" required />
        <input name="scheduledAt" type="datetime-local" className="input" required />
        <input name="note" className="input" placeholder="note" />
        <input name="summary" className="input" placeholder="change summary" />
        <div><button className="btn btn-primary" type="submit">Schedule</button></div>
      </form>
    </Card>
    <Card title="Queue Actions" actions={<button className="btn" onClick={runNow}>Run Due Publishes Now</button>}>
      <p className="muted">Use this for manual execution or verification.</p>
      {message && <p className="muted">{message}</p>}
    </Card>
  </>;
}

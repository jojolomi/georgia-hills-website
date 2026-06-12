import React, { useMemo } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { useOwnerAuth } from "../shared/hooks/useOwnerAuth";
import { DashboardModule } from "../modules/dashboard/DashboardModule";
import { PagesModule } from "../modules/pages/PagesModule";
import { DestinationsModule } from "../modules/destinations/DestinationsModule";
import { ArticlesModule } from "../modules/articles/ArticlesModule";
import { MediaModule } from "../modules/media/MediaModule";
import { SeoMarketsModule } from "../modules/seo-markets/SeoMarketsModule";
import { LeadsModule } from "../modules/leads/LeadsModule";
import { PublishingModule } from "../modules/publishing/PublishingModule";
import { IntegrationsModule } from "../modules/integrations/IntegrationsModule";
import { AuditModule } from "../modules/audit/AuditModule";

function LoginView({ onLogin, error }) {
  return (
    <div style={{ maxWidth: 420, margin: "4rem auto" }} className="card">
      <h2>Owner Login</h2>
      <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); onLogin(fd.get("email"), fd.get("password")); }}>
        <div style={{ marginBottom: 10 }}><input className="input" name="email" type="email" placeholder="Admin email" required /></div>
        <div style={{ marginBottom: 10 }}><input className="input" name="password" type="password" placeholder="Password" required /></div>
        <button className="btn btn-primary" type="submit">Login</button>
      </form>
      {error && <p className="muted" style={{ color: "#b91c1c" }}>{error}</p>}
    </div>
  );
}

function AppShell({ onLogout, email }) {
  const nav = useMemo(() => [
    ["/dashboard", "Dashboard"],
    ["/content/pages", "Pages"],
    ["/content/destinations", "Destinations"],
    ["/content/articles", "Articles"],
    ["/media", "Media"],
    ["/seo/markets", "SEO Markets"],
    ["/leads", "Leads"],
    ["/publishing", "Publishing"],
    ["/integrations", "Integrations"],
    ["/audit", "Audit"]
  ], []);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1>Georgia Hills Admin v3</h1>
        {nav.map(([to, label]) => (
          <NavLink key={to} to={to} className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>{label}</NavLink>
        ))}
      </aside>
      <main className="main">
        <div className="topbar">
          <div>
            <strong>Single Owner Mode</strong>
            <div className="muted">{email}</div>
          </div>
          <button className="btn" onClick={onLogout}>Logout</button>
        </div>
        <Routes>
          <Route path="/dashboard" element={<DashboardModule />} />
          <Route path="/content/pages" element={<PagesModule />} />
          <Route path="/content/destinations" element={<DestinationsModule />} />
          <Route path="/content/articles" element={<ArticlesModule />} />
          <Route path="/media" element={<MediaModule />} />
          <Route path="/seo/markets" element={<SeoMarketsModule />} />
          <Route path="/leads" element={<LeadsModule />} />
          <Route path="/publishing" element={<PublishingModule />} />
          <Route path="/integrations" element={<IntegrationsModule />} />
          <Route path="/audit" element={<AuditModule />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export function App() {
  const { loading, user, claims, error, login, logout } = useOwnerAuth();

  if (loading) return <div style={{ padding: "2rem" }}>Loading...</div>;
  if (!user) return <LoginView onLogin={login} error={error} />;
  if (claims?.admin !== true && claims?.role !== "admin") {
    return <div style={{ padding: "2rem" }}><h2>Access denied</h2><p className="muted">Owner admin claim required.</p><button className="btn" onClick={logout}>Logout</button></div>;
  }

  return <AppShell onLogout={logout} email={user.email || user.uid} />;
}

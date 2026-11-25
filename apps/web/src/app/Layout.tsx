import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { GlassBar } from "../design/components";
import { copy, siteLinks, tabBar } from "../content/copy";
import { useAuth } from "../auth/AuthProvider";
import { InstallHint } from "./InstallHint";
import { useData } from "./data";

const REPO = "https://github.com/isaacbredy27-cloud/Isaac_Agent_Team";

function SiteLinks() {
  return (
    <>
      {siteLinks.map((l) =>
        l.path.endsWith("/") ? (
          <a key={l.path} href={l.path}>
            {l.label}
          </a>
        ) : (
          <Link key={l.path} to={l.path}>
            {l.label}
          </Link>
        ),
      )}
    </>
  );
}

export function Layout() {
  const { role } = useAuth();
  const { profile } = useData();
  const { pathname } = useLocation();
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  useEffect(() => window.scrollTo(0, 0), [pathname]);

  const tabs = tabBar.filter((t) => !t.superAdminOnly || role === "super_admin");
  const isJobs = (path: string) => path === "/jobs" && (pathname === "/" || pathname.startsWith("/jobs"));

  return (
    <>
      <a className="skip-link" href="#main">
        {copy.app.skipToContent}
      </a>
      <GlassBar position="top" as="header">
        <div className="row-between grow">
          <Link to="/" className="text-sm" style={{ fontWeight: 700 }}>
            {copy.app.name}
          </Link>
          <nav aria-label={copy.nav.siteLinksLabel} className="row text-sm">
            <SiteLinks />
          </nav>
        </div>
      </GlassBar>
      <main id="main" className="page stack-lg" tabIndex={-1}>
        {!online && (
          <p role="status" className="card">
            {copy.offline.banner}
          </p>
        )}
        <InstallHint enabled={profile !== null} />
        <Outlet />
        <footer className="stack text-sm text-secondary">
          <p>{copy.nav.footerNote}</p>
          <nav aria-label={copy.nav.siteLinksLabel} className="row">
            <SiteLinks />
            <a href={REPO} target="_blank" rel="noreferrer noopener">
              GitHub
            </a>
          </nav>
        </footer>
      </main>
      <GlassBar position="bottom" as="nav" aria-label={copy.nav.tabBarLabel}>
        {tabs.map((t) => (
          <NavLink
            key={t.id}
            to={t.path}
            className="tab"
            {...(isJobs(t.path) ? { "aria-current": "page" as const } : {})}
          >
            {t.label}
          </NavLink>
        ))}
      </GlassBar>
    </>
  );
}

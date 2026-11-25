import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
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
  const firstLoad = useRef(true);
  useEffect(() => {
    window.scrollTo(0, 0);
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    // After a route change: set the document title from the page h1 and move focus there (WCAG 2.4.2, 2.4.3).
    // Wait a frame so lazy and data-driven pages can render their h1.
    const frame = requestAnimationFrame(() => {
      const main = document.getElementById("main");
      const h1 = main?.querySelector("h1");
      const name = h1?.textContent?.trim();
      document.title = name ? `${name} · ${copy.app.name}` : copy.app.name;
      if (h1) {
        h1.tabIndex = -1;
        h1.focus({ preventScroll: true });
      } else {
        main?.focus({ preventScroll: true });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  const tabs = tabBar.filter((t) => !t.superAdminOnly || role === "super_admin");
  // Only "/" needs the override: the Jobs tab points to /jobs but "/" shows the same screen.
  const isJobs = (path: string) => path === "/jobs" && pathname === "/";

  return (
    <>
      <a className="skip-link" href="#main">
        {copy.app.skipToContent}
      </a>
      <GlassBar position="top" as="header">
        <div className="row-between grow">
          <Link to="/" className="text-sm text-bold">
            {copy.app.name}
          </Link>
          <nav aria-label="Site" className="row text-sm">
            <SiteLinks />
          </nav>
        </div>
      </GlassBar>
      <main id="main" className="page stack-lg" tabIndex={-1}>
        {/* Live region exists empty on mount so the text is announced when it fills. */}
        <p role="status" className={online ? undefined : "card"}>
          {online ? null : (
            <>
              <span aria-hidden="true">⚠ </span>
              {copy.offline.banner}
            </>
          )}
        </p>
        <InstallHint enabled={profile !== null} />
        <Outlet />
      </main>
      <footer className="page stack text-sm text-secondary">
        <p>{copy.nav.footerNote}</p>
        <nav aria-label="Footer" className="row">
          <SiteLinks />
          <a href={REPO} target="_blank" rel="noreferrer noopener">
            {copy.nav.github}
          </a>
        </nav>
      </footer>
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

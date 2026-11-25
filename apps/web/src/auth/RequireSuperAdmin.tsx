// Route guard for super_admin pages. UI convenience only: every Function re-checks
// token → role (profiles) → aal2 → step-up. Order matches the server: role before MFA,
// so a `user` never learns the page needs MFA.
import { useEffect, useState, type ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { authCopy } from "./copy";
import { authPaths } from "./helpers";
import { MfaChallenge } from "./screens/MfaChallenge";
import { MfaEnroll } from "./screens/MfaEnroll";
import { AuthPage, Status } from "./screens/ui";

export function NotAvailable() {
  return (
    <AuthPage title={authCopy.notAvailable.title}>
      <p>{authCopy.notAvailable.body}</p>
      <p>
        <Link to={authPaths.home}>{authCopy.notAvailable.link}</Link>
      </p>
    </AuthPage>
  );
}

function Loading() {
  return (
    <main className="auth-page">
      <Status>{authCopy.loading}</Status>
    </main>
  );
}

/** aal1 super_admin: challenge if a verified factor exists (nextLevel aal2), else enrol. */
function MfaGate() {
  const auth = useAuth();
  const [hasFactor, setHasFactor] = useState<boolean | null>(auth.aal.next === "aal2" ? true : null);

  useEffect(() => {
    if (hasFactor !== null) return;
    let active = true;
    void auth.hasVerifiedTotp().then((v) => {
      if (active) setHasFactor(v);
    });
    return () => {
      active = false;
    };
  }, [auth, hasFactor]);

  if (hasFactor === null) return <Loading />;
  return hasFactor ? <MfaChallenge onDone={() => void auth.refresh()} /> : <MfaEnroll onDone={() => void auth.refresh()} />;
}

export function RequireSuperAdmin({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.loading) return <Loading />;
  if (!auth.configured) return <NotAvailable />;
  if (!auth.session) {
    return <Navigate to={authPaths.signIn} replace state={{ from: location.pathname + location.search }} />;
  }
  if (auth.role !== "super_admin") return <NotAvailable />;
  if (auth.aal.current !== "aal2") return <MfaGate />;
  return <>{children}</>;
}

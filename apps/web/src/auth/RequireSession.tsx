// Signed-in guard for the standalone MFA routes.
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { authCopy } from "./copy";
import { authPaths } from "./helpers";
import { Status } from "./screens/ui";

export function RequireSession({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const location = useLocation();
  if (auth.loading) {
    return (
      <main className="auth-page">
        <Status>{authCopy.loading}</Status>
      </main>
    );
  }
  if (!auth.session) return <Navigate to={authPaths.signIn} replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

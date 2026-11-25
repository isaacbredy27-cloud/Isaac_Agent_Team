// OAuth and email-confirm landing page (PKCE). Exchanges ?code= for a session, then moves on.
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthProvider";
import { authCopy } from "../copy";
import { authPaths, safeNext, type AuthErrorKind } from "../helpers";
import { exchangeCodeOnce } from "../supabase";
import { AuthPage, ErrorMessage, Status } from "./ui";

export function AuthCallback() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<AuthErrorKind | null>(null);

  useEffect(() => {
    if (auth.stub) {
      navigate(authPaths.home, { replace: true });
      return;
    }
    if (!auth.configured) {
      setError("notConfigured");
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const next = safeNext(params.get("next"));
    // Drop the one-time code and any provider error text from the address bar.
    window.history.replaceState(null, "", window.location.pathname);
    if (params.get("error") || !code) {
      setError(params.get("error") === "access_denied" ? "google" : "linkExpired");
      return;
    }
    let active = true;
    exchangeCodeOnce(code).then(({ error }) => {
      if (!active) return;
      if (error) setError("linkExpired");
      else navigate(next, { replace: true });
    });
    return () => {
      active = false;
    };
  }, [auth.stub, auth.configured, navigate]);

  return (
    <AuthPage title={authCopy.callback.busy}>
      {error ? (
        <>
          <ErrorMessage kind={error} />
          <p>
            <Link to={authPaths.signIn}>{authCopy.backToLogin}</Link>
          </p>
        </>
      ) : (
        <Status>{authCopy.loading}</Status>
      )}
    </AuthPage>
  );
}

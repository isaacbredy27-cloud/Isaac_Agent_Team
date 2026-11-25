// Reached from the reset email (PKCE: ?code=...). Exchanges the code, then sets a new password.
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthProvider";
import { authCopy } from "../copy";
import { authPaths, type AuthErrorKind } from "../helpers";
import { exchangeCodeOnce } from "../supabase";
import { AuthPage, ErrorMessage, PasswordField, Status, SubmitButton, guard } from "./ui";

export function UpdatePassword() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthErrorKind | null>(auth.configured ? null : "notConfigured");

  useEffect(() => {
    if (!auth.configured || auth.stub) {
      setReady(true);
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (params.get("error") || (!code && !auth.loading && !auth.session)) {
      setExpired(true);
      return;
    }
    if (!code) {
      if (!auth.loading) setReady(true);
      return;
    }
    let active = true;
    exchangeCodeOnce(code).then(({ error }) => {
      if (!active) return;
      // Remove the one-time code from the address bar and history.
      window.history.replaceState(null, "", window.location.pathname);
      if (error) setExpired(true);
      else setReady(true);
    });
    return () => {
      active = false;
    };
  }, [auth.configured, auth.stub, auth.loading, auth.session]);

  const submit = guard(busy, async () => {
    setBusy(true);
    setError(null);
    const { error } = await auth.updatePassword(password);
    setBusy(false);
    setPassword("");
    if (error) {
      setError(error);
      return;
    }
    navigate(authPaths.home, { replace: true, state: { notice: "passwordSaved" } });
  });

  if (expired) {
    return (
      <AuthPage title={authCopy.error.linkExpired}>
        <p>
          <Link to={authPaths.forgotPassword}>{authCopy.forgot.button}</Link>
        </p>
        <p>
          <Link to={authPaths.signIn}>{authCopy.backToLogin}</Link>
        </p>
      </AuthPage>
    );
  }

  if (!ready) {
    return (
      <AuthPage title={authCopy.update.title}>
        <Status>{authCopy.loading}</Status>
      </AuthPage>
    );
  }

  return (
    <AuthPage title={authCopy.update.title}>
      <ErrorMessage kind={error} />
      <form onSubmit={submit} noValidate>
        <PasswordField value={password} onChange={setPassword} readOnly={busy} isNew label={authCopy.newPasswordLabel} />
        <SubmitButton busy={busy} label={authCopy.update.button} busyLabel={authCopy.update.busy} />
      </form>
    </AuthPage>
  );
}

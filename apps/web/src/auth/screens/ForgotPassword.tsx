import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../AuthProvider";
import { authCopy } from "../copy";
import { authPaths, type AuthErrorKind } from "../helpers";
import { AuthPage, EmailField, ErrorMessage, SubmitButton, guard } from "./ui";

export function ForgotPassword() {
  const auth = useAuth();
  const location = useLocation();
  const prefill = (location.state as { email?: unknown } | null)?.email;
  const [email, setEmail] = useState(typeof prefill === "string" ? prefill : "");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<AuthErrorKind | null>(auth.configured ? null : "notConfigured");

  const submit = guard(busy, async () => {
    setBusy(true);
    setError(null);
    const address = email.trim();
    const { error } = await auth.resetPassword(address);
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    // Shown for any email, so nobody can probe for accounts.
    setSentTo(address);
  });

  if (sentTo !== null) {
    return (
      <AuthPage title={authCopy.checkEmail.title}>
        <p role="status">{authCopy.checkEmail.resetBody(sentTo)}</p>
        <p>
          <Link to={authPaths.signIn}>{authCopy.backToLogin}</Link>
        </p>
      </AuthPage>
    );
  }

  return (
    <AuthPage title={authCopy.forgot.title}>
      <p>{authCopy.forgot.body}</p>
      <ErrorMessage kind={error} />
      <form onSubmit={submit} noValidate>
        <EmailField value={email} onChange={setEmail} readOnly={busy} />
        <SubmitButton busy={busy} label={authCopy.forgot.button} busyLabel={authCopy.forgot.busy} />
      </form>
      <p>
        <Link to={authPaths.signIn}>{authCopy.backToLogin}</Link>
      </p>
    </AuthPage>
  );
}

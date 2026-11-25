import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthProvider";
import { authCopy } from "../copy";
import { authPaths, safeNext, type AuthErrorKind } from "../helpers";
import { AuthPage, Divider, EmailField, ErrorMessage, GoogleButton, PasswordField, Status, SubmitButton, guard } from "./ui";

export function SignIn() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = safeNext((location.state as { from?: unknown } | null)?.from);
  const notice = (location.state as { notice?: unknown } | null)?.notice;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthErrorKind | null>(auth.configured ? null : "notConfigured");

  const submit = guard(busy, async () => {
    setBusy(true);
    setError(null);
    const { error } = await auth.signIn(email.trim(), password);
    setBusy(false);
    if (error) {
      setPassword("");
      setError(error);
      return;
    }
    navigate(from, { replace: true });
  });

  const google = async () => {
    setError(null);
    const { error } = await auth.signInWithGoogle();
    if (error) setError(error);
  };

  return (
    <AuthPage title={authCopy.signIn.title}>
      {notice === "loggedOut" ? <Status>You're logged out.</Status> : null}
      <ErrorMessage kind={error} />
      <GoogleButton onClick={google} disabled={busy || !auth.configured} />
      <Divider />
      <form onSubmit={submit} noValidate>
        <EmailField value={email} onChange={setEmail} readOnly={busy} login />
        <PasswordField value={password} onChange={setPassword} readOnly={busy} />
        <p>
          <Link to={authPaths.forgotPassword} state={{ email }}>
            {authCopy.signIn.forgot}
          </Link>
        </p>
        <SubmitButton busy={busy} label={authCopy.signIn.button} busyLabel={authCopy.signIn.busy} />
      </form>
      <p>
        <Link to={authPaths.signUp}>{authCopy.signIn.toSignUp}</Link>
      </p>
    </AuthPage>
  );
}

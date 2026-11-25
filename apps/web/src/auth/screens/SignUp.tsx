import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthProvider";
import { authCopy } from "../copy";
import { authPaths, type AuthErrorKind } from "../helpers";
import { AuthPage, Divider, EmailField, ErrorMessage, GoogleButton, PasswordField, SubmitButton, guard } from "./ui";

export function SignUp() {
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<AuthErrorKind | null>(auth.configured ? null : "notConfigured");

  const submit = guard(busy, async () => {
    setBusy(true);
    setError(null);
    const address = email.trim();
    const { error } = await auth.signUp(address, password);
    setBusy(false);
    setPassword("");
    if (error) {
      setError(error);
      return;
    }
    // Same screen for new and existing emails.
    setSentTo(address);
  });

  const google = async () => {
    setError(null);
    const { error } = await auth.signInWithGoogle();
    if (error) setError(error);
  };

  if (sentTo !== null) {
    return (
      <AuthPage title={authCopy.checkEmail.title}>
        <p role="status">{authCopy.checkEmail.signUpBody(sentTo)}</p>
        <p>
          <Link to={authPaths.signIn}>{authCopy.backToLogin}</Link>
        </p>
      </AuthPage>
    );
  }

  return (
    <AuthPage title={authCopy.signUp.title}>
      <ErrorMessage kind={error} />
      <GoogleButton onClick={google} disabled={busy || !auth.configured} />
      <Divider />
      <form onSubmit={submit} noValidate>
        <EmailField value={email} onChange={setEmail} readOnly={busy} />
        <PasswordField value={password} onChange={setPassword} readOnly={busy} isNew />
        <SubmitButton busy={busy} label={authCopy.signUp.button} busyLabel={authCopy.signUp.busy} />
      </form>
      <p>
        <Link to={authPaths.signIn}>{authCopy.signUp.toSignIn}</Link>
      </p>
    </AuthPage>
  );
}

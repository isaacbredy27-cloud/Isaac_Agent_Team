// aal1 → aal2 for a super_admin with a verified factor. Continue the sign-in; never log out on aal1.
import { useState } from "react";
import { useAuth } from "../AuthProvider";
import { authCopy } from "../copy";
import type { AuthErrorKind } from "../helpers";
import { AuthPage, CodeField, ErrorMessage, SubmitButton, guard } from "./ui";

export function MfaChallenge({ onDone }: { onDone?: () => void }) {
  const auth = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthErrorKind | null>(null);

  const submit = guard(busy, async () => {
    setBusy(true);
    setError(null);
    const { error } = await auth.mfaVerify(code);
    setBusy(false);
    setCode("");
    if (error) setError(error);
    else onDone?.();
  });

  return (
    <AuthPage title={authCopy.mfaChallenge.title}>
      <p>{authCopy.mfaChallenge.body}</p>
      <ErrorMessage kind={error} />
      <form onSubmit={submit} noValidate>
        <CodeField value={code} onChange={setCode} readOnly={busy} />
        <SubmitButton busy={busy} label={authCopy.mfaChallenge.button} busyLabel={authCopy.mfaChallenge.busy} />
      </form>
      <p>
        <button type="button" className="button" onClick={() => void auth.signOut()}>
          {authCopy.logOut}
        </button>
      </p>
    </AuthPage>
  );
}

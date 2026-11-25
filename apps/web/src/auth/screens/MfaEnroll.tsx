// super_admin without a verified TOTP factor. Full page, no skip. Steps: scan → code → done.
import { useEffect, useState } from "react";
import { useAuth, type TotpEnrollment } from "../AuthProvider";
import { authCopy } from "../copy";
import type { AuthErrorKind } from "../helpers";
import { AuthPage, CodeField, ErrorMessage, Status, SubmitButton, guard } from "./ui";

const groupsOfFour = (s: string) => s.replace(/(.{4})(?=.)/g, "$1 ");

export function MfaEnroll({ onDone }: { onDone?: () => void }) {
  const auth = useAuth();
  const [step, setStep] = useState<"scan" | "code" | "done">("scan");
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<AuthErrorKind | null>(null);

  useEffect(() => {
    let active = true;
    auth.mfaEnroll().then((r) => {
      if (!active) return;
      if (r.error || !r.enrollment) setError(r.error ?? "generic");
      else setEnrollment(r.enrollment);
    });
    return () => {
      active = false;
    };
    // Enrol once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verify = guard(busy, async () => {
    if (!enrollment) return;
    setBusy(true);
    setError(null);
    const { error } = await auth.mfaVerify(code, enrollment.factorId);
    setBusy(false);
    setCode("");
    if (error) setError(error);
    else setStep("done");
  });

  const copySecret = async () => {
    if (!enrollment) return;
    try {
      await navigator.clipboard.writeText(enrollment.secret);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const logOut = (
    <p>
      <button type="button" className="button" onClick={() => void auth.signOut()}>
        {authCopy.logOut}
      </button>
    </p>
  );

  if (step === "done") {
    return (
      <AuthPage title={authCopy.mfaEnroll.doneTitle}>
        <button type="button" className="button button-primary" onClick={() => onDone?.()}>
          {authCopy.mfaEnroll.doneButton}
        </button>
      </AuthPage>
    );
  }

  if (step === "code") {
    return (
      <AuthPage title={authCopy.mfaEnroll.title}>
        <ErrorMessage kind={error} />
        <form onSubmit={verify} noValidate>
          <CodeField value={code} onChange={setCode} readOnly={busy} />
          <SubmitButton busy={busy} label={authCopy.mfaEnroll.verify} busyLabel={authCopy.mfaEnroll.busy} />
        </form>
        <p>
          <button type="button" className="button" onClick={() => setStep("scan")}>
            {authCopy.mfaEnroll.back}
          </button>
        </p>
        {logOut}
      </AuthPage>
    );
  }

  return (
    <AuthPage title={authCopy.mfaEnroll.title}>
      <ErrorMessage kind={error} />
      {enrollment ? (
        <>
          <p>{authCopy.mfaEnroll.scan}</p>
          {enrollment.qrCode ? <img src={enrollment.qrCode} alt={authCopy.mfaEnroll.qrAlt} width={200} height={200} /> : null}
          <div className="field">
            <label htmlFor="mfa-secret">{authCopy.mfaEnroll.manual}</label>
            <input id="mfa-secret" className="mono" readOnly value={groupsOfFour(enrollment.secret)} autoComplete="off" spellCheck={false} />
          </div>
          <button type="button" className="button" onClick={() => void copySecret()}>
            {authCopy.mfaEnroll.copy}
          </button>
          {copied ? <Status>{authCopy.mfaEnroll.copied}</Status> : null}
          <button type="button" className="button button-primary" onClick={() => setStep("code")}>
            {authCopy.mfaEnroll.next}
          </button>
        </>
      ) : error ? null : (
        <Status>{authCopy.loading}</Status>
      )}
      {logOut}
    </AuthPage>
  );
}

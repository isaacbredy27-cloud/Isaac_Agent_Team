// Step-up before Approve: a fresh TOTP check puts totp at amr[0] with a new timestamp.
// The Function checks amr[0].method === 'totp' and now - timestamp <= 600 s. The UI cannot bypass it.
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../AuthProvider";
import { authCopy } from "../copy";
import type { AuthErrorKind } from "../helpers";
import { CodeField, ErrorMessage, SubmitButton, guard } from "./ui";

export interface StepUpSheetProps {
  open: boolean;
  /** Called after verify. Then call getAccessToken() for the fresh token. */
  onDone(): void;
  onCancel(): void;
}

export function StepUpSheet({ open, onDone, onCancel }: StepUpSheetProps) {
  const auth = useAuth();
  const dialog = useRef<HTMLDialogElement>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthErrorKind | null>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      setCode("");
      setError(null);
      if (typeof d.showModal === "function") d.showModal();
      else d.setAttribute("open", "");
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  const submit = guard(busy, async () => {
    setBusy(true);
    setError(null);
    const { error } = await auth.mfaVerify(code);
    setBusy(false);
    setCode("");
    if (error) setError(error);
    else onDone();
  });

  return (
    <dialog
      ref={dialog}
      className="card sheet"
      aria-labelledby="stepup-title"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <h2 id="stepup-title">{authCopy.stepUp.title}</h2>
      <p>{authCopy.stepUp.body}</p>
      <ErrorMessage kind={error} />
      <form onSubmit={submit} noValidate>
        <CodeField value={code} onChange={setCode} readOnly={busy} />
        <SubmitButton busy={busy} label={authCopy.stepUp.button} busyLabel={authCopy.stepUp.busy} />
        <button type="button" className="button" onClick={onCancel}>
          {authCopy.stepUp.cancel}
        </button>
      </form>
    </dialog>
  );
}

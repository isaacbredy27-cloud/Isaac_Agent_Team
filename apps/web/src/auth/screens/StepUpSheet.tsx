// Step-up before Approve: a fresh TOTP check puts totp at amr[0] with a new timestamp.
// The Function checks amr[0].method === 'totp' and now - timestamp <= 600 s. The UI cannot bypass it.
// Uses the design system Sheet (Sable): grabber, focus trap, Escape and backdrop close, focus restore.
import { useState } from "react";
import { Button, Sheet } from "../../design/components";
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
  return (
    <Sheet open={open} title={authCopy.stepUp.title} onClose={onCancel} closeLabel={authCopy.stepUp.cancel}>
      {/* Sheet unmounts its children when closed, so each open starts with an empty code. */}
      <StepUpForm onDone={onDone} onCancel={onCancel} />
    </Sheet>
  );
}

function StepUpForm({ onDone, onCancel }: Omit<StepUpSheetProps, "open">) {
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
    else onDone();
  });

  return (
    <>
      <p>{authCopy.stepUp.body}</p>
      <ErrorMessage kind={error} />
      <form onSubmit={submit} noValidate>
        <CodeField value={code} onChange={setCode} readOnly={busy} />
        <div className="row">
          <Button variant="secondary" onClick={onCancel}>
            {authCopy.stepUp.cancel}
          </Button>
          <SubmitButton busy={busy} label={authCopy.stepUp.button} busyLabel={authCopy.stepUp.busy} />
        </div>
      </form>
    </>
  );
}

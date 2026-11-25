import { useEffect, useState } from "react";
import { Button, Card } from "../design/components";
import { copy } from "../content/copy";

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
}

const DISMISS_KEY = "fmo.installDismissed";

/** Android: capture beforeinstallprompt. iOS Safari: show Share instructions. Hidden when installed. Shown only after a profile exists. */
export function InstallHint({ enabled }: { enabled: boolean }) {
  const [evt, setEvt] = useState<InstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === "1");
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const standalone = window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && navigator.standalone === true);
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (!enabled || standalone || dismissed || (!evt && !ios)) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };
  return (
    <Card as="section" aria-labelledby="install-title">
      <div className="stack">
        <h2 id="install-title">{copy.install.title}</h2>
        <p>{copy.install.body}</p>
        {evt ? (
          <Button
            onClick={() => {
              void evt.prompt();
              setEvt(null);
            }}
          >
            {copy.install.action}
          </Button>
        ) : (
          <p>{copy.install.ios}</p>
        )}
        <Button variant="ghost" onClick={dismiss}>
          {copy.install.dismiss}
        </Button>
      </div>
    </Card>
  );
}

// Browser snippet (not run by Node): in-app install UX for Android and iOS. See docs/install-prompts-ios-android.md.
let deferredPrompt = null;
const isStandalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

window.addEventListener("beforeinstallprompt", (e) => {   // Chromium only
  e.preventDefault();
  deferredPrompt = e;
  document.querySelector("#install").hidden = false;
});
document.querySelector("#install")?.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;      // 'accepted' | 'dismissed'
  deferredPrompt = null;                                      // single use
  document.querySelector("#install").hidden = true;
  console.info("install outcome", outcome);
});
window.addEventListener("appinstalled", () => { deferredPrompt = null; });

// iOS has no beforeinstallprompt: show instructions after the first successful match, only in a browser tab.
export function maybeShowIOSInstructions(firstMatchShown) {
  if (isIOS() && !isStandalone() && firstMatchShown) document.querySelector("#ios-install-sheet")?.showModal();
}

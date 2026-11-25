# Install prompts on Android and iOS — notes

Sources (read 2026-11-24/25): https://web.dev/learn/pwa/installation-prompt · https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable · https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/ · https://firt.dev/notes/pwa-ios/ · https://developer.chrome.com/blog/update-install-criteria

## Android / Chromium (web.dev)
```js
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();          // stop the default mini-infobar
  deferredPrompt = e;          // keep it for later
  showInAppInstallPromotion();
});
installButton.addEventListener('click', async () => {
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;   // 'accepted' | 'dismissed'
  deferredPrompt = null;       // can only be used once
});
```
- "If the browser doesn't support the beforeinstallprompt or the event does not fire, there is no other way to trigger the browser's installation prompt."
- Chrome 108 (Android) / 112 (desktop) no longer require a `fetch` handler for menu installs.

## iOS / iPadOS
- MDN: "On iOS 16.3 and earlier, PWAs can only be installed with Safari. On iOS 16.4 and later, PWAs can be installed from the Share menu in Safari, Chrome, Edge, Firefox, and Orion." `beforeinstallprompt` "is not supported on iOS".
- Show manual instructions only in browser mode:
  ```css
  #installInstructions { display: none }
  @media (display-mode: browser) { #installInstructions { display: block } }
  ```
- WebKit (16.4): Web Push for Home Screen web apps, after a user gesture; Badging API; manifest `id`. `apple-touch-icon` takes precedence over manifest icons.
- firt.dev: since iOS/iPadOS 26, every site added to the Home Screen opens as a web app by default, even without a manifest; Safari ignores SVG for Home Screen icons.

## Testing
Lighthouse 12 removed the PWA category. Use DevTools → Application → Manifest → Installability, or CDP `Page.getInstallabilityErrors`.

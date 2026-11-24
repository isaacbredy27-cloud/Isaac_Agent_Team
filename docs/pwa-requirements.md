# Progressive Web App Requirements

Research date: 2026-11-24. Goal: an app people can install on iPhone and Android, with useful offline behaviour.

## 1. Installability

### 1.1 Requirements (MDN)

The manifest must include:

- `name` or `short_name`
- `icons` with a **192 px** and a **512 px** icon
- `start_url`
- `display` and/or `display_override`
- `prefer_related_applications` set to `false` or absent

The site must be served over **HTTPS** (or `localhost` during development). MDN notes this is stricter than a secure context, because `file://` does not count.

MDN: a service worker is "not a requirement for a PWA to be installable". Chrome dropped the `fetch`-handler requirement for menu installs in Chrome 108 (Android) and 112 (desktop). We still ship a service worker, for offline support.

### 1.2 Platform behaviour

| Platform | How users install | Notes |
|---|---|---|
| Android (Chrome, Edge, Samsung Internet) | Browser install prompt or menu; app can trigger prompt via `beforeinstallprompt` | Android shows `description` and `screenshots` from the manifest in the install dialog |
| iOS / iPadOS 16.4+ | Share menu → Add to Home Screen, in Safari, Chrome, Edge, Firefox, Orion | No `beforeinstallprompt`. Show our own instructions. |
| iOS / iPadOS 26+ | Same | Every Home Screen site opens as a web app by default, even without a manifest (per firt.dev) |
| Desktop Chrome/Edge | Address-bar install icon or in-app button | Not a launch target, but free |

### 1.3 Manifest

`public/manifest.webmanifest`:

```json
{
  "id": "/",
  "name": "Finance Match Orlando",
  "short_name": "FinMatch",
  "description": "Rank Orlando finance jobs by how well they fit your resume.",
  "start_url": "/?source=pwa",
  "scope": "/",
  "display": "standalone",
  "background_color": "#0B1F33",
  "theme_color": "#0B1F33",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "screenshots": [
    { "src": "/screens/dashboard-mobile.png", "sizes": "1080x1920", "type": "image/png", "form_factor": "narrow" }
  ],
  "prefer_related_applications": false
}
```

### 1.4 Icons and splash screens

- Design the master icon at **1024×1024**, transparent background (MDN).
- Maskable icon: keep the logo inside the safe zone, a circle 80% of the icon's width (MDN).
- iOS: add `<link rel="apple-touch-icon" href="/icons/apple-touch-icon-180.png">`. It overrides manifest icons on iOS. Use PNG, not SVG; Safari ignores SVG for Home Screen icons.
- Android builds the splash screen from `name`, `background_color` and the icon.
- iOS splash: iOS 26 uses the manifest. For older iOS, optional `apple-touch-startup-image` links per device size. Low priority.

### 1.5 Install prompt UX

Android / Chromium:

```ts
let deferred: BeforeInstallPromptEvent | null = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();          // hold the prompt
  deferred = e as BeforeInstallPromptEvent;
  showInstallButton();
});
installButton.onclick = async () => {
  await deferred?.prompt();
  deferred = null;
  hideInstallButton();
};
window.addEventListener("appinstalled", () => track("pwa_installed"));
```

iOS: detect iOS Safari without standalone mode (`!matchMedia("(display-mode: standalone)").matches`). Show a dismissible sheet: "Tap Share, then Add to Home Screen". Show it after the first successful resume match, not on first visit.

## 2. Service worker

### 2.1 Lifecycle

- **install:** precache the app shell (HTML, JS, CSS, icons, offline page).
- **activate:** delete old cache versions. MDN: "A PWA should clean up any old versions of its cache in the service worker's activate event."
- **fetch:** route requests by strategy (below).

Chrome may stop an idle worker after 30 seconds, and caps `waitUntil()` promises at 5 minutes. Keep worker work short.

### 2.2 Caching strategies

| Request | Strategy | Reason |
|---|---|---|
| App shell (built JS/CSS with hashed names, icons, fonts) | Precache / cache first | MDN: for resources "certain to need" and unchanged per version |
| `/api/jobs` list | Stale-while-revalidate | Fast list; refresh in background. Freshness matters but is not critical. |
| `/api/jobs/:id` detail | Network first, cache fallback | Want latest status (open/closed) |
| `/api/match/*` scores and explanations | Network first, cache fallback | Personal data; show last known when offline |
| `/api/agents/*`, `/api/admin/*`, `/api/resume/upload` | Network only, never cached | Sensitive or write operations |
| Anything with `Authorization` header | Network only | Avoid caching personal data in shared caches |

Use Workbox (generated at build) or a small hand-written router. Workbox saves time and handles cache expiration.

### 2.3 Offline capabilities

- Offline page for navigations that fail.
- Saved opportunities stored in IndexedDB. Readable offline.
- Last job list and last match results readable offline, with an "as of" timestamp.
- Resume upload and agent chat require a connection. Say so plainly.

### 2.4 Updates

- Version caches as `shell-v{buildId}`.
- On a new worker, show "Update available — Reload". Call `skipWaiting()` only after the user taps.

### 2.5 Storage

MDN: caches have limited space and the browser may evict data; eviction is rare. Call `navigator.storage.persist()` after install to request persistent storage. Keep cached personal data small.

## 3. Optional capabilities

| Capability | Android | iOS | Use in this app |
|---|---|---|---|
| Web Push | Yes | 16.4+, only for Home Screen apps, after a user gesture | "New Green match" alerts (phase 2) |
| Badging API | Yes | 16.4+, installed apps only | Count of new Green matches |
| Background Sync | Chromium only | No | Retry saving an opportunity made offline |
| Periodic Background Sync | Chromium only, engagement-gated | No | Not relied on |

Push needs a VAPID key pair (private key in Netlify env) and a subscription store. Allow `*.push.apple.com` for Apple endpoints.

## 4. When to use a native wrapper (Capacitor)

A standard PWA is enough for phase 1. Every core feature (upload, list, filter, save, chat) works on the web.

Consider Capacitor when one of these becomes a firm requirement:

- App Store / Play Store discovery is a growth channel.
- Reliable background job alerts on iOS outside Home Screen install.
- Native file pickers from cloud drives beyond what the web file input offers.
- Biometric login (Face ID) for the admin console.
- Enterprise distribution (MDM).

Costs of Capacitor: store review, Apple developer fee, two release pipelines, and App Store rules on apps that are "just a website". Recommendation: **ship PWA first, revisit after 3 months of usage data.**

## 5. Acceptance criteria

- Chrome DevTools → Application → Manifest shows no installability errors.
- `Page.getInstallabilityErrors` (DevTools Protocol) returns an empty list in CI.
- Installs and launches standalone on: iPhone (iOS 18 and 26, Safari), Android (Chrome current).
- Maskable icon looks correct in DevTools safe-area preview.
- With network off, the installed app opens, shows saved jobs and the last list.
- No personal API response is stored by the service worker except match results under `/api/match/*`, and those are cleared on sign-out.

## Sources

- MDN, Making PWAs installable. https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- MDN, Caching. https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching
- MDN, Offline and background operation. https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation
- MDN, Define your app icons. https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Define_app_icons
- MDN, Trigger installation from your PWA. https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Trigger_install_prompt
- WebKit, Web Push for Web Apps on iOS and iPadOS. https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- Maximiliano Firtman, iOS PWA Compatibility notes. https://firt.dev/notes/pwa-ios/
- Chrome for Developers, Revisiting Chrome's installability criteria. https://developer.chrome.com/blog/update-install-criteria

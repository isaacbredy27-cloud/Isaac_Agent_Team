---
name: pwa-installability
description: Making Finance Match Orlando installable on iPhone and Android — manifest members, 192/512 and maskable icons, apple-touch-icon, HTTPS, beforeinstallprompt on Chromium, Add to Home Screen instructions on iOS, display-mode detection, and how to verify. Use for manifest, icons, splash or install-UX work.
metadata:
  owner: mobile-pwa-expert
  backups: [ux-designer-apple-hig, netlify-engineer]
  version: 1.0.0
---

# PWA Installability

## Inputs → Outputs
- Inputs: Manifest, icons, served site.
- Outputs: Installable app on Android and iOS; CI installability check.

## Purpose
Let users install the app from the browser on Android and iOS.

## Use when
- Editing `manifest.webmanifest`, icons, or install UI.
- An install bug is reported.

## Requirements (MDN)
- Manifest with `name` or `short_name`; `icons` incl. **192 px and 512 px**; `start_url`; `display` and/or `display_override`; `prefer_related_applications` false/absent.
- Served over **HTTPS** (or localhost).
- Link it: `<link rel="manifest" href="/manifest.webmanifest">`; serve as `application/manifest+json`.
- A service worker is not required for installability, but we ship one for offline.

## Platform behaviour
| Platform | Install path | Our UX |
|---|---|---|
| Android/Chromium | `beforeinstallprompt` | Capture, `preventDefault()`, show our button, call `prompt()` once, read `userChoice` |
| iOS/iPadOS 16.4+ | Share → Add to Home Screen (Safari, Chrome, Edge, Firefox, Orion) | Show instructions sheet only in `display-mode: browser` |
| iOS 26+ | Home Screen sites open as web apps by default | Same sheet |

## Icons
- Master 1024×1024. Maskable 512×512 with logo inside the central 80% circle (web.dev: radius 40%).
- `apple-touch-icon` 180×180 PNG overrides manifest icons on iOS; Safari ignores SVG for Home Screen.
- `short_name` ≤ 12 chars ("FinMatch").

## Checklist
- [ ] DevTools → Application → Manifest: no installability errors
- [ ] `Page.getInstallabilityErrors` empty in CI (Lighthouse 12 removed the PWA category)
- [ ] Install button hidden in standalone mode
- [ ] iOS sheet appears only on iOS browser mode, after first successful match
- [ ] Manual install on iPhone (iOS 18 and 26) and Android Chrome before release

## Common mistakes
- Prompting on first visit (users dismiss; the event can be used only once).
- Relying on `beforeinstallprompt` on iOS (never fires).
- Maskable icon with logo touching the edges.

## Best practices
- Prompt after value is shown
- Hide install UI in standalone mode
- Test on real devices each release

## References
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest
- https://web.dev/learn/pwa/installation-prompt
- https://web.dev/learn/pwa/web-app-manifest
- https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/

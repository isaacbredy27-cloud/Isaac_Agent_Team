# Installability and the web app manifest — notes

Sources (read 2026-11-24/25): https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable · https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest · https://web.dev/learn/pwa/web-app-manifest · https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Define_app_icons

## Required manifest members (MDN)
- `name` or `short_name`
- `icons` — must contain a 192px and a 512px icon
- `start_url`
- `display` and/or `display_override`
- `prefer_related_applications` must be `false` or not present

## Serving
- "For a PWA to be installable it must be served using the https protocol, or from a local development environment using localhost or 127.0.0.1." Stricter than secure context (`file://` doesn't count).
- Link: `<link rel="manifest" href="manifest.json" />`. Extension `.webmanifest`; response `Content-Type: application/manifest+json` (browsers also accept `.json`).
- Service worker: "While not a requirement for a PWA to be installable, many PWAs use service workers to provide an offline experience."

## Icons (MDN + web.dev)
- Master icon at least 1024×1024, transparent background.
- If only one size: 512×512; also provide 192, 384, 1024.
- Maskable: `purpose: "maskable"`; safe zone is a centered circle with diameter 80% (radius 40%) of the icon; ≥ 512×512. `"any maskable"` allowed.
- `short_name`: keep under 12 characters.

## Other members (web.dev)
- `theme_color`: window/status bar color; overridable by `<meta name="theme-color">`.
- `background_color`: placeholder before CSS loads — "Safari on iOS and iPadOS and most desktop browsers currently ignore this field."
- `scope`: navigation scope (does not change service worker scope).
- "Safari on iOS and iPadOS … doesn't use the web app manifest to generate splash screens."

## Install prompt text (MDN)
On Android only, `description` and `screenshots` appear in the install prompt.

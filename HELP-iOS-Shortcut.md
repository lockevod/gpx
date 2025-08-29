# CycleWeather – GPX ingest via iOS Shortcut (PWA-friendly)

This web app can load a GPX without using the file picker by accepting the GPX content (or a link) in the URL. This is ideal for iOS PWAs, where Share Sheet → PWA is not supported.

Your deployed URL (example): https://your-pages-site.example/app/  
Replace it below with your own (GitHub Pages/Spaces URL).

## Supported ingest methods

1) URL/hash/query parameters (no server needed)
- Inline GPX (Base64-URL or URL-encoded text):
  - https://your-pages-site/#name=My%20Ride&gpx=BASE64URL
  - https://your-pages-site/?name=My%20Ride&gpx=BASE64URL
  - The app also accepts URL-encoded GPX in gpx (not recommended for large files).
- Remote GPX (CORS must allow it):
  - https://your-pages-site/#name=My%20Ride&gpx_url=https://host/path/route.gpx
  - https://your-pages-site/?name=My%20Ride&gpx_url=https://host/path/route.gpx

Notes
- Base64URL means Base64 with replacements: + → -, / → _, remove trailing = (the loader tolerates either style and will normalize).
- Very large inline URLs may fail in Safari; prefer gpx_url for big files (if CORS allows) or keep GPX small.

2) postMessage bridge (optional)
- The app listens for:
```js
window.postMessage({ type: "cw-gpx", name: "Ride name", gpx: "<gpx ...>...</gpx>" }, "*");
```
- Use only if your Shortcut opens the PWA and injects JS into that page (advanced).

## What the app does with the payload
- It waits for the app to initialize, then:
  - If gpx_url is present → fetches it → loads GPX.
  - Else if gpx is present → attempts Base64 decode; if not, uses the text as URL-decoded GPX → loads GPX.
- The route name is taken from name when present, otherwise from GPX metadata.

## iOS Shortcut recipes

Below are two recommended Shortcuts that open your PWA and pass the route.

Replace PWA_URL with your deployed URL, e.g.:  
PWA_URL = https://your-pages-site.example/app/

### A) Share Sheet: “Open GPX in CycleWeather”
Use this to open .gpx files shared from Files/other apps.

Steps (actions)
1. Receive Shortcut Input
   - Accepts: Files (extensions: gpx)
   - Show in Share Sheet: On
2. Get Name from Shortcut Input
   - If Input is a list, use first item (or loop if you prefer).
3. Get Contents of File
   - File: Shortcut Input
   - As: Text
4. Encode
   - Text: (result of previous step)
   - Encoding: Base64
5. Replace Text (make Base64 URL-safe)
   - Find: +
   - Replace: -
6. Replace Text
   - Find: /
   - Replace: _
7. Replace Text
   - Find: =
   - Replace: (leave empty)
8. URL Encode
   - Text: Name from step 2 (to use as name)
9. Text
   - Build the final URL (use a Text action with variables):
```
PWA_URL#name=[[Encoded Name]]&gpx=[[Base64URL]]
```
10. Open URLs
   - URL: the Text from step 9

Tips
- If the file is large and fails to open, consider using the “From URL” recipe below or host the file and pass gpx_url.

### B) From a GPX URL: “Open GPX URL in CycleWeather”
Use when you have a direct GPX link (with proper CORS).

Steps (actions)
1. Ask for Input (Text)
   - Prompt: Paste GPX URL
2. Ask for Input (Text)
   - Prompt: Route name (optional)
3. URL Encode
   - Text: name (from step 2, default to “Shared route” if empty)
4. Text
   - Build:
```
PWA_URL#name=[[Encoded Name]]&gpx_url=[[GPX URL]]
```
5. Open URLs
   - URL: the Text from step 4

Notes
- If the remote server does not send permissive CORS headers (Access-Control-Allow-Origin), iOS may block the fetch. In that case use the Share Sheet recipe to inline the GPX.

## Minimal examples

- Inline GPX (URL-encoded text, tiny sample):
```
https://your-pages-site/#name=Test%20Route&gpx=%3Cgpx%20version%3D%221.1%22%20creator%3D%22x%22%3E%3Ctrk%3E%3Ctrkseg%3E%3Ctrkpt%20lat%3D%2241.0%22%20lon%3D%222.0%22/%3E%3Ctrkpt%20lat%3D%2241.01%22%20lon%3D%222.02%22/%3E%3C/trkseg%3E%3C/trk%3E%3C/gpx%3E
```

- Remote GPX:
```
https://your-pages-site/#name=Morning%20Ride&gpx_url=https://example.com/route.gpx
```

## Troubleshooting

- Blank map after opening:
  - Ensure the URL has either gpx or gpx_url parameter.
  - If using gpx_url, check browser console for CORS errors.
- Very long URLs fail to open:
  - Safari/iOS may reject very long URLs. Prefer gpx_url or smaller GPX files.
- Wrong route name:
  - Make sure you URL-encode the name in your Shortcut before concatenating.

## Security and privacy

- All processing happens client-side in the browser. Remote gpx_url is fetched by the browser; no server storage involved by this app.
- If using third-party hosting for GPX, confirm the link is trustworthy.

---
Happy riding!

(function () {
  const until = (cond, { tries = 120, delay = 250 } = {}) =>
    new Promise((res) => {
      let n = 0;
      const t = setInterval(() => {
        if (cond()) { clearInterval(t); res(true); }
        else if (++n >= tries) { clearInterval(t); res(false); }
      }, delay);
    });

  function getParams() {
    const q = new URLSearchParams(window.location.search || "");
    const hstr = (window.location.hash || "").replace(/^#/, "");
    const h = new URLSearchParams(hstr);
    const get = (k) => h.get(k) ?? q.get(k) ?? null;
    return {
      gpx: get("gpx"),
      gpxUrl: get("gpx_url") || get("url"),
      name: get("name") || "Shared route"
    };
  }

  function tryDecodeBase64(b64) {
    try {
      // tolerate URL-safe base64
      const norm = b64.replace(/-/g, '+').replace(/_/g, '/');
      const txt = atob(norm);
      // decode as UTF-8
      const bytes = Uint8Array.from(txt, c => c.charCodeAt(0));
      return new TextDecoder("utf-8").decode(bytes);
    } catch { return null; }
  }

  function tryDecodeText(s) {
    try {
      const dec = decodeURIComponent(s);
      if (dec.includes("<gpx") || dec.startsWith("<")) return dec;
    } catch {}
    return s;
  }

  async function fetchText(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  }

  async function loadFromParams() {
    const { gpx, gpxUrl, name } = getParams();
    if (!gpx && !gpxUrl) return;

    await until(() => typeof window.cwLoadGPXFromString === "function");

    try {
      if (gpxUrl) {
        const txt = await fetchText(gpxUrl);
        window.cwLoadGPXFromString(txt, name);
        return;
      }

      // gpx payload: try base64 then URI/text
      let txt = tryDecodeBase64(gpx);
      if (!txt || !txt.includes("<gpx")) {
        txt = tryDecodeText(gpx);
      }
      if (!txt || !txt.includes("<gpx")) throw new Error("Invalid GPX payload");
      window.cwLoadGPXFromString(txt, name);
    } catch (e) {
      console.error("[ingest] GPX ingest error:", e);
      // no alert here to avoid interrupting PWA launch; devs can check console
    }
  }

  // Run once on load; Shortcuts usually open the URL with hash/query
  if (document.readyState === "complete" || document.readyState === "interactive") {
    loadFromParams();
  } else {
    window.addEventListener("DOMContentLoaded", loadFromParams, { once: true });
  }
})();

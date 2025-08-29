document.addEventListener("DOMContentLoaded", () => {
  let map;
  let trackLayer;
  let windMarkers = [];
  let weatherData = [];
  let rainMarkers = [];
  // removed stepMarkers; wind markers handle selection
  let selectedOriginalIdx = null;
  let viewOriginalIndexMap = [];
  let colIndexByOriginal = {};
  
  const cacheTTL = 1000 * 60 * 30; 
  const weatherIconsMap = {
    // Base existentes
    clearsky:      { day: "wi-day-sunny",           night: "wi-night-clear" },
    partlycloudy:  { day: "wi-day-sunny-overcast",  night: "wi-night-alt-partly-cloudy" },
    cloudy:        { day: "wi-cloudy",              night: "wi-cloudy" },
    drizzle:       { day: "wi-sprinkle",            night: "wi-sprinkle" },
    rain:          { day: "wi-rain",                night: "wi-night-alt-rain" },
    thunderstorm:  { day: "wi-day-thunderstorm",    night: "wi-night-alt-thunderstorm" },
    snow:          { day: "wi-day-snow",            night: "wi-night-alt-snow" },
    fog:           { day: "wi-day-fog",             night: "wi-night-fog" },
    default:       { day: "wi-na",                  night: "wi-na" },

    // Nuevos más específicos (usados en OM/MB y coherentes entre sí)
    overcast:      { day: "wi-day-cloudy",          night: "wi-night-alt-cloudy" },

    rain_light:    { day: "wi-day-showers",         night: "wi-night-alt-showers" },
    rain_heavy:    { day: "wi-rain",                night: "wi-night-alt-rain" },
    showers:       { day: "wi-showers",             night: "wi-night-alt-showers" },

    freezing_drizzle: { day: "wi-sleet",            night: "wi-night-alt-sleet" },
    freezing_rain:    { day: "wi-rain-mix",         night: "wi-night-alt-rain-mix" },
    sleet:            { day: "wi-sleet",            night: "wi-night-alt-sleet" },
    hail:             { day: "wi-day-hail",         night: "wi-night-alt-hail" },

    snow_light:    { day: "wi-day-snow",            night: "wi-night-alt-snow" },
    snow_heavy:    { day: "wi-snow-wind",           night: "wi-night-alt-snow" },
    snow_showers:  { day: "wi-day-snow",            night: "wi-night-alt-snow" },

    thunder_hail:  { day: "wi-storm-showers",       night: "wi-night-alt-storm-showers" }
  };
  
  const PRECIP_MIN = 0.1;  // ignora trazas <0.1 mm/h
  const PROB_MIN   = 20;   // muestra gota si prob >= 20%

  // NEW: provider horizons and day-to-ms constant
  const OPENMETEO_MAX_DAYS = 14;
  const METEOBLUE_MAX_DAYS = 7;
  const OPENWEATHER_MAX_DAYS = 2;
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  // Nuevo: traducciones minimalistas para UI y logs
  const i18n = {
    es: {
      config_saved: "Configuración guardada",
      config_loaded: "Configuración cargada",
      enter_meteoblue_key: "Introduzca API key MeteoBlue",
      missing_meteoblue_key: "Error: falta API Key MeteoBlue",
      error_http_step: "Error API paso {step}: HTTP {status}",
      error_api_step: "Error API paso {step}: {msg}",
      error_api: "Error API: {msg}",
      geojson_invalid: "Geojson inválido o vacío",
      track_too_short: "Pista demasiado corta",
      route_date_empty: "Fecha y hora ruta vacías o inválidas",
      route_date_invalid: "Fecha y hora ruta no válida: {val}",
      route_date_past: "Fecha/hora seleccionada anterior a la actual, usando fecha y hora actual",
      select_gpx: "Primero selecciona un archivo GPX.",
      error_reading_gpx: "Error leyendo GPX: {msg}",
      app_started: "App iniciada",
      route_prefix: "Ruta: ",
      upload_label: "Cargar fichero",
      // añadimos emoji para mantener los iconos del header
      toggle_config: "Configuración ⚙️",
      toggle_debug: "Depuración 🐞",
      close: "Cerrar",
      title: "🚴 CycleWeather",
      settings_title: "Ajustes",
      api_provider_changed: "Proveedor API cambiado a {prov}",
      // nuevas claves para labels/placeholders
      provider_label: "Proveedor:",
      api_key_label: "API Key MeteoBlue:",
      api_key_label_ow: "API Key OpenWeather:",
      language_label: "Idioma:",
      wind_units_label: "Unidades viento:",
      temp_units_label: "Unidades temperatura:",
      route_datetime_label: "Fecha y hora ruta:",
      cycling_speed_label: "Velocidad media (km/h):",
      interval_label: "Intervalo (minutos):",
      loading_text: "Cargando...",
      // NEW
      horizon_exceeded: "Fecha fuera de horizonte ({days} días). Algunos pasos no tendrán datos.",
      fallback_to_openmeteo: "La previsión supera {days} días; se usa Open‑Meteo como fallback.",
      // NEW: generic provider errors
      provider_key_missing: "{prov} requiere API Key.",
      provider_key_invalid: "API Key inválida para {prov}.",
      provider_quota_exceeded: "Cuota agotada o límite alcanzado en {prov}.",
      provider_http_error: "Error del proveedor {prov}: HTTP {status}.",
      // NEW
      fallback_due_error: "Error con {prov}; usando Open‑Meteo como fallback.",
      provider_disabled_after_errors: "{prov} deshabilitado tras errores repetidos.",
      // NEW: short fallback suffix to compose error+fallback messages
      fallback_short: "Fallback a Open‑Meteo.",
      // NEW: API key tester strings
      check_key: "Check",
      key_test_missing: "Introduzca primero la API Key.",
      key_testing: "Probando...",
      key_valid: "API Key válida.",
      key_invalid: "API Key inválida o prohibida.",
      key_quota: "Cuota agotada o límite alcanzado.",
      key_http_error: "Error HTTP {status}.",
      key_network_error: "Error de red: {msg}",
    },
    en: {
      config_saved: "Settings saved",
      config_loaded: "Settings loaded",
      enter_meteoblue_key: "Enter MeteoBlue API key",
      missing_meteoblue_key: "Error: missing MeteoBlue API key",
      error_http_step: "API error step {step}: HTTP {status}",
      error_api_step: "API error step {step}: {msg}",
      error_api: "API error: {msg}",
      geojson_invalid: "Invalid or empty GeoJSON",
      track_too_short: "Track too short",
      route_date_empty: "Route date/time empty or invalid",
      route_date_invalid: "Invalid route date/time: {val}",
      route_date_past: "Selected date/time is earlier than now, using current date/time",
      select_gpx: "Please select a GPX file first.",
      error_reading_gpx: "Error reading GPX: {msg}",
      app_started: "App started",
      route_prefix: "Route: ",
      upload_label: "Upload file",
      // añadimos emoji también para la versión en inglés
      toggle_config: "Config ⚙️",
      toggle_debug: "Debug 🐞",
      close: "Close",
      title: "🚴 CycleWeather",
      settings_title: "Settings",
      api_provider_changed: "API provider changed to {prov}",
      // new keys
      provider_label: "Provider:",
      api_key_label: "MeteoBlue API Key:",
      api_key_label_ow: "OpenWeather API Key:",
      language_label: "Language:",
      wind_units_label: "Wind units:",
      temp_units_label: "Temperature units:",
      route_datetime_label: "Route date/time:",
      cycling_speed_label: "Average speed (km/h):",
      interval_label: "Interval (minutes):",
      loading_text: "Loading...",
      // NEW
      horizon_exceeded: "Date beyond forecast horizon ({days} days). Some steps will have no data.",
      fallback_to_openmeteo: "Forecast exceeds {days} days; using Open‑Meteo as fallback.",
      // NEW: generic provider errors
      provider_key_missing: "{prov} requires an API Key.",
      provider_key_invalid: "Invalid API Key for {prov}.",
      provider_quota_exceeded: "Quota exceeded or rate limit reached on {prov}.",
      provider_http_error: "{prov} provider error: HTTP {status}.",
      // NEW
      fallback_due_error: "Error with {prov}; using Open‑Meteo as fallback.",
      provider_disabled_after_errors: "{prov} disabled after repeated errors.",
      // NEW: short fallback suffix to compose error+fallback messages
      fallback_short: "Fallback to Open‑Meteo.",
      // NEW: API key tester strings
      check_key: "Check",
      key_test_missing: "Enter the API Key first.",
      key_testing: "Testing...",
      key_valid: "API Key valid.",
      key_invalid: "Invalid or forbidden API Key.",
      key_quota: "Quota exceeded or rate limit reached.",
      key_http_error: "HTTP error {status}.",
      key_network_error: "Network error: {msg}",
    },
  };

  // NEW: MeteoBlue hourly pictocode -> internal category
  const MB_PICTO_TO_KEY = {
    1: 'clearsky',

    // Clear with some low/cirrus clouds -> partlycloudy
    2: 'partlycloudy', 3: 'partlycloudy', 4: 'partlycloudy',
    5: 'partlycloudy', 6: 'partlycloudy',

    // Partly cloudy (variants)
    7: 'partlycloudy', 8: 'partlycloudy', 9: 'partlycloudy',

    // Variable with possible storm clouds -> thunderstorm (identification purpose)
    10: 'thunderstorm', 11: 'thunderstorm', 12: 'thunderstorm',

    // Hazy/nebula -> fog
    13: 'fog', 14: 'fog', 15: 'fog',

    // Fog/low stratus (with/without cirrus)
    16: 'fog', 17: 'fog', 18: 'fog',

    // Mostly cloudy / overcast group
    19: 'overcast', 20: 'overcast', 21: 'overcast', 22: 'overcast',

    // Precip with cloudiness
    23: 'rain',          // cloudy with rain
    24: 'snow',          // cloudy with snow
    25: 'rain_heavy',    // cloudy with heavy rain
    26: 'snow_heavy',    // cloudy with heavy snow

    // Thunder-probable variants
    27: 'thunderstorm',          // rain, thunderstorms probable
    28: 'thunderstorm',          // light rain, thunderstorms probable
    29: 'thunderstorm',          // storm with heavy snow
    30: 'thunderstorm',          // heavy rain, thunderstorms probable

    // Mixed/transition types
    31: 'drizzle',       // mixed with drizzle
    32: 'snow',          // variable with snow
    33: 'rain_light',    // cloudy with light rain
    34: 'snow_light',    // cloudy with light snow
    35: 'sleet',         // mixed snow/rain

    // Not used
    36: 'default',
    37: 'default'
  };


  // NEW: restored helpers (translation, logs, settings, cache, dates, math, conversions)
  function t(key, vars = {}) {
    const lang = (getVal("language") || "es").toLowerCase();
    const dict = i18n[lang] || i18n["en"];
    let s = dict[key] || i18n["en"][key] || key;
    return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : ""));
  }
  function logDebug(msg, isError = false) {
    const d = document.getElementById("debugConsole");
    if (!d) return;
    const p = document.createElement("p");
    p.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    p.className = isError ? "error" : "info";
    d.appendChild(p);
    d.scrollTop = d.scrollHeight;
    if (isError) console.error(msg); else console.log(msg);
  }
  function saveSettings() {
    const settings = {
      language: getVal("language"),
      windUnits: getVal("windUnits"),
      tempUnits: getVal("tempUnits"),
      cyclingSpeed: Number(getVal("cyclingSpeed")),
      apiKey: getVal("apiKey"),
      apiKeyOW: getVal("apiKeyOW"),
      apiSource: getVal("apiSource"),
      datetimeRoute: getVal("datetimeRoute"),
      intervalSelect: getVal("intervalSelect"),
    };
    localStorage.setItem("cwSettings", JSON.stringify(settings));
    logDebug(t("config_saved"));
  }
  function loadSettings() {
    const s = JSON.parse(localStorage.getItem("cwSettings") || "{}");
    [
      "language","windUnits","tempUnits","cyclingSpeed",
      "apiKey","apiKeyOW","apiSource","datetimeRoute","intervalSelect",
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (s[id] != null && el) el.value = s[id];
    });
    if (s.apiSource) apiSource = s.apiSource;
    logDebug(t("config_loaded"));
    const csNum = Number(s.cyclingSpeed ?? document.getElementById("cyclingSpeed")?.value);
    lastAppliedSpeed = Number.isFinite(csNum) ? csNum : null;
  }
  function getVal(id) {
    const el = document.getElementById(id);
    return el ? el.value : null;
  }
  function getCache(key) {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      const obj = JSON.parse(item);
      if (!obj.timestamp) return null;
      if (Date.now() - obj.timestamp > cacheTTL) return null;
      return obj.data;
    } catch { return null; }
  }
  function setCache(key, data) {
    try { localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() })); } catch {}
  }
  function getValidatedDateTime() {
    const datetimeValue = getVal("datetimeRoute");
    const now = new Date();
    if (!datetimeValue) return roundUpToNextQuarterDate(now);
    const selected = new Date(datetimeValue);
    if (isNaN(selected.getTime())) return roundUpToNextQuarterDate(now);
    if (selected < now) return roundUpToNextQuarterDate(now);
    return selected;
  }
  function roundToNextQuarterISO(date = new Date()) {
    const d = new Date(date);
    const q = Math.ceil(d.getMinutes() / 15);
    const mm = (q * 15) % 60;
    let hh = d.getHours() + (q === 4 ? 1 : 0);
    if (hh >= 24) { hh = 0; d.setDate(d.getDate() + 1); }
    d.setHours(hh, mm, 0, 0);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }
  function roundUpToNextQuarterDate(date = new Date()) {
    const d = new Date(date.getTime());
    const q = Math.ceil(d.getMinutes() / 15);
    const mm = (q * 15) % 60;
    let hh = d.getHours() + (q === 4 ? 1 : 0);
    if (hh >= 24) { hh = 0; d.setDate(d.getDate() + 1); }
    d.setSeconds(0, 0);
    d.setMinutes(mm);
    d.setHours(hh);
    return d;
  }
  function setupDateLimits() {
    const dt = document.getElementById("datetimeRoute");
    if (!dt) return;
    dt.step = 900;
    const rounded = roundToNextQuarterISO(new Date());
    dt.min = rounded;
    if (!dt.value || new Date(dt.value) < new Date(dt.min)) dt.value = dt.min;
  }
  function haversine(p1, p2) {
    const R = 6371, toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(p2.lat - p1.lat);
    const dLon = toRad(p2.lon - p1.lon);
    const lat1 = toRad(p1.lat), lat2 = toRad(p2.lat);
    const a = Math.sin(dLat/2)**2 + Math.sin(dLon/2)**2 * Math.cos(lat1) * Math.cos(lat2);
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  function formatTime(d) {
    return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  function isValidDate(d) { return d instanceof Date && !isNaN(d.getTime()); }
  function fmtSafe(d) { return isValidDate(d) ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""; }
  function updateUnits() { processWeatherData(); }
  function safeNum(v) {
    if (v === null || v === undefined || v === "") return null;
    if (typeof v === "number" && !isNaN(v)) return v;
    const n = Number(v); return Number.isFinite(n) ? n : null;
  }
  function normalUnit(p0, p1) {
    const dx = p1.lon - p0.lon, dy = p1.lat - p0.lat;
    const len = Math.hypot(dx, dy) || 1;
    return { nx: -dy / len, ny: dx / len };
  }
  function offsetLatLng(lat, lon, nx, ny, meters = 12) {
    const dLat = (meters / 111320) * ny;
    const dLon = (meters / (40075000 * Math.cos(lat * Math.PI/180) / 360)) * nx;
    return [lat + dLat, lon + dLon];
  }
  function beaufortIntensity(speedKmh) {
    if (speedKmh == null) return "suave";
    if (speedKmh < 12) return "suave";
    if (speedKmh < 30) return "media";
    if (speedKmh < 50) return "fuerte";
    return "muy_fuerte"; // NEW: elevated winds (purple)
  }
  function windToUnits(val, unit) { return unit === "ms" ? val / 3.6 : val; }

  // NEW: pick which wind value drives the marker intensity (auto policy)
  function windIntensityValue(speedKmh, gustKmh) {
    const s = Number(speedKmh) || 0;
    const g = Number(gustKmh) || 0;
    // Use gust if clearly elevated vs sustained (>=45 or +30%)
    if (g && g >= Math.max(45, s * 1.3)) return g;
    return s;
  }

  // NEW: category helper used by luminance mixer
  function getWeatherCategoryForStep(step) {
    const prov = step?.provider || apiSource;
    const code = step?.weatherCode;
    if (code == null) return "default";
    if (prov === "meteoblue") return getDetailedCategoryMeteoBlue(Number(code));
    if (prov === "openweather") return getDetailedCategoryOpenWeather(Number(code));
    return getDetailedCategoryOpenMeteo(Number(code));
  }

  function computeLuminanceBase(step) {
    if (typeof SunCalc === "undefined" || !step?.time || step?.lat == null || step?.lon == null) return null;

    const t = step.time instanceof Date ? step.time : new Date(step.time);
    const pos = SunCalc.getPosition(t, step.lat, step.lon);
    const elevRad = pos.altitude;               // radians
    const elevDeg = elevRad * 180 / Math.PI;    // degrees
    step._elevDeg = elevDeg;                    // expose for the mixer

    // Night: below civil twilight
    if (elevDeg <= -6) return 0;

    // Civil twilight (-6..0): tiny residual luminance
    if (elevDeg <= 0) {
      // 0 at -6°, ~0.03 at 0°
      return ((elevDeg + 6) / 6) * 0.03;
    }

    // Daytime: clear-sky proxy using air mass attenuation + sine(elev) non-linearity
    const zenithDeg = 90 - elevDeg;
    const zenithRad = zenithDeg * Math.PI / 180;

    // Kasten & Young (1989) air mass; clamp to sane range
    let m = 1 / (Math.cos(zenithRad) + 0.50572 * Math.pow(96.07995 - zenithDeg, -1.6364));
    m = Math.max(1, Math.min(10, m));

    // Simple turbidity approximation modulated by humidity (if available)
    const rh = Number(step?.humidity);
    const tau = 0.12 + 0.18 * (Number.isFinite(rh) ? rh / 100 : 0.5); // 0.12..0.30

    // Base clear‑sky factor: sine(elev) with slight gamma + mild air mass attenuation
    const sinEl = Math.sin(elevRad);
    const clear = Math.pow(sinEl, 1.15) * Math.exp(-tau * (m - 1) * 0.25);

    return clamp01(clear);
  }

  // REWRITE: final luminance (0–1) mixing clouds/precip/category and optional UV anchoring
  function computeLuminance(step) {
    const base = computeLuminanceBase(step);
    if (base == null) return null;

    // Cloud Modification Factor (Kasten/CMF): 1 − 0.75*N^3, N in [0..1]
    const cc = Number(step?.cloudCover);
    const N = Number.isFinite(cc) ? Math.min(1, Math.max(0, cc / 100)) : null;
    const CMF = (N == null) ? 1 : (1 - 0.75 * Math.pow(N, 3));

    // Precip attenuation: up to -60% around ~6 mm/h; drizzle barely affects
    const precip = Number(step?.precipitation ?? 0);
    const rainFactor = 1 - Math.min(0.6, Math.max(0, precip) / 6);

    // Fog/snow category penalties (perceived light)
    const cat = getWeatherCategoryForStep(step);
    let catFactor = 1;
    if (cat === "fog") catFactor = 0.35;
    else if (cat === "snow_heavy") catFactor = 0.5;
    else if (cat === "snow" || cat === "snow_showers" || cat === "snow_light") catFactor = 0.65;
    else if (cat === "rain_heavy") catFactor = 0.65;

    // Combine physical factors
    const physical = clamp01(base * CMF * rainFactor * catFactor);

    // Optional UV anchoring (only by day and if available)
    const elevDeg = typeof step._elevDeg === "number" ? step._elevDeg : 0;
    const uv = Number(step?.uvindex);
    if (elevDeg > 0 && Number.isFinite(uv) && uv > 0) {
      // Normalize UV (index 0–11+), cap by cloud factor so UV can't exceed heavy overcast ceiling
      const uvFactor = clamp01(uv / 11);
      const uvMaxByClouds = (N == null) ? 1 : Math.max(0.05, CMF);
      const uvAnchor = Math.min(uvFactor, uvMaxByClouds);

      // Adaptive UV weight: lower near sunrise/sunset, higher at midday
      const sinEl = Math.sin((Math.PI / 180) * elevDeg);
      const wUV = Math.max(0.15, Math.min(0.4, 0.15 + 0.25 * Math.sqrt(Math.max(0, sinEl))));

      return +clamp01((1 - wUV) * physical + wUV * uvAnchor).toFixed(2);
    }

    return +physical.toFixed(2);
  }

  // NEW: UI notice helpers (shared for warnings and errors)
  function setNotice(msg, type = "warn") {
    const el = document.getElementById("horizonNotice");
    if (!el) return;
    el.classList.add("notice");
    el.classList.remove("warn", "error");
    el.classList.add(type === "error" ? "error" : "warn");
    if (msg && String(msg).trim()) {
      el.textContent = msg;
      el.hidden = false;
    } else {
      el.textContent = "";
      el.hidden = true;
    }
  }
  function clearNotice() { setNotice("", "warn"); }

  // Helper: classify common provider errors (reusable)
  function classifyProviderError(prov, status, bodyText = "") {
    if (prov === "meteoblue") {
      // Treat 401 and most 403 as invalid key; keep quota/limit as quota
      if (status === 401) return "invalid_key";
      if (status === 403) return /quota|limit/i.test(bodyText) ? "quota" : "invalid_key";
      if (status === 429) return "quota";
    }
    if (prov === "openweather") {
      if (status === 401) return "invalid_key";
      if (status === 403) return "forbidden";
      if (status === 429) return "quota";
    }
    // generic fallbacks
    if (status === 401) return "invalid_key";
    if (status === 403) return "forbidden";
    if (status === 429) return "quota";
    return "http";
  }

  // Build URL per provider (add OpenWeather One Call 3.0)
  function buildProviderUrl(prov, p, timeAt, apiKey, windUnit, tempUnit) {
    if (prov === "meteoblue") {
      return `https://my.meteoblue.com/packages/basic-1h,clouds-1h?lat=${p.lat}&lon=${p.lon}&apikey=${apiKey}&time=${timeAt.toISOString()}&tz=auto`;
    }
    if (prov === "openweather") {
      // Units: metric (°C, m/s), imperial (°F, mph). We normalize later.
      const units = (String(tempUnit || "").toLowerCase().startsWith("f")) ? "imperial" : "metric";
      // Hourly is limited (~48h). We include daily to allow fallback.
      return `https://api.openweathermap.org/data/3.0/onecall?lat=${p.lat}&lon=${p.lon}&appid=${apiKey}&units=${units}&exclude=minutely,alerts`;
    }
    // openmeteo
    return `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&hourly=temperature_2m,precipitation,precipitation_probability,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,winddirection_10m,weathercode,uv_index,is_day,cloud_cover&start=${timeAt.toISOString()}&timezone=auto`;
  }

  // Helper: clamp value to [0,1]
  function clamp01(x) {
    const n = Number(x);
    return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
  }

  // Find the closest time index in an array of ISO strings/dates
  function findClosestIndex(arr, target) {
    let minDiff = Infinity, idx = -1;
    const tgt = target instanceof Date ? target : new Date(target);
    for (let i = 0; i < arr.length; i++) {
      const d = arr[i] instanceof Date ? arr[i] : new Date(arr[i]);
      const diff = Math.abs(d - tgt);
      if (diff < minDiff) { minDiff = diff; idx = i; }
    }
    return idx;
  }

  async function fetchWeatherForSteps(steps, timeSteps) {
    weatherData = [];
    clearNotice(); // reset UI notice at the start

    let apiKeyFinal = ""
    if (apiSource === "meteoblue") {
      apiKeyFinal = getVal("apiKey");
    } else if (apiSource === "openweather") {
      apiKeyFinal= getVal("apiKeyOW");
    } 
    const date = getVal("datetimeRoute").substring(0, 10);
    const tempUnit = getVal("tempUnits");
    const windUnit = getVal("windUnits");
    const now = new Date();

    showLoading();

    // Notice flags
    let warnedFallback = false;
    let warnedBeyondOM = false;
    let usedFallback = false;
    let usedFallbackHorizon = false; // NEW
    let usedFallbackError = false;   // NEW
    let beyondHorizon = false;
    let missingKeyFallback = false;
    let invalidKeyOnce = false;
    let quotaOnce = false;
    let httpErrOnce = false;
    // NEW: keep last MB HTTP status for the banner
    let lastHttpStatusMB = null;

    // NEW: provider fail-fast state
    let providerHardFailCode = null;      // "invalid_key" | "quota" | "http" | "forbidden"
    let providerFailCount = 0;
    const providerFailLimit = 3;
    let hardFailLogged = false;

    // NEW: flags for OpenWeather provider notices
    let invalidKeyOnceOWM = false;
    let quotaOnceOWM = false;
    let httpErrOnceOWM = false;
    let lastHttpStatusOWM = null;

    // NEW: fail-fast state for OpenWeather
    let providerHardFailCodeOWM = null;
    let providerFailCountOWM = 0;
    const providerFailLimitOWM = 3;

    // NEW: remember horizon days for notice
    let horizonDaysUsed = null;

    // If provider requires key but not provided (MB or OWM), fallback to Open‑Meteo
    const providerNeedsKey = (apiSource === "meteoblue" || apiSource === "openweather");
    const hasKey = !!apiKeyFinal;

    try {
      for (let i = 0; i < steps.length; i++) {
        const p = steps[i];
        const timeAt = timeSteps[i];

        const daysAhead = (timeAt - now) / MS_PER_DAY;

        let prov = apiSource;

        // Hard-fail skip for MB
        if (prov === "meteoblue" && providerHardFailCode) {
          prov = "openmeteo";
          usedFallback = true;
          usedFallbackError = true;
          if (!hardFailLogged) {
            logDebug(t("provider_disabled_after_errors", { prov: "MeteoBlue" }), true);
            hardFailLogged = true;
          }
        }
        // Hard-fail skip for OWM
        if (prov === "openweather" && providerHardFailCodeOWM) {
          prov = "openmeteo";
          usedFallback = true;
          usedFallbackError = true;
          logDebug(t("provider_disabled_after_errors", { prov: "OpenWeather" }), true);
        }

        // Missing key fallback
        if ((prov === "meteoblue" || prov === "openweather") && !hasKey) {
          prov = "openmeteo";
          missingKeyFallback = true;
        }

        // Horizon checks
        if (prov === "meteoblue" && daysAhead > METEOBLUE_MAX_DAYS) {
          prov = "openmeteo";
          usedFallback = true;
          usedFallbackHorizon = true;
          horizonDaysUsed = METEOBLUE_MAX_DAYS;
          if (!warnedFallback) {
            logDebug(`MeteoBlue excede ${METEOBLUE_MAX_DAYS} días; usando Open‑Meteo como fallback.`);
            warnedFallback = true;
          }
        }
        if (prov === "openweather" && daysAhead > OPENWEATHER_MAX_DAYS) {
          prov = "openmeteo";
          usedFallback = true;
          usedFallbackHorizon = true;
          horizonDaysUsed = OPENWEATHER_MAX_DAYS;
          if (!warnedFallback) {
            logDebug(`OpenWeather excede ${OPENWEATHER_MAX_DAYS} días; usando Open‑Meteo como fallback.`);
            warnedFallback = true;
          }
        }

        // Even Open-Meteo horizon exceeded
        if (daysAhead > OPENMETEO_MAX_DAYS) {
          beyondHorizon = true;
          if (!warnedBeyondOM) {
            logDebug(`Fecha fuera de horizonte (${OPENMETEO_MAX_DAYS} días) para Open‑Meteo. Algunos pasos no tendrán datos.`, true);
            warnedBeyondOM = true;
          }
          weatherData.push({ ...p, provider: "openmeteo", weather: null });
          continue;
        }

        const keyPrim = `cw_weather_${prov}_${date}_${tempUnit}_${windUnit}_${p.lat.toFixed(3)}_${p.lon.toFixed(3)}_${timeAt.toISOString()}`;
        const cachedPrim = getCache(keyPrim);
        if (cachedPrim) {
          weatherData.push({ ...p, provider: prov, weather: cachedPrim });
          logDebug(`Cache usado paso ${i + 1} (${prov})`);
          continue;
        }

        let res, json, ok = false;

        try {
          const urlPrim = buildProviderUrl(prov, p, timeAt, apiKeyFinal, windUnit, tempUnit);
          res = await fetch(urlPrim);
          if (res.ok) {
            json = await res.json();
            ok = true;
          } else {
            const bodyText = await res.text().catch(() => "");
            const code = classifyProviderError(prov, res.status, bodyText);

            if (prov === "meteoblue") {
              // Count MB failures and consider hard-fail
              providerFailCount++;
              // NEW: remember status for final banner
              lastHttpStatusMB = res.status;

              if (code === "invalid_key" && !invalidKeyOnce) {
                invalidKeyOnce = true;
                logDebug(t("provider_key_invalid", { prov: "MeteoBlue" }), true);
              } else if (code === "quota" && !quotaOnce) {
                quotaOnce = true;
                logDebug(t("provider_quota_exceeded", { prov: "MeteoBlue" }), true);
              } else if (!httpErrOnce && code === "http") {
                httpErrOnce = true;
                logDebug(t("provider_http_error", { prov: "MeteoBlue", status: res.status }), true);
              }

              if (providerFailCount >= providerFailLimit) {
                providerHardFailCode = code;
              }

              // Fallback to OM for this step
              const prov2 = "openmeteo";
              const key2 = `cw_weather_${prov2}_${date}_${tempUnit}_${windUnit}_${p.lat.toFixed(3)}_${p.lon.toFixed(3)}_${timeAt.toISOString()}`;
              const cached2 = getCache(key2);
              usedFallback = true;
              usedFallbackError = true;

              if (cached2) {
                weatherData.push({ ...p, provider: prov2, weather: cached2 });
                continue;
              }
              const url2 = buildProviderUrl(prov2, p, timeAt, apiKeyFinal, windUnit, tempUnit);
              const res2 = await fetch(url2);
              if (res2.ok) {
                const json2 = await res2.json();
                weatherData.push({ ...p, provider: prov2, weather: json2 });
                setCache(key2, json2);
                continue;
              } else {
                weatherData.push({ ...p, provider: prov2, weather: null });
                continue;
              }
            } else if (prov === "openweather") {
              // Mirror MB error handling for OWM
              providerFailCountOWM++;
              lastHttpStatusOWM = res.status;

              if (code === "invalid_key" && !invalidKeyOnceOWM) {
                invalidKeyOnceOWM = true;
                logDebug(t("provider_key_invalid", { prov: "OpenWeather" }), true);
              } else if (code === "quota" && !quotaOnceOWM) {
                quotaOnceOWM = true;
                logDebug(t("provider_quota_exceeded", { prov: "OpenWeather" }), true);
              } else if (!httpErrOnceOWM && code === "http") {
                httpErrOnceOWM = true;
                logDebug(t("provider_http_error", { prov: "OpenWeather", status: res.status }), true);
              }

              if (providerFailCountOWM >= providerFailLimitOWM) {
                providerHardFailCodeOWM = code;
              }

              // Fallback to Open‑Meteo for this step
              const prov2 = "openmeteo";
              const key2 = `cw_weather_${prov2}_${date}_${tempUnit}_${windUnit}_${p.lat.toFixed(3)}_${p.lon.toFixed(3)}_${timeAt.toISOString()}`;
              const cached2 = getCache(key2);
              usedFallback = true;
              usedFallbackError = true;

              if (cached2) {
                weatherData.push({ ...p, provider: prov2, weather: cached2 });
                continue;
              }
              const url2 = buildProviderUrl(prov2, p, timeAt, apiKeyFinal, windUnit, tempUnit);
              const res2 = await fetch(url2);
              if (res2.ok) {
                const json2 = await res2.json();
                weatherData.push({ ...p, provider: prov2, weather: json2 });
                setCache(key2, json2);
                continue;
              } else {
                weatherData.push({ ...p, provider: prov2, weather: null });
                continue;
              }
            } else {
              // Non-recoverable or non-meteoblue error -> blank step but keep going
              if (!httpErrOnce) {
                httpErrOnce = true;
                logDebug(t("provider_http_error", { prov: "Open‑Meteo", status: res.status }), true);
              }
            }
          }
        } catch (err) {
          logDebug(t("error_api_step", { step: i + 1, msg: err.message }), true);
        }

        if (ok && json) {
          weatherData.push({ ...p, provider: prov, weather: json });
          setCache(keyPrim, json);
          logDebug(`Datos recibidos paso ${i + 1} (${prov})`);
          await new Promise(r => setTimeout(r, 70));
        } else {
          // store empty if nothing worked
          weatherData.push({ ...p, provider: prov, weather: null });
        }
      }

      // Summarize notices (priority: horizon > missing/invalid/quota/http > fallbacks)
      if (beyondHorizon) {
        setNotice(t("horizon_exceeded", { days: OPENMETEO_MAX_DAYS }), "warn");
      } else if (usedFallbackHorizon) {
        setNotice(t("fallback_to_openmeteo", { days: horizonDaysUsed ?? METEOBLUE_MAX_DAYS }), "warn");
      } else if (missingKeyFallback && providerNeedsKey) {
        // Prefer naming current provider
        const provName = (apiSource === "openweather") ? "OpenWeather" : "MeteoBlue";
        setNotice(t("provider_key_missing", { prov: provName }) + " " + t("fallback_short"), "error");
      } else if ((invalidKeyOnce || invalidKeyOnceOWM) && usedFallbackError) {
        const provName = invalidKeyOnceOWM ? "OpenWeather" : "MeteoBlue";
        setNotice(t("provider_key_invalid", { prov: provName }) + " " + t("fallback_short"), "error");
      } else if ((quotaOnce || quotaOnceOWM) && usedFallbackError) {
        const provName = quotaOnceOWM ? "OpenWeather" : "MeteoBlue";
        setNotice(t("provider_quota_exceeded", { prov: provName }) + " " + t("fallback_short"), "error");
      } else if ((httpErrOnce || httpErrOnceOWM) && usedFallbackError) {
        const provName = httpErrOnceOWM ? "OpenWeather" : "MeteoBlue";
        const st = httpErrOnceOWM
          ? (lastHttpStatusOWM != null ? String(lastHttpStatusOWM) : "…")
          : (lastHttpStatusMB != null ? String(lastHttpStatusMB) : "…");
        setNotice(t("provider_http_error", { prov: provName, status: st }) + " " + t("fallback_short"), "error");
      } else if (invalidKeyOnce || invalidKeyOnceOWM) {
        const provName = invalidKeyOnceOWM ? "OpenWeather" : "MeteoBlue";
        setNotice(t("provider_key_invalid", { prov: provName }), "error");
      } else if (quotaOnce || quotaOnceOWM) {
        const provName = quotaOnceOWM ? "OpenWeather" : "MeteoBlue";
        setNotice(t("provider_quota_exceeded", { prov: provName }), "error");
      } else if (httpErrOnce || httpErrOnceOWM) {
        const provName = httpErrOnceOWM ? "OpenWeather" : "MeteoBlue";
        const st = httpErrOnceOWM
          ? (lastHttpStatusOWM != null ? String(lastHttpStatusOWM) : "…")
          : (lastHttpStatusMB != null ? String(lastHttpStatusMB) : "…");
        setNotice(t("provider_http_error", { prov: provName, status: st }), "error");
      } else if (usedFallbackError) {
        const provName = (apiSource === "openweather") ? "OpenWeather" : "MeteoBlue";
        setNotice(t("fallback_due_error", { prov: provName }), "warn");
      } else {
        clearNotice();
      }

      processWeatherData();
    } catch (err) {
      logDebug(t("error_api", { msg: err.message }), true);
      setNotice(t("error_api", { msg: err.message }), "error");
    } finally {
      hideLoading();
    }
  }
  function segmentRouteByTime(geojson) {
    if (!geojson || !geojson.features.length) {
      logDebug(t("geojson_invalid"), true);
      return;
    }
    const coords = geojson.features[0].geometry.coordinates.map((c) => ({
      lat: c[1],
      lon: c[0],
    }));

    if (coords.length < 2) {
      logDebug(t("track_too_short"), true);
      return;
    }

    const speed = Number(getVal("cyclingSpeed")) || 20;
    const intervalMinutes = Number(getVal("intervalSelect")) || 15;
    const datetimeValue = getVal("datetimeRoute");
    if (!datetimeValue) {
      logDebug(t("route_date_empty"), true);
      return;
    }

    let startDateTime = getValidatedDateTime();

    if (isNaN(startDateTime.getTime())) {
      logDebug(t("route_date_invalid", { val: datetimeValue }), true);
      return;
    }

    let totalDistance = 0;
    for (let i = 1; i < coords.length; i++) {
      totalDistance += haversine(coords[i - 1], coords[i]); // km
    }
    // mantén totalDistance en km; crea versión en metros (float)
    const totalDistanceM = totalDistance * 1000;
    const totalDurationMins = (totalDistance / speed) * 60;
    const stepsCount = Math.floor(totalDurationMins / intervalMinutes) + 1;

    let timeSteps = [];
    for (let i = 0; i < stepsCount; i++) {
      timeSteps.push(
        new Date(startDateTime.getTime() + i * intervalMinutes * 60000)
      );
    }

    let steps = [];
    let cumulativeDistance = 0;
    let currentSegment = 0;

    console.log("segmentRouteByTime: coords.length =", coords.length);
    console.log("stepsCount =", stepsCount);
    console.log("timeSteps.length =", timeSteps.length);

    for (let i = 0; i < stepsCount; i++) {
      const targetDistance = (speed * intervalMinutes * i) / 60; // km
      const targetDistanceM = targetDistance * 1000; // m

      while (
        currentSegment < coords.length - 1 &&
        cumulativeDistance +
          haversine(coords[currentSegment], coords[currentSegment + 1]) <
          targetDistance
      ) {
        cumulativeDistance += haversine(
          coords[currentSegment],
          coords[currentSegment + 1]
        );
        currentSegment++;
      }

      if (currentSegment >= coords.length - 1) {
        // Último punto: distancia total en metros
        steps.push({
          lat: coords[coords.length - 1].lat,
          lon: coords[coords.length - 1].lon,
          time: timeSteps[i],
          distanceM: totalDistanceM,
        });
        continue;
      }

      const segDist = haversine(
        coords[currentSegment],
        coords[currentSegment + 1]
      );
      const distInSegment = targetDistance - cumulativeDistance;
      const ratio = segDist ? distInSegment / segDist : 0;

      const lat =
        coords[currentSegment].lat +
        ratio * (coords[currentSegment + 1].lat - coords[currentSegment].lat);
      const lon =
        coords[currentSegment].lon +
        ratio * (coords[currentSegment + 1].lon - coords[currentSegment].lon);

      // Guardamos la distancia acumulada prevista en ese paso (metros)
      steps.push({ lat, lon, time: timeSteps[i], distanceM: Math.min(targetDistanceM, totalDistanceM) });
    }

    // Asegurar final con hora REAL (no redondeada) y arrays alineados
    if (steps.length) {
      const arrivalTime = new Date(startDateTime.getTime() + totalDurationMins * 60000);
      const lastStep = steps[steps.length - 1];
      if (!Number.isFinite(lastStep.distanceM) || Math.round(lastStep.distanceM) < Math.round(totalDistanceM)) {
        // añadir paso final con hora real
        timeSteps.push(arrivalTime);
        steps.push({
          lat: coords[coords.length - 1].lat,
          lon: coords[coords.length - 1].lon,
          time: arrivalTime,
          distanceM: totalDistanceM,
        });
      } else {
        // ya existe: actualizar su hora a la real
        steps[steps.length - 1].time = arrivalTime;
        if (timeSteps.length) timeSteps[timeSteps.length - 1] = arrivalTime;
      }
    }

    //const dateISO = startDateTime.toISOString().substring(0, 10);
    console.log("steps ejemplo:", steps[0]);
    console.log("weatherData ejemplo:", weatherData[0]);

    fetchWeatherForSteps(steps, timeSteps);
  }
  function processWeatherData() {
    const tempUnit = getVal("tempUnits");
    const windUnit = getVal("windUnits");

    // Recorre pasos y calcula campos 
    weatherData.forEach((step) => {
      const prov = step.provider || apiSource; // CHANGED: provider-aware
      if (!step.weather) {
        step.temp =
          step.windSpeed =
          step.windDir =
          step.windGust =
          step.humidity =
          step.precipitation =
          step.precipProb =
            null;
        step.weatherCode = null;
        step.windCombined = "";
        step.rainCombined = "";
        return;
      }
      const w = step.weather;
      let idx = -1;
      if (prov === "openmeteo") {
        if (!w.hourly || !w.hourly.time) return;
        idx = findClosestIndex(w.hourly.time, step.time);
      }
      // NEW: OpenWeather extraction (prefer hourly, fallback to daily)
      if (prov === "openweather") {
        const timeMs = (step.time instanceof Date ? step.time : new Date(step.time)).getTime();

        // Helper: pick closest index in OWM arrays by dt (seconds)
        const closestByDt = (arr) => {
          if (!Array.isArray(arr) || !arr.length) return -1;
          let best = -1, bestDiff = Infinity;
          for (let i = 0; i < arr.length; i++) {
            const t = Number(arr[i]?.dt) * 1000;
            const df = Math.abs(t - timeMs);
            if (df < bestDiff) { bestDiff = df; best = i; }
          }
          return best;
        };

        let useHourly = Array.isArray(w.hourly) && w.hourly.length > 0;
        let hi = useHourly ? closestByDt(w.hourly) : -1;
        let di = (!useHourly || hi === -1) ? closestByDt(w.daily) : -1;

        const hourly = (useHourly && hi !== -1) ? w.hourly[hi] : null;
        const daily = (!hourly && Array.isArray(w.daily) && di !== -1) ? w.daily[di] : null;

        // isDaylight via SunCalc (robust for icons/luminance)
        try {
          const pos = SunCalc.getPosition(new Date(timeMs), step.lat, step.lon);
          step.isDaylight = pos.altitude > 0 ? 1 : 0;
        } catch { step.isDaylight = 1; }

        // Units normalization: derive km/h from API units
        const units = (String(tempUnit || "").toLowerCase().startsWith("f")) ? "imperial" : "metric";
        const toKmhFromOW = (ws) => {
          const v = Number(ws) || 0;
          if (units === "imperial") return v * 1.60934; // mph -> km/h
          return v * 3.6; // metric/standard m/s -> km/h
        };

        if (hourly) {
          step.temp = safeNum(hourly.temp);
          step.windSpeed = safeNum(windToUnits(toKmhFromOW(hourly.wind_speed), windUnit));
          step.windDir = Number(hourly.wind_deg || 0);
          step.windGust = safeNum(
            hourly.wind_gust != null
              ? windToUnits(toKmhFromOW(hourly.wind_gust), windUnit)
              : null
          );
          step.humidity = safeNum(hourly.humidity);
          const rainH = Number(hourly.rain?.["1h"] ?? 0);
          const snowH = Number(hourly.snow?.["1h"] ?? 0);
          step.precipitation = safeNum(rainH + snowH);
          step.precipProb = safeNum((Number(hourly.pop) || 0) * 100);
          step.weatherCode = Array.isArray(hourly.weather) && hourly.weather[0] ? hourly.weather[0].id : null;
          step.uvindex = safeNum(hourly.uvi ?? w.current?.uvi ?? null);
          step.cloudCover = safeNum(hourly.clouds);
          step.luminance = computeLuminance(step);
          step.timeLabel = formatTime(step.time);
        } else if (daily) {
          // Approximate from daily if beyond hourly range
          const dtemp = (daily.temp && (daily.temp.day ?? daily.temp.max ?? daily.temp.min)) || null;
          step.temp = safeNum(dtemp);
          step.windSpeed = safeNum(windToUnits(toKmhFromOW(daily.wind_speed), windUnit));
          step.windDir = Number(daily.wind_deg || 0);
          step.windGust = safeNum(
            daily.wind_gust != null
              ? windToUnits(toKmhFromOW(daily.wind_gust), windUnit)
              : null
          );
          step.humidity = safeNum(daily.humidity);
          const rainD = Number(daily.rain ?? 0);
          const snowD = Number(daily.snow ?? 0);
          step.precipitation = safeNum(rainD + snowD);
          step.precipProb = safeNum((Number(daily.pop) || 0) * 100);
          step.weatherCode = Array.isArray(daily.weather) && daily.weather[0] ? daily.weather[0].id : null;
          step.uvindex = safeNum(daily.uvi ?? w.current?.uvi ?? null);
          step.cloudCover = safeNum(daily.clouds);
          step.luminance = computeLuminance(step);
          step.timeLabel = formatTime(step.time);
        } else {
          // No data parsed
          step.temp =
            step.windSpeed =
            step.windDir =
            step.windGust =
            step.humidity =
            step.precipitation =
            step.precipProb =
              null;
          step.weatherCode = null;
          step.luminance = computeLuminance(step);
          step.timeLabel = "--:--";
        }

        // If no precip, hide probability
        if (step.precipitation != null && Number(step.precipitation) === 0) {
          step.precipProb = null;
        }

        step.windCombined = formatWindCell(step.windSpeed, step.windGust, step.windDir);
        step.rainCombined = formatRainCell(step.precipitation, step.precipProb);
        return; // handled OpenWeather branch
      }

      if (prov === "meteoblue") {
        step.temp = safeNum(w.temperature_2m);
        step.windSpeed = safeNum(w.wind_speed_10m);
        step.windDir = w.wind_direction_10m || 0;
        step.windGust = safeNum(w.wind_gust_10m);
        step.humidity = safeNum(w.relative_humidity_2m);
        step.precipitation = safeNum(w.precipitation);
        step.precipProb = safeNum(w.precipitation_probability);
        step.weatherCode = w.pictocode[idx];
        step.uvindex = safeNum((w.uvindex?.[idx] ?? w.uv_index?.[idx]));
        step.isDaylight = w.isdaylight;
        step.cloudCover = safeNum(w.total_cloud_cover?.[idx] ?? w.cloudcover?.[idx]);
        step.luminance = computeLuminance(step);

      } else if (prov === "openmeteo" && idx !== -1) {
        step.temp = safeNum(w.hourly.temperature_2m[idx]);
        step.windSpeed = safeNum(windToUnits(w.hourly.wind_speed_10m[idx], windUnit));
        step.windDir = w.hourly.winddirection_10m[idx];
        step.windGust = safeNum(windToUnits(w.hourly.wind_gusts_10m[idx], windUnit));
        step.humidity = safeNum(w.hourly.relative_humidity_2m[idx]);
        step.precipitation = safeNum(w.hourly.precipitation[idx]);
        step.precipProb = safeNum(w.hourly.precipitation_probability[idx]);
        step.weatherCode = w.hourly.weathercode[idx];
        step.uvindex = (w.hourly.uv_index && w.hourly.uv_index.length > idx)
          ? safeNum(w.hourly.uv_index[idx])
          : null;
        step.isDaylight = w.hourly.is_day[idx];
        step.cloudCover = safeNum(w.hourly.cloud_cover?.[idx]); // 0–100
        step.luminance = computeLuminance(step);
      }

      // Si no hay precipitación, no tiene sentido mostrar probabilidad
      if (step.precipitation != null && Number(step.precipitation) === 0) {
        step.precipProb = null;
      }

      step.windCombined = formatWindCell(step.windSpeed, step.windGust, step.windDir);
      step.rainCombined = formatRainCell(step.precipitation, step.precipProb);
    });

    renderWeatherTable();
    renderWindMarkers();
    setTimeout(function() {
      if (map && trackLayer) {
        map.invalidateSize();
        map.fitBounds(trackLayer.getBounds(), {
          padding: [6, 6],
          maxZoom: 14
        });
      }
    }, 200);

  }
 
  function buildSunHeaderCell(lat, lon, dateLike) {
    if (typeof SunCalc === "undefined") return "";
    // Evita strings ambiguos: usa la Date de tu primer paso si existe
    const baseDate =
      dateLike instanceof Date
        ? dateLike
        : (typeof dateLike === "string" ? new Date(dateLike) : new Date());

    const times = SunCalc.getTimes(baseDate, lat, lon);

    const sr = fmtSafe(times.sunrise);
    const ss = fmtSafe(times.sunset);
    const cd = fmtSafe(times.dawn || times.civilDawn);
    const ck = fmtSafe(times.dusk || times.civilDusk);

    return `
      <div class="sunHeaderBox">
        <div class="sunCol">
          <div class="sunRow"><i class="wi wi-sunrise"></i><span>${sr || "--:--"}</span></div>
          <div class="sunRow"><i class="wi wi-sunset"></i><span>${ss || "--:--"}</span></div>
        </div>
        <div class="sunCol">
          <div class="sunRow"><span class="civil-chip">c↑</span><span>${cd || "--:--"}</span></div>
          <div class="sunRow"><span class="civil-chip">c↓</span><span>${ck || "--:--"}</span></div>
        </div>
      </div>
    `;
  }
  function getWeatherIconClassOpenMeteo(code, isDay) {
    // Mapeo WMO -> categorías más específicas
    let key = "";
    switch (Number(code)) {
      case 0: key = "clearsky"; break;
      case 1:
      case 2: key = "partlycloudy"; break;
      case 3: key = "overcast"; break;

      case 45:
      case 48: key = "fog"; break;

      // Drizzle
      case 51:
      case 53:
      case 55: key = "drizzle"; break;
      // Freezing drizzle
      case 56:
      case 57: key = "freezing_drizzle"; break;

      // Rain
      case 61: key = "rain_light"; break;
      case 63: key = "rain"; break;
      case 65: key = "rain_heavy"; break;

      // Freezing rain
      case 66:
      case 67: key = "freezing_rain"; break;

      // Snow
      case 71: key = "snow_light"; break;
      case 73: key = "snow"; break;
      case 75: key = "snow_heavy"; break;
      case 77: key = "snow_light"; break; // snow grains ~ ligero

      // Showers
      case 80: key = "showers"; break; // slight
      case 81: key = "showers"; break; // moderate
      case 82: key = "rain_heavy"; break; // violent showers ~ heavy

      // Snow showers
      case 85: key = "snow_showers"; break; // slight
      case 86: key = "snow_heavy"; break;   // heavy

      // Thunder
      case 95: key = "thunderstorm"; break;
      case 96:
      case 99: key = "thunder_hail"; break;

      default: key = "default";
    }
    const dayOrNight = isDay === 1 ? "day" : "night";
    return (weatherIconsMap[key] || weatherIconsMap.default)[dayOrNight];
  }

  function getWeatherIconClassMeteoBlue(pictocode, isdaylight) {
    const dayOrNight = isdaylight === 1 ? "day" : "night";
    const key = MB_PICTO_TO_KEY[Number(pictocode)] || "default";
    return (weatherIconsMap[key] || weatherIconsMap.default)[dayOrNight];
  }

  function getDetailedCategoryMeteoBlue(pictocode) {
    return MB_PICTO_TO_KEY[Number(pictocode)] || "default";
  }

  // --- OpenWeather mappers (appended, no other code modified) ---
  function getDetailedCategoryOpenWeather(owmId) {
    const id = Number(owmId);

    // Thunderstorm 2xx
    if (id >= 200 && id <= 232) return "thunderstorm";

    // Drizzle 3xx
    if (id >= 300 && id <= 321) return "drizzle";

    // Rain 5xx
    if (id === 500) return "rain_light";
    if (id === 501) return "rain";
    if (id === 502 || id === 503 || id === 504) return "rain_heavy";
    if (id === 511) return "freezing_rain";     // freezing rain
    if (id === 520 || id === 521) return "showers";
    if (id === 522) return "rain_heavy";
    if (id === 531) return "showers";

    // Snow 6xx
    if (id === 600) return "snow_light";
    if (id === 601) return "snow";
    if (id === 602) return "snow_heavy";
    if (id >= 611 && id <= 613) return "sleet"; // sleet / rain+snow light
    if (id === 615 || id === 616) return "sleet";
    if (id === 620 || id === 621) return "snow_showers";
    if (id === 622) return "snow_heavy";

    // Atmosphere 7xx (mist, smoke, haze, dust, sand, fog, ash)
    if (id === 701 || id === 711 || id === 721 || id === 731 ||
        id === 741 || id === 751 || id === 761 || id === 762) return "fog";
    if (id === 771) return "showers";           // squalls
    if (id === 781) return "thunderstorm";      // tornado -> severe convective bucket

    // Clouds 80x
    if (id === 800) return "clearsky";
    if (id === 801 || id === 802) return "partlycloudy";
    if (id === 803 || id === 804) return "overcast";

    return "default";
  }

  function getWeatherIconClassOpenWeather(owmId, isDaylightFlag) {
    const key = getDetailedCategoryOpenWeather(owmId);
    const dayOrNight = isDaylightFlag === 1 ? "day" : "night";
    return (weatherIconsMap[key] || weatherIconsMap.default)[dayOrNight];
  }
  // --- end OpenWeather mappers ---

  function makeWindSVGIcon(deg, speedKmh) {
    const intensity = beaufortIntensity(speedKmh);
    const sty = styleByIntensity(intensity);
    const s = sty.base;
    const rotation = getWindRotation(deg);
    const svg = `
      <svg class="wind-glyph" width="${s}" height="${s}" viewBox="0 0 24 24"
           xmlns="http://www.w3.org/2000/svg" style="display:block">
        <defs>
          <filter id="wds" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0.6" stdDeviation="0.6" flood-color="rgba(0,0,0,0.35)"/>
          </filter>
        </defs>

        <!-- Elliptical halo: rotate +90° and nudge up so the small end points to the arrow tip -->
        <ellipse class="wm-halo" cx="12" cy="12" rx="10.0" ry="7.2"
                 transform="translate(0,-0.8) rotate(90 12 12)"
                 fill="none" stroke="#f59e0b" stroke-width="1.4" opacity="0.9" />

        <g filter="url(#wds)">
          <!-- HALO shaft -->
          <path d="M12 22 L12 6" fill="none" stroke="rgba(255,255,255,0.95)"
                stroke-width="${(sty.stroke || 1.2) + 1.4}" stroke-linecap="round"/>
          <!-- Shaft -->
          <path d="M12 22 L12 6" fill="none" stroke="${sty.strokeColor}"
                stroke-width="${sty.stroke}" stroke-linecap="round"/>

          <!-- HALO head -->
          <path d="M12 2 L7 10 L17 10 Z" fill="${sty.fill}"
                stroke="rgba(255,255,255,0.95)" stroke-width="${(sty.stroke || 1.2) + 1.4}"/>
          <!-- Head -->
          <path d="M12 2 L7 10 L17 10 Z" fill="${sty.fill}"
                stroke="${sty.strokeColor}" stroke-width="${sty.stroke}"/>
        </g>
      </svg>
    `;
    return L.divIcon({
      html: `<div class="wind-svg-wrap" style="transform: rotate(${rotation}deg)">${svg}</div>`,
      className: 'wind-divicon wind-svg',
      iconSize: [s, s],
      iconAnchor: [s/2, s/2]
    });
  }
  function formatRainCell(precip, prob) {
    // Devuelve HTML: primera línea precipitación; segunda línea (probabilidad)
    if (precip == null) return "-";

    const pNum = Number(precip);
    const probNum = prob == null ? null : Number(prob);

    // Log para depuración rápida cuando se genera la celda
    logDebug(`formatRainCell called: precip=${precip} -> ${pNum}, prob=${prob} -> ${probNum}`);

    const top = `<span class="combined-top">${pNum.toFixed(1)}</span>`;

    // Mostrar probabilidad sólo si ambos valores son numéricos y mayores que 0
    const showProb = probNum != null && Number.isFinite(probNum) && pNum > 0 && probNum > 0;
    const bottom = showProb ? `<span class="combined-bottom">(${Math.round(probNum)}%)</span>` : "";

    return `<div class="weather-combined">${top}${bottom}</div>`;
  }

  // Formatea temperatura en una sola línea con el símbolo º (misma clase/style que viento/lluvia)
  function formatTempCell(temp) {
    if (temp == null) return "-";
    const tNum = Number(temp);
    if (!Number.isFinite(tNum)) return "-";
    // Redondear al entero más cercano y mostrar el símbolo º (sin decimales)
    return `<div class="weather-combined"><span class="combined-top">${Math.round(tNum)}º</span></div>`;
  }


  // Helpers: categoría detallada (coherente con getWeatherIconClass*).
  function getDetailedCategoryOpenMeteo(code) {
    switch (Number(code)) {
      case 0: return "clearsky";
      case 1:
      case 2: return "partlycloudy";
      case 3: return "overcast";
      case 45:
      case 48: return "fog";
      // Drizzle
      case 51:
      case 53:
      case 55: return "drizzle";
      // Freezing drizzle
      case 56:
      case 57: return "freezing_drizzle";
      // Rain
      case 61: return "rain_light";
      case 63: return "rain";
      case 65: return "rain_heavy";
      // Freezing rain
      case 66:
      case 67: return "freezing_rain";
      // Snow
      case 71: return "snow_light";
      case 73: return "snow";
      case 75: return "snow_heavy";
      case 77: return "snow_light";
      // Showers
      case 80: return "showers";
      case 81: return "showers";
      case 82: return "rain_heavy";
      // Snow showers
      case 85: return "snow_showers";
      case 86: return "snow_heavy";
      // Thunder
      case 95: return "thunderstorm";
      case 96:
      case 99: return "thunder_hail";
      default: return "default";
    }
  }
  function getDetailedCategoryMeteoBlue(pictocode) {
    return MB_PICTO_TO_KEY[Number(pictocode)] || "default";
  }

  // Helper: mediana de un array numérico
  function median(arr = []) {
    const vals = arr
      .map(Number)
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);
    const n = vals.length;
    if (!n) return null;
    const mid = Math.floor(n / 2);
    return n % 2 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;
  }

  function computeRouteSummary() {
    if (!Array.isArray(weatherData) || weatherData.length === 0) {
      return null;
    }
    // Ranking detallado (mayor severidad = mayor número)
    const sevRank = {
      thunder_hail: 10,
      thunderstorm: 9,
      snow_heavy: 8,
      snow: 7,
      snow_showers: 6,
      snow_light: 5,
      freezing_rain: 5,
      hail: 5,
      sleet: 5,
      freezing_drizzle: 4,
      rain_heavy: 4,
      rain: 3,
      showers: 3,
      rain_light: 2,
      drizzle: 2,
      fog: 1,
      overcast: 0.8,
      cloudy: 0.7,
      partlycloudy: 0.5,
      clearsky: 0,
      default: -1
    };

    let temps = [], winds = [], gustMax = null, precipMax = null, probMax = null;
    let cloudSum = 0, cloudCnt = 0;

    let bestCat = "default", bestRank = -1;
    const isDay = (weatherData[0]?.isDaylight === 1) ? "day" : "night";

    for (const step of weatherData) {
      if (step?.temp != null && Number.isFinite(Number(step.temp))) temps.push(Number(step.temp));
      if (step?.windSpeed != null && Number.isFinite(Number(step.windSpeed))) winds.push(Number(step.windSpeed));
      if (step?.windGust != null && Number.isFinite(Number(step.windGust))) {
        gustMax = (gustMax == null) ? Number(step.windGust) : Math.max(gustMax, Number(step.windGust));
      }
      if (step?.precipitation != null && Number.isFinite(Number(step.precipitation))) {
        precipMax = (precipMax == null) ? Number(step.precipitation) : Math.max(precipMax, Number(step.precipitation));
      }
      if (step?.precipProb != null && Number.isFinite(Number(step.precipProb))) {
        probMax = (probMax == null) ? Number(step.precipProb) : Math.max(probMax, Number(step.precipProb));
      }
      if (step?.cloudCover != null && Number.isFinite(Number(step.cloudCover))) {
        cloudSum += Number(step.cloudCover); cloudCnt++;
      }

      // Categoría detallada por proveedor (CHANGED: provider-aware)
      const prov = step.provider || apiSource;
      let cat = "default";
      if (prov === "meteoblue") cat = getDetailedCategoryMeteoBlue(step.weatherCode);
      else if (prov === "openweather") cat = getDetailedCategoryOpenWeather(step.weatherCode);
      else cat = getDetailedCategoryOpenMeteo(step.weatherCode);

      // Ajuste por nubosidad alta
      const cc = Number(step?.cloudCover ?? 0);
      if ((cat === "partlycloudy" || cat === "clearsky") && cc >= 80) cat = "overcast";

      const rank = sevRank[cat] ?? -1;
      if (rank > bestRank) {
        bestRank = rank;
        bestCat = cat;
      }
    }

    const tempAvg = median(temps);
    const windAvg = median(winds);
    const tempMin = temps.length ? Math.min(...temps) : null;
    const tempMax = temps.length ? Math.max(...temps) : null;

    const iconClass = (weatherIconsMap[bestCat] || weatherIconsMap.default)[isDay];

    return {
      iconClass,
      tempAvg,
      tempMin,
      tempMax,
      windAvg,
      gustMax,
      precipMax,
      probMax
    };
  }

  function buildRouteSummaryHTML(sum, tempUnitLabel, windUnitLabel, precipUnitLabel) {
    if (!sum) return "";
    const lang = (getVal("language") || "es").toLowerCase();
    const L = (es, en) => (lang.startsWith("es") ? es : en);

    // Unidades en minúsculas (solo viento/precip)
    const windUnitLc = (windUnitLabel || "").toString().toLowerCase();
    const precipUnitLc = (precipUnitLabel || "mm").toString().toLowerCase();

    const hasRange = (sum.tempMin != null) && (sum.tempMax != null);
    const lo = hasRange ? Math.round(Math.min(sum.tempMin, sum.tempMax)) : null;
    const hi = hasRange ? Math.round(Math.max(sum.tempMin, sum.tempMax)) : null;
    const tempTxt = !hasRange ? "-" : `${lo}–${hi}${tempUnitLabel}`;

    // CHANGED: wrap units to force lowercase in header
    const windTxt = (sum.windAvg == null)
      ? "-"
      : `${Number(sum.windAvg).toFixed(1)} <span class="unit-lower">${windUnitLc}</span>`;
    const gustTxt = (sum.gustMax == null) ? "" : ` (${Number(sum.gustMax).toFixed(1)})`;
    const precipTxt = (sum.precipMax == null)
      ? "-"
      : `${Number(sum.precipMax).toFixed(1)} <span class="unit-lower">${precipUnitLc}</span>`;
    const probTxt = (sum.probMax == null || Number(sum.probMax) <= 0) ? "" : ` (${Math.round(Number(sum.probMax))}%)`;

    return `
      <div class="route-summary">
        <i class="wi ${sum.iconClass} rs-icon"></i>
        <div class="rs-lines">
          <div class="rs-line"><span class="rs-label">${L("Temp", "Temp")}:</span> ${tempTxt}</div>
          <div class="rs-line"><span class="rs-label">${L("Viento", "Wind")}:</span> ${windTxt}${gustTxt}</div>
          <div class="rs-line"><span class="rs-label">${L("Lluvia", "Rain")}:</span> ${precipTxt}${probTxt}</div>
        </div>
      </div>
    `;
  }

  // Combina Resumen de ruta + Caja solar en un solo bloque
  function buildCombinedHeaderHTML(summaryHTML, sunHTML) {
    return `
      <div class="combined-header">
        ${summaryHTML || ""}
        <div class="combined-sep"></div>
        <div class="sun-wrap">${sunHTML || ""}</div>
      </div>
    `;
  }

  function renderWeatherTable() {
    const table = document.getElementById("weatherTable");
    table.innerHTML = "";
    const thead = document.createElement("thead");
    let row;

    // Unidades seleccionadas (precipUnits opcional, por defecto 'mm')
    const tempUnit = getVal("tempUnits"); // 'C' o 'F'
    const windUnit = getVal("windUnits"); // ej. 'ms', 'kmh', 'mph'
    const precipUnit = getVal("precipUnits");

    // Normaliza etiquetas de unidad para mostrar junto al nombre
    const degSymbol = "º";
    const tempUnitLabel =
      typeof tempUnit === "string" && tempUnit.toLowerCase().startsWith("f")
        ? `${degSymbol}F`
        : `${degSymbol}C`; // por defecto °C
    const windUnitLabel =
      windUnit === "ms" ? "m/s" : windUnit && windUnit.toLowerCase().startsWith("mph") ? "mph" : "km/h";
    const precipUnitLabel = precipUnit; // "mm" por defecto, puede ser "in" si existe selector

    // CHANGED: vista filtrada (oculta penúltima si <5 minutos del último)
    let viewData = Array.isArray(weatherData) ? weatherData.slice() : [];
    if (viewData.length >= 2) {
      const last = viewData[viewData.length - 1];
      const prev = viewData[viewData.length - 2];
      const tLast = last?.time instanceof Date ? last.time : new Date(last?.time);
      const tPrev = prev?.time instanceof Date ? prev.time : new Date(prev?.time);
      if (isValidDate(tLast) && isValidDate(tPrev) && (tLast - tPrev) < 5 * 60 * 1000) {
        viewData.splice(viewData.length - 2, 1);
      }
    }

    // NEW: build mappings between visible columns and original indices
    viewOriginalIndexMap = viewData.map(v => weatherData.indexOf(v));
    colIndexByOriginal = {};
    viewOriginalIndexMap.forEach((orig, col) => { if (orig >= 0) colIndexByOriginal[orig] = col; });

    // Fila 1: celda combinada + celdas tiempo/distancia (usar viewData)
    row = document.createElement("tr");
    const firstCell = document.createElement("th");
    firstCell.style.verticalAlign = "middle";
    firstCell.style.paddingRight = "8px";
    firstCell.style.textAlign = "left";
    const lat = viewData[0]?.lat ?? 0;
    const lon = viewData[0]?.lon ?? 0;
    const rawTime = Array.isArray(viewData) ? viewData[0]?.time : viewData?.time;
    const isoStr = rawTime instanceof Date ? rawTime.toISOString() : rawTime;
    const date =
      typeof isoStr === "string"
        ? isoStr.substring(0, 10)
        : new Date().toISOString().substring(0, 10);

    const summaryHTML = buildRouteSummaryHTML(
      computeRouteSummary(),
      tempUnitLabel,
      windUnitLabel,
      precipUnitLabel
    );
    const sunHTML = buildSunHeaderCell(lat, lon, date);
    firstCell.innerHTML = buildCombinedHeaderHTML(summaryHTML, sunHTML);
    firstCell.setAttribute("rowspan", "2");
    row.appendChild(firstCell);

    const maxM = viewData.length ? Math.max(...viewData.map(w => Number(w.distanceM || 0))) : 0;

    // NEW: detect runs of consecutive columns with same rounded km
    const dupFlags = new Array(viewData.length).fill(false);
    (function markDuplicateKmRuns() {
      // Collect rounded km for each column (null when distance invalid)
      const roundedKm = viewData.map(w => {
        const m = Number(w?.distanceM);
        return Number.isFinite(m) ? Math.round(m / 1000) : null;
      });
      let i = 0;
      while (i < roundedKm.length) {
        if (roundedKm[i] == null) { i++; continue; }
        let j = i + 1;
        while (j < roundedKm.length && roundedKm[j] === roundedKm[i]) j++;
        if (j - i >= 2) {
          for (let k = i; k < j; k++) dupFlags[k] = true;
        }
        i = j;
      }
    })();

    for (let i = 0; i < viewData.length; i++) {
      const th = document.createElement("th");
      const curr = viewData[i].time;
      const m = viewData[i]?.distanceM;
      const isLast = (i === viewData.length - 1);
      const isDup = dupFlags[i];

      // units (forced lowercase in header)
      const unitKm = `<span class="unit-lower">km</span>`;
      const unitM  = `<span class="unit-lower">m</span>`;

      let distText = "";
      if (Number.isFinite(m)) {
        if (isDup) {
          // Duplicate rounded-km run: show real distance
          if (m < 1000) distText = `${Math.round(m)} ${unitM}`;            // meters, no decimals
          else          distText = `${(m / 1000).toFixed(1)} ${unitKm}`;   // km with 1 decimal
        } else {
          // Original behavior
          if (Math.round(m) === 0) {
            distText = `0 ${unitKm}`;
          } else if (isLast) {
            distText = `${(m / 1000).toFixed(1)} ${unitKm}`; // last with 1 decimal
          } else if (m < 1000) {
            distText = `${m.toFixed(1)} ${unitM}`;            // keep as before
          } else {
            distText = `${Math.round(m / 1000)} ${unitKm}`;
          }
        }
      }

      const startIconUrl = "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png";
      const endIconUrl = "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png";
      let iconHtml = "";
      if (Number.isFinite(m)) {
        if (Math.round(m) === 0) iconHtml = `<img src="${startIconUrl}" class="start-icon" alt="" />`;
        else if (Math.round(m) === Math.round(maxM)) iconHtml = `<img src="${endIconUrl}" class="end-icon" alt="" />`;
      }
      const hasIcon = !!iconHtml;

      th.innerHTML = `
        <div class="cell-row${iconHtml ? '' : ' no-icon'}">
          ${iconHtml ? `<div class="icon-col">${iconHtml}</div>` : ''}
          <div class="time-dist-col">
            <div class="time-cell">${formatTime(viewData[i].time)}</div>
            <div class="m-cell"><span class="m-text">${distText}</span></div>
          </div>
        </div>`;
      // NEW: tag header cells so clicks + scroll targeting work
      th.dataset.col = String(i);
      th.dataset.ori = String(viewOriginalIndexMap[i]);
      row.appendChild(th);
    }
    thead.appendChild(row);

    // Fila 2: iconos por paso (usar viewData)
    row = document.createElement("tr");
    row.classList.add("icon-row");
    viewData.forEach((w, i) => {
      const th = document.createElement("th");
      const prov = w.provider || apiSource;
      let iconClass =
        prov === "meteoblue"
          ? getWeatherIconClassMeteoBlue(w.weatherCode, w.isDaylight)
          : prov === "openweather"
          ? getWeatherIconClassOpenWeather(w.weatherCode, w.isDaylight)
          : getWeatherIconClassOpenMeteo(w.weatherCode, w.isDaylight);
      const icon = document.createElement("i");
      icon.classList.add("wi", iconClass);
      icon.style.fontSize = "28px";
      th.appendChild(icon);
      th.dataset.col = String(i);
      th.dataset.ori = String(viewOriginalIndexMap[i]);
      row.appendChild(th);
    });
    thead.appendChild(row);

    // Labels base (sin unidades)
    const lang = getVal("language") || "es";
    const labels = {
      es: [
        "Temperatura",
        "Viento y racha",
        "Lluvia y probabilidad",
        "Humedad relativa",
        "Nubosidad",
        "Luminosidad",
        "Índice UV",
      ],
      en: [
        "Temperature",
        "Wind and gust",
        "Rain and probability",
        "Relative humidity",
        "Cloud cover",
        "Luminosity",
        "UV index",
      ],
    };

    // Key order (coincide con labels)
    const keys = [
      "temp",
      "windCombined",
      "rainCombined",
      "humidity",
      "cloudCover",
      "luminance",
      "uvindex",
    ];


    // Construye etiquetas con unidades para los keys interesados
    // Usamos HTML para poder forzar que ciertas partes queden en minúsculas
    const labelsHTML = labels[lang].map((txt, i) => {
      const key = keys[i];
      if (key === "temp") {
        // temperatura: dejar unidad como está (ej. ºC / ºF)
        return `${txt} (<span class="unit-temp">${tempUnitLabel}</span>)`;
      }
      if (key === "windCombined") {
        // viento: forzar unidad en minúsculas dentro del header
        return `${txt} (<span class="unit-lower" style="text-transform:lowercase">${windUnitLabel}</span>)`;
      }
      if (key === "rainCombined") {
        // lluvia: forzar unidad en minúsculas dentro del header
        return `${txt} (<span class="unit-lower" style="text-transform:lowercase">${precipUnitLabel || 'mm'}</span>)`;
      }
      return txt;
    });
 
     // Ahora iterar como antes pero usando labelsWithUnits
     keys.forEach((key, idx) => {
       row = document.createElement("tr");
       const th = document.createElement("th");
      // Insertamos HTML para poder controlar transformación del texto (minúsculas para unidades)
      th.innerHTML = labelsHTML[idx];
       row.appendChild(th);
       viewData.forEach((w, i) => {
         const td = document.createElement("td");
         const val = w[key];
         // Solo viento, racha y precipitación con decimales, resto enteros
         if (key === "windCombined" || key === "rainCombined") {
           // innerHTML porque los valores incluyen iconos o formato HTML
           td.innerHTML = val || "-";
         } else if (key === "temp") {
          
           // temperatura: una sola línea con símbolo º, mismo estilo que combined-top
           td.innerHTML = formatTempCell(val);
         } else if (key === "humidity") {
           td.textContent = (val == null) ? "-" : `${Math.round(val)}%`;
         } else if (key === "cloudCover") {
           td.textContent = (val == null) ? "-" : `${Math.round(val)}%`;
         } else if (key === "luminance") {
           td.innerHTML = luminanceBarHTML(val);
         } else {
           const decimalKeys = ["precipitation", "windSpeed", "windGust"];
           td.textContent =
             val !== null && val !== undefined
               ? (decimalKeys.includes(key)
                   ? Number(val).toFixed(1)
                   : Math.round(Number(val)))
               : "-";
         }
         td.dataset.col = String(i);
         td.dataset.ori = String(viewOriginalIndexMap[i]);
         row.appendChild(td);
       });
       thead.appendChild(row);
     });

    table.appendChild(thead);

    // Clicks on any generated cell/header select that column
    wireTableInteractions();

    (function ensureMinWidth() {
      const root = getComputedStyle(document.documentElement);
      const toPx = (v) => parseFloat(v) || 0;
      const firstCol = toPx(root.getPropertyValue('--cw-first-col')); // px
      const colMin  = toPx(root.getPropertyValue('--cw-col-min'));   // px
      const cols = Array.isArray(weatherData) ? weatherData.length : 0; // columns generated
      const minW = Math.max(600, Math.ceil(firstCol + Math.max(0, cols) * colMin));
      table.style.minWidth = `${minW}px`;
    })();
  }
function luminanceBarHTML(val) {
    if (val == null) return "-";
    const v = Math.max(0, Math.min(1, Number(val)));
    const w = Math.round(v * 100);
    return `
      <div style="height:8px;background:#e5e7eb;border-radius:6px;overflow:hidden">
        <div style="width:${w}%;height:100%;background:#f59e0b"></div>
      </div>
    `;
  }
  function styleByIntensity(intensity) {
  // Tamaño base (en px para el SVG), color de relleno y del trazo
  switch (intensity) {
    case 'suave':      return { base: 16, stroke: 1.2, fill: '#60a5fa', strokeColor: '#1d4ed8' }; // azul claro
    case 'media':      return { base: 20, stroke: 1.6, fill: '#2563eb', strokeColor: '#1e40af' }; // azul
    case 'fuerte':     return { base: 24, stroke: 2.0, fill: '#ef4444', strokeColor: '#991b1b' }; // rojo
    case 'muy_fuerte': return { base: 26, stroke: 2.2, fill: '#8b5cf6', strokeColor: '#6d28d9' }; // lila
    default:           return { base: 18, stroke: 1.4, fill: '#2563eb', strokeColor: '#1e40af' };
  }
  }

  function getWindRotation(degrees) {
    // Convierte dirección viento "de donde viene" a "hacia donde va"
    return (degrees + 180) % 360;
  }


  function formatWindCell(speed, gust, directionDegrees) {
    // Devuelve HTML: primera línea velocidad + flecha; segunda línea (racha)
    if (speed == null) return "-";

    // Flecha si hay dirección
    let arrowHTML = "";
    if (directionDegrees != null) {
      const rotation = (directionDegrees + 90) % 360;
      arrowHTML = `<span class="wind-arrow" style="display:inline-block; transform: rotate(${rotation}deg); margin-left:6px;">➜</span>`;
    }

    const top = `<span class="combined-top">${Number(speed).toFixed(1)}${arrowHTML}</span>`;

    const bottom = (gust == null)
      ? ""
      : `<span class="combined-bottom">(${Number(gust).toFixed(1)})</span>`;

    return `<div class="weather-combined">${top}${bottom}</div>`;
  }

  // NEW: selection helpers
  function wireTableInteractions() {
    const table = document.getElementById("weatherTable");
    if (!table) return;
    table.addEventListener("click", (ev) => {
      const cell = ev.target.closest("[data-col]");
      if (!cell) return;
      const col = Number(cell.dataset.col);
      if (!Number.isFinite(col)) return;
      selectViewCol(col, true); // center map on selection
    });
  }
  function clearTableSelection() {
    const table = document.getElementById("weatherTable");
    if (!table) return;
    table.querySelectorAll(".selected").forEach(el => el.classList.remove("selected"));
  }
  function highlightColumn(col) {
    const table = document.getElementById("weatherTable");
    if (!table) return;
    clearTableSelection();
    table.querySelectorAll(`[data-col="${col}"]`).forEach(el => el.classList.add("selected"));

    // Robust horizontal centering into view
    const container = document.getElementById("weatherTableContainer");
    const headCell =
      table.querySelector(`thead tr:first-child th[data-col="${col}"]`) ||
      table.querySelector(`thead th[data-col="${col}"]`) ||
      table.querySelector(`[data-col="${col}"]`);
    if (container && headCell) {
      const cRect = container.getBoundingClientRect();
      const hRect = headCell.getBoundingClientRect();
      const targetLeft = container.scrollLeft + (hRect.left - cRect.left);
      const centeredLeft = targetLeft - (container.clientWidth - hRect.width) / 2;
      container.scrollTo({ left: Math.max(0, Math.round(centeredLeft)), behavior: "smooth" });
    }
  }
  function highlightMapStep(originalIdx, center = false) {
    // reset wind glyph highlight
    windMarkers.forEach(m => {
      const el = m && m.getElement && m.getElement();
      if (el) {
        el.classList.remove("is-selected");
      }
    });
    selectedOriginalIdx = originalIdx;

    const wm = windMarkers[originalIdx];
    if (wm) {
      const el = wm.getElement && wm.getElement();
      if (el) {
        el.classList.add("is-selected");
      }
      if (center && map && weatherData[originalIdx]) {
        const p = weatherData[originalIdx];
        map.panTo([p.lat, p.lon], { animate: true });
      }
    }
  }

  function selectViewCol(col, centerMap = false) {
    if (!Array.isArray(viewOriginalIndexMap) || col < 0 || col >= viewOriginalIndexMap.length) return;
    const originalIdx = viewOriginalIndexMap[col];
    highlightColumn(col);
    highlightMapStep(originalIdx, centerMap);
  }
  function selectByOriginalIdx(originalIdx, centerMap = false) {
    highlightMapStep(originalIdx, centerMap);
    const col = colIndexByOriginal[originalIdx];
    if (col !== undefined) highlightColumn(col);
  }

  function renderWindMarkers() {
    // Clear previous
    windMarkers.forEach(m => map.removeLayer(m));
    windMarkers = [];
    rainMarkers.forEach(m => map.removeLayer(m));
    rainMarkers = [];

    if (!weatherData?.length) return;

    const PRECIP_MIN = 0.1;
    const PROB_MIN   = 20;

    const metersBetween = (a, b) =>
      haversine({ lat: a[0], lon: a[1] }, { lat: b[0], lon: b[1] }) * 1000;

    for (let i = 0; i < weatherData.length; i++) {
      const data = weatherData[i];
      if (data?.lat == null || data?.lon == null) continue;

      const p0 = i > 0 ? { lat: weatherData[i-1].lat, lon: weatherData[i-1].lon } : { lat: data.lat, lon: data.lon };
      const p1 = i < weatherData.length-1 ? { lat: weatherData[i+1].lat, lon: weatherData[i+1].lon } : { lat: data.lat, lon: data.lon };

      // Unit normal and tangent (in degrees space)
      const dx = p1.lon - p0.lon, dy = p1.lat - p0.lat;
      const len = Math.hypot(dx, dy) || 1;
      const tx = dx / len, ty = dy / len; // tangent
      const { nx, ny } = normalUnit(p0, p1); // normal (perpendicular)

      // Wind direction and speed
      const dirFrom = Number(data.windDir ?? 0);
      const speedKmh = Number(data.windSpeed ?? 0);
      const gustKmh  = Number(data.windGust ?? 0);
      const speedForIcon = windIntensityValue(speedKmh, gustKmh);

      // Offsets (meters)
      const OFF_WIND = 14;
      const OFF_RAIN = 16;
      const SHIFT_T  = 10;
      const rainShiftMeters = (i % 2 === 0) ? SHIFT_T : -SHIFT_T;

      // Positions
      const wPos = offsetLatLng(data.lat, data.lon, nx, ny, OFF_WIND);
      const rPosShift = offsetLatLng(data.lat, data.lon, tx, ty, rainShiftMeters);
      let rPos = offsetLatLng(rPosShift[0], rPosShift[1], -nx, -ny, OFF_RAIN);
      if (metersBetween(wPos, rPos) < 22) {
        rPos = offsetLatLng(rPos[0], rPos[1], -nx, -ny, 8);
      }

      // Wind marker (interactive)
      const windIcon = makeWindSVGIcon(dirFrom, speedForIcon);
      const wMarker = L.marker([wPos[0], wPos[1]], { icon: windIcon, pane: 'windPane' })
        .addTo(map)
        .on('click', () => selectByOriginalIdx(i, true));
      wMarker.setZIndexOffset(1000);
      windMarkers.push(wMarker);

      // Optional rain drop
      const precip = Number(data.precipitation ?? 0);
      const prob   = Number(data.precipProb ?? 0);
      const showDrop = (precip >= PRECIP_MIN) || (prob >= PROB_MIN);
      if (showDrop) {
        const rainIcon = L.divIcon({
          html: `<span class="rain-glyph">💧</span>`,
          className: "rain-icon",
          iconSize: [24, 24],
          iconAnchor: [12, 24]
        });
        L.marker([rPos[0], rPos[1]], { icon: rainIcon, pane: 'windPane' })
          .addTo(map)
          .setZIndexOffset(900);
      }
    }

    if (trackLayer?.bringToBack) trackLayer.bringToBack();
    windMarkers.forEach(m => m.setZIndexOffset(1000));

    if (selectedOriginalIdx != null) {
      highlightMapStep(selectedOriginalIdx, false);
    }
  }

  function showLoading() {
    const el = document.getElementById("loadingOverlay");
    if (!el) return;
    el.style.visibility = "visible";
    el.style.opacity = "1";
    el.style.pointerEvents = "auto";
  }
  function hideLoading() {
    const el = document.getElementById("loadingOverlay");
    if (!el) return;
    el.style.opacity = "0";
    el.style.visibility = "hidden";
    el.style.pointerEvents = "none";
  }
  function toggleConfig() {
    const menu = document.getElementById("configMenu");
    menu.style.display =
      menu.style.display === "none" || menu.style.display === ""
        ? "block"
        : "none";
  }
  function toggleDebug() {
    const dbg = document.getElementById("debugSection");
    dbg.style.display =
      dbg.style.display === "none" || dbg.style.display === ""
        ? "block"
        : "none";
    // NEW: tie viewport badge visibility to Debug
    const vp = document.getElementById("vpBadge");
    if (vp) vp.style.display = (dbg.style.display === "block") ? "block" : "none";
  }
  async function reloadFull() {
    if (!lastGPXFile) {
      // No mostrar mensaje cuando no hay fichero seleccionado (comportamiento silencioso)
      return;
    }
    const reader = new FileReader();
    
    reader.onload = async function (e) {
      try {
        if (trackLayer) map.removeLayer(trackLayer);
        trackLayer = new L.GPX(e.target.result, {
          async: true,
          polyline_options: { color: 'blue' },
          marker_options: {
            startIconUrl:
              "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
            endIconUrl:
              "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
            shadowUrl:
              "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
            // opcionales:
            wptIconUrl: null
          }
        });

        trackLayer.on("loaded", async (evt) => {
          map.fitBounds(evt.target.getBounds());
          await segmentRouteByTime(evt.target.toGeoJSON());
          let routeName = evt.target.get_name ? evt.target.get_name() : null;
          if (!routeName && evt.target.get_metadata) {
            let meta = evt.target.get_metadata();
            routeName = meta && meta.name ? meta.name : null;
          }
          if (routeName) {
            document.getElementById("rutaName").textContent =
              t("route_prefix") + routeName;
          }

          const layer = evt.target;

          // Reemplazo robusto de iconos (usa tanto layer como fallback sobre el mapa)
          replaceGPXMarkers(layer);

          // Si aún quieres mantener la lógica previa de markers[] puedes dejarla como backup,
          // pero la función anterior ya cubre la mayoría de situaciones.

          map.fitBounds(evt.target.getBounds(), {
            padding: [20, 20], // Puedes ajustar el padding si quieres más/menos borde
            maxZoom: 15        // Opcional: así no se acerca demasiado
          });
        });

        trackLayer.addTo(map);
      } catch (err) {
        alert(t("error_reading_gpx", { msg: err.message }));
        logDebug(t("error_reading_gpx", { msg: err.message }), true);
      }
    };
    reader.readAsText(lastGPXFile);
  }

  // Añadir helper robusto para reemplazar iconos start/end del GPX
  function replaceGPXMarkers(layer) {
    const markers = [];
    // Recolecta marcadores de forma recursiva (layer puede ser FeatureGroup/LayerGroup)
    function collect(l) {
      if (!l) return;
      if (l instanceof L.Marker) {
        markers.push(l);
      } else if (typeof l.eachLayer === "function") {
        l.eachLayer((sub) => collect(sub));
      }
    }
    collect(layer);

    // Fallback: si no encontró ninguno en el layer, buscar en el mapa dentro de los bounds del layer
    if (markers.length === 0 && layer && typeof layer.getBounds === "function") {
      const bounds = layer.getBounds();
      map.eachLayer((l) => {
        if (l instanceof L.Marker) {
          try {
            if (bounds.contains(l.getLatLng())) markers.push(l);
          } catch (e) { /* ignore */ }
        }
      });
    }

    logDebug(`replaceGPXMarkers: encontrados ${markers.length} marcadores GPX`);

    if (markers.length === 0) return;

    const startIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [16, 30],      // reducido
      iconAnchor: [9, 30],
      shadowSize: [30, 30],
      shadowAnchor: [9, 30],
      className: 'gpx-marker-start'
    });

    const endIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [16, 30],      // reducido
      iconAnchor: [9, 30],
      shadowSize: [30, 30],
      shadowAnchor: [9, 30],
      className: 'gpx-marker-end'
    });

    try {
      markers[0].setIcon(startIcon);
      markers[markers.length - 1].setIcon(endIcon);
      logDebug("replaceGPXMarkers: iconos start/end aplicados");
    } catch (err) {
      logDebug("replaceGPXMarkers: error al aplicar iconos - " + err.message, true);
    }
  }

  let resizeDebTimer = null; // for debounced resize

  function ensureTrackVisible() {
    if (!map || !trackLayer || !trackLayer.getBounds) return;
    const trackBounds = trackLayer.getBounds();
    const mapBounds = map.getBounds();
    if (mapBounds && trackBounds && mapBounds.contains(trackBounds)) return; // already fully visible
    map.fitBounds(trackBounds, { padding: [12, 12], maxZoom: 15 });
  }
  function scheduleMapResizeRecenter() {
    if (resizeDebTimer) clearTimeout(resizeDebTimer);
    resizeDebTimer = setTimeout(() => {
      if (!map) return;
      map.invalidateSize();
      ensureTrackVisible();
    }, 180);
  }

  function initMap() {
    map = L.map("map").setView([41.3874, 2.1686], 14);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    // Enable clicks on wind markers
    const windPane = map.createPane('windPane');
    windPane.style.zIndex = 650;
    windPane.style.pointerEvents = 'auto';

    // Prevent map from taking focus/zoom by default; enable only on interaction
    map.scrollWheelZoom.disable();
    map.keyboard.disable();
    map.touchZoom.disable();
    const mapC = map.getContainer();
    if (mapC) mapC.tabIndex = -1; // not focusable by default

    let wheelEnabled = false;
    const enableWheelZoom = () => { if (!wheelEnabled) { map.scrollWheelZoom.enable(); wheelEnabled = true; } };
    const disableWheelZoom = () => { if (wheelEnabled) { map.scrollWheelZoom.disable(); wheelEnabled = false; } };

    if (mapC) {
      mapC.addEventListener('mousedown', () => {
        enableWheelZoom(); // user explicitly interacts with the map
      }, { passive: true });
      mapC.addEventListener('mouseleave', () => {
        disableWheelZoom(); // stop zooming when pointer leaves the map
      }, { passive: true });

      // Touch: enable pinch-zoom on interaction, auto-disable shortly after
      let touchTimer = null;
      mapC.addEventListener('touchstart', () => {
        try { map.touchZoom.enable(); } catch {}
        if (touchTimer) clearTimeout(touchTimer);
      }, { passive: true });
      const endTouch = () => {
        touchTimer = setTimeout(() => {
          try { map.touchZoom.disable(); } catch {}
        }, 800);
      };
      mapC.addEventListener('touchend', endTouch, { passive: true });
      mapC.addEventListener('touchcancel', endTouch, { passive: true });
    }

    // Ajusta la curva a tu rango de zoom; ej: z=6 -> 14px y +2px por nivel
    const setWindScale = (z) => {
      const px = Math.round(14 + (z - 6) * 2);
      document.documentElement.style.setProperty('--wind-font', `${px}px`);
    }
    map.on('zoomend', () => setWindScale(map.getZoom()));
    setWindScale(map.getZoom()); // inicializa tamaño al entrar
    var compass = new L.Control.Compass({
      autoActive: true,
      showDigit: false,
      position: 'topright'
    });
    compass.addTo(map);
    
  }
  function bindUIEvents() {
    document
      .getElementById("toggleConfig")
      .addEventListener("click", toggleConfig);
    document
      .getElementById("toggleDebug")
      .addEventListener("click", toggleDebug);

    document.getElementById("closeConfig").addEventListener("click", () => {
      document.getElementById("configMenu").style.display = "none";
    });

    // file input change (mantengo comportamiento sin mostrar nombre del fichero)
    document.getElementById("gpxFile").addEventListener("change", function () {
      if (!this.files.length) {
        lastGPXFile = null;
        return;
      }
      lastGPXFile = this.files[0];
      const val = (this.files[0].name) || (this.value.split("\\").pop() || this.value.split("/").pop() || "");
      const rutaBase = val.replace(/\.[^/.]+$/, "");
      const rutaEl = document.getElementById("rutaName");
      if (rutaEl) rutaEl.textContent = rutaBase ? t("route_prefix") + rutaBase : "";
      reloadFull();
    });

    const dtEl = document.getElementById("datetimeRoute");
    if (dtEl) {
      dtEl.addEventListener("change", () => {
        if (!dtEl.value) return;
        // Parse en local a partir de "YYYY-MM-DDTHH:mm"
        const [Y, M, D, H, Min] = dtEl.value.split(/[-:T]/).map(Number);
        const localDate = new Date(Y, M - 1, D, H, Min, 0, 0);
        const rounded = roundToNextQuarterISO(localDate);

        if (dtEl.min && new Date(rounded) < new Date(dtEl.min)) {
          dtEl.value = dtEl.min;
        } else {
          dtEl.value = rounded;
        }
        reloadFull();
      });
    }

    // Elementos que sí disparan recarga al cambiar (NO incluir cyclingSpeed)
    [
      "language",
      "windUnits",
      "tempUnits",
      "apiKey",
      "apiKeyOW",
      "apiSource",
      "intervalSelect",
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("change", () => {
          if (id === "apiSource") {
            apiSource = el.value;
            logDebug(t("api_provider_changed", { prov: apiSource }));

            // NEW: proactive warning if OpenWeather or MeteoBlue selected without key
            if ((apiSource === "meteoblue" || apiSource === "openweather") && !getVal("apiKey") && !getVal("apiKeyOW")) {
              const provName = apiSource === "openweather" ? "OpenWeather" : "MeteoBlue";
              setNotice(t("provider_key_missing", { prov: provName }), "warn");
            } else {
              clearNotice();
            }
          }

          saveSettings();

          if (id === "language") applyTranslations();

          if (["windUnits", "tempUnits"].includes(id) && weatherData.length) {
            updateUnits();
          }

          // NEW: react to apiKey changes for both MB and OWM
          if (id === "apiKey" || id === "apiKeyOW") {
            const hasKey = !!getVal("apiKey") ;
            const hasKeyOW = !!getVal("apiKeyOW");
            if ((apiSource === "meteoblue" ) && !hasKey) {
              const provName = apiSource === "openweather" ? "OpenWeather" : "MeteoBlue";
              setNotice(t("provider_key_missing", { prov: provName }), "warn");
            } else if ((apiSource === "meteoblue" || apiSource === "openweather") && !hasKeyOW) {
              const provName = apiSource === "openweather" ? "OpenWeather" : "MeteoBlue";
              setNotice(t("provider_key_missing", { prov: provName }), "warn");
            } 
            
            else {
              clearNotice();
            }
          }

          reloadFull();
        });
      }
    });

    // Presets dropdown: aplicar inmediatamente (copia valor y recarga)
    const speedPresets = document.getElementById("speedPresets");
    if (speedPresets) {
      speedPresets.addEventListener("change", () => {
        const v = speedPresets.value;
        if (!v) return;
        const cs = document.getElementById("cyclingSpeed");
        if (cs) cs.value = v;
        lastAppliedSpeed = Number(v); // marcar como aplicado
        saveSettings();
        reloadFull();
      });
    }

    // Manual input: sólo aplicar/recargar si el usuario pulsa Enter
    const cyclingInput = document.getElementById("cyclingSpeed");
    if (cyclingInput) {
      cyclingInput.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") {
          lastAppliedSpeed = Number(cyclingInput.value);
          saveSettings();
          reloadFull();
        }
      });
      // Al perder foco: aplicar si el valor ha cambiado respecto al último aplicado
      cyclingInput.addEventListener("blur", () => {
        const v = Number(cyclingInput.value);
        if (!Number.isFinite(v)) return;
        if (lastAppliedSpeed === null || Number(v) !== Number(lastAppliedSpeed)) {
          lastAppliedSpeed = Number(v);
          saveSettings();
          reloadFull();
        }
      });
      // opcional: actualizar presets para reflejar el valor manual (sin recarga)
      cyclingInput.addEventListener("input", () => {
        const presets = document.getElementById("speedPresets");
        if (!presets) return;
        // deseleccionar preset si el valor no coincide exactamente
        const val = cyclingInput.value;
        const opt = Array.from(presets.options).find(o => o.value === val);
        presets.value = opt ? opt.value : "";
      });
    }

    // Bind API key test button
    const chk = document.getElementById("checkApiKey");
    if (chk) chk.addEventListener("click", testMeteoBlueKey);

    // Bind OW API key test button
    const chkOW = document.getElementById("checkApiKeyOW");
    if (chkOW) chkOW.addEventListener("click", testOpenWeatherKey);
  }

  // NEW: inline status helper for API key check
  function setKeyStatus(msg, cls = "") {
    const el = document.getElementById("apiKeyStatus");
    if (!el) return;
    el.className = "key-status" + (cls ? " " + cls : "");
    el.textContent = msg || "";
  }

  // Test current MeteoBlue API key with a simple request at map center and "now"
  async function testMeteoBlueKey() {
    const btn = document.getElementById("checkApiKey");
    const apiKey = getVal("apiKey");
    if (!apiKey) {
      setKeyStatus(t("key_test_missing"), "warn");
      return;
    }
    try {
      if (btn) { btn.disabled = true; btn.classList.add("testing"); }
      setKeyStatus(t("key_testing"), "testing");

      const center = (typeof map !== "undefined" && map?.getCenter) ? map.getCenter() : { lat: 41.3874, lng: 2.1686 };
      const p = { lat: center.lat, lon: center.lng };
      const timeAt = new Date();

      const url = buildProviderUrl("meteoblue", p, timeAt, apiKey, getVal("windUnits"), getVal("tempUnits"));
      const res = await fetch(url);
      if (res.ok) {
        setKeyStatus(t("key_valid"), "ok");
        return;
      }
      const bodyText = await res.text().catch(() => "");
      const code = classifyProviderError("meteoblue", res.status, bodyText);
      if (code === "quota") {
        setKeyStatus(t("key_quota"), "warn");
      } else if (code === "invalid_key" || code === "forbidden") {
        setKeyStatus(t("key_invalid"), "error");
      } else {
        setKeyStatus(t("key_http_error", { status: res.status }), "error");
      }
    } catch (err) {
      setKeyStatus(t("key_network_error", { msg: err.message }), "error");
    } finally {
      if (btn) { btn.disabled = false; btn.classList.remove("testing"); }
    }
  }
  async function testOpenWeatherKey() {
    const btn = document.getElementById("checkApiKeyOW");
    const apiKey = getVal("apiKeyOW");
    if (!apiKey) {
      setKeyStatus(t("key_test_missing"), "warn");
      return;
    }
    try {
      if (btn) { btn.disabled = true; btn.classList.add("testing"); }
      setKeyStatus(t("key_testing"), "testing");

      const center = (typeof map !== "undefined" && map?.getCenter) ? map.getCenter() : { lat: 41.3874, lng: 2.1686 };
      const p = { lat: center.lat, lon: center.lng };
      const timeAt = new Date();

      const url = buildProviderUrl("openweather", p, timeAt, apiKey, getVal("windUnits"), getVal("tempUnits"));
      const res = await fetch(url);
      if (res.ok) {
        setKeyStatus(t("key_valid"), "ok");
        return;
      }
      const bodyText = await res.text().catch(() => "");
      const code = classifyProviderError("openweather", res.status, bodyText);
      if (code === "quota") {
        setKeyStatus(t("key_quota"), "warn");
      } else if (code === "invalid_key" || code === "forbidden") {
        setKeyStatus(t("key_invalid"), "error");
      } else {
        setKeyStatus(t("key_http_error", { status: res.status }), "error");
      }
    } catch (err) {
      setKeyStatus(t("key_network_error", { msg: err.message }), "error");
    } finally {
      if (btn) { btn.disabled = false; btn.classList.remove("testing"); }
    }
  }
  // Aplica traducciones a la UI.
  function applyTranslations() {
    // 1) Elementos con data-i18n -> texto
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.dataset.i18n;
      if (!key) return;
      el.textContent = t(key);
    });

    // 2) Placeholder / title attributes si se usan
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.dataset.i18nPlaceholder;
      if (!key) return;
      el.placeholder = t(key);
    });
    document.querySelectorAll("[data-i18n-title]").forEach((el) => {
      const key = el.dataset.i18nTitle;
      if (!key) return;
      el.title = t(key);
    });

    // 3) Label asociado al input gpxFile (si existe)
    const lbl = document.querySelector('label[for="gpxFile"]');
    if (lbl) lbl.textContent = t("upload_label");

    // 4) Botones/controles conocidos
    const bc = document.getElementById("toggleConfig");
    if (bc) bc.textContent = t("toggle_config");
    const bd = document.getElementById("toggleDebug");
    if (bd) bd.textContent = t("toggle_debug");
    const bclose = document.getElementById("closeConfig");
    if (bclose) bclose.setAttribute("aria-label", t("close"));

    // 5) Document title
    if (typeof document !== "undefined") document.title = t("title");
  }

  function init() {
    initMap();
    bindUIEvents();
    loadSettings();
    applyTranslations();
    // Ajuste del selector de hora: pasos 15 min y valor inicial redondeado hacia arriba
    const dt = document.getElementById("datetimeRoute");
    if (dt) {
      dt.step = 900; // 15 minutos
      const rounded = roundToNextQuarterISO(new Date());
      dt.value = rounded;
    }
    setupDateLimits();

    // Observe map container size changes and window resizes to keep track centered
    const mapEl = document.getElementById("map");
    if (mapEl && typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => scheduleMapResizeRecenter());
      ro.observe(mapEl);
    }
    window.addEventListener("resize", scheduleMapResizeRecenter, { passive: true });
    window.addEventListener("orientationchange", scheduleMapResizeRecenter, { passive: true });

    hideLoading();
    logDebug(t("app_started"));
  }

  // NEW: size the selection halo (ellipse) to the rendered wind glyph
  function updateSelectedHaloSize() {
    const sel = document.querySelector('.wind-divicon.is-selected');
    if (!sel) return;
    const glyphWrap = sel.querySelector('.wind-svg-wrap') || sel.querySelector('.wind-glyph');
    if (!glyphWrap) return;

    const rect = glyphWrap.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return;

    const pad = 4; // px padding around the glyph
    const w = Math.max(8, rect.width) + pad * 2;
    const h = Math.max(8, rect.height) + pad * 2;
    const stroke = Math.max(1, Math.min(2.5, Math.round(rect.width * 0.06)));

    sel.style.setProperty('--sel-w', `${(w * 1.12).toFixed(1)}px`); // slightly wider
    sel.style.setProperty('--sel-h', `${(h * 0.92).toFixed(1)}px`); // slightly flatter
    sel.style.setProperty('--sel-stroke', `${stroke}px`);
  }

  init();

  // --- GPX public loader + postMessage bridge (appended) ---
  async function loadGPXFromString(gpxText, nameHint = "route.gpx") {
    try {
      if (!gpxText || typeof gpxText !== "string") return;
      if (trackLayer) map.removeLayer(trackLayer);
      trackLayer = new L.GPX(gpxText, {
        async: true,
        polyline_options: { color: 'blue' },
        marker_options: {
          startIconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
          endIconUrl:   "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
          shadowUrl:    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
          wptIconUrl: null
        }
      });
      trackLayer.on("loaded", async (evt) => {
        try {
          map.fitBounds(evt.target.getBounds());
          await segmentRouteByTime(evt.target.toGeoJSON());
          const baseName = (nameHint || "route").replace(/\.[^/.]+$/,"");
          const metaName = (evt.target.get_name && evt.target.get_name()) || baseName;
          const rutaEl = document.getElementById("rutaName");
          if (rutaEl) rutaEl.textContent = t("route_prefix") + (metaName || baseName);
          replaceGPXMarkers(evt.target);
          map.fitBounds(evt.target.getBounds(), { padding: [20, 20], maxZoom: 15 });
        } catch (e) {
          logDebug("Error processing GPX: " + e.message, true);
        }
      });
      trackLayer.addTo(map);
    } catch (err) {
      logDebug("Error loading GPX: " + err.message, true);
      alert(t("error_reading_gpx", { msg: err.message }));
    }
  }
  // Expose for external callers (ingest layer / Shortcuts)
  window.cwLoadGPXFromString = loadGPXFromString;

  // Optional: allow Apple Shortcut to postMessage GPX directly
  window.addEventListener("message", (ev) => {
    try {
      const d = ev?.data;
      if (!d || typeof d !== "object") return;
      if (d.type !== "cw-gpx") return;
      const txt = d.gpx || d.payload;
      const name = d.name || "Shared route";
      if (typeof txt === "string" && txt.trim().length) {
        loadGPXFromString(txt, name);
      }
    } catch (_) {}
  }, false);
  // --- end GPX public loader + postMessage bridge ---
});
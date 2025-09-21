/* ====== API CONFIG ====== */
const API_KEY = 'ad636eab8b1bd12294e40601fd2ce5ec'; // replace with your key
const GEO_URL = (q) => `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=1&appid=${API_KEY}`;
const REV_GEO_URL = (lat, lon) => `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`;
const ONECALL_30 = (lat, lon) => `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
const ONECALL_25 = (lat, lon) => `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
const WEATHER_URL = (lat, lon) => `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
const FORECAST_URL = (lat, lon) => `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
const AIR_URL = (lat, lon) => `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;

/* ====== SEARCH SUGGESTIONS CONFIG ====== */
const SUGGEST_LIMIT = 6;
const GEO_SUG_URL = (q) =>
  `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=${SUGGEST_LIMIT}&appid=${API_KEY}`;

/* ====== UTILITIES ====== */
const msToMph = (ms = 0) => (ms * 2.236936).toFixed(0);
const mToMiles = (m = 0) => (m / 1609.344).toFixed(1);
const hPaToInHg = (hPa = 0) => (hPa * 0.0295299830714).toFixed(2);
const mmToInches = (mm = 0) => (mm * 0.0393701).toFixed(2);
const degToCompass = (num = 0) => {
  const val = Math.floor(num / 22.5 + 0.5);
  const arr = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return arr[val % 16];
};
const fmtTime = (ts, tz, opts = { hour: 'numeric', minute: '2-digit' }) =>
  ts ? new Date(ts * 1000).toLocaleTimeString([], { ...opts, timeZone: tz }) : '—';
const fmtDate = (ts, tz, opts = { weekday: 'short' }) =>
  ts ? new Date(ts * 1000).toLocaleDateString([], { ...opts, timeZone: tz }) : '—';

const iconMap = (iconCode) => {
  const code = (iconCode || '').slice(0, 2);
  switch (code) {
    case '01': return { cls: 'fas fa-sun', color: 'text-yellow-400' };
    case '02': return { cls: 'fas fa-cloud-sun', color: 'text-gray-400' };
    case '03': case '04': return { cls: 'fas fa-cloud', color: 'text-gray-500' };
    case '09': return { cls: 'fas fa-cloud-showers-heavy', color: 'text-blue-500' };
    case '10': return { cls: 'fas fa-cloud-rain', color: 'text-blue-400' };
    case '11': return { cls: 'fas fa-bolt', color: 'text-purple-500' };
    case '13': return { cls: 'fas fa-snowflake', color: 'text-cyan-400' };
    case '50': return { cls: 'fas fa-smog', color: 'text-gray-400' };
    default:   return { cls: 'fas fa-sun', color: 'text-yellow-400' };
  }
};
const aqiInfo = (idx) => {
  switch (idx) {
    case 1: return { label: 'Good (1)', dot: 'bg-green-500', text: 'text-green-600', advice: 'Air quality is good. Perfect day for outdoor activities!' };
    case 2: return { label: 'Fair (2)', dot: 'bg-lime-500', text: 'text-lime-600', advice: 'Fair air quality. Sensitive groups should be okay outdoors.' };
    case 3: return { label: 'Moderate (3)', dot: 'bg-yellow-400', text: 'text-yellow-600', advice: 'Moderate air quality. Consider limiting prolonged exertion outdoors.' };
    case 4: return { label: 'Poor (4)', dot: 'bg-orange-500', text: 'text-orange-600', advice: 'Poor air quality. Reduce heavy outdoor activity.' };
    case 5: return { label: 'Very Poor (5)', dot: 'bg-red-500', text: 'text-red-600', advice: 'Very poor air quality. Stay indoors if possible.' };
    default: return { label: '—', dot: 'bg-gray-400', text: 'text-gray-600', advice: '—' };
  }
};
const setSpinning = (spin) => {
  const icon = document.getElementById('refresh-icon');
  if (icon) icon.classList.toggle('animate-spin', !!spin);
};
const el = (id) => document.getElementById(id);

/* Simple debounce */
function debounce(fn, ms = 250) { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; }

/* ====== DISPLAY STATE ====== */
let unit = localStorage.getItem('wp_unit') || 'C'; // 'C' or 'F'
let theme = localStorage.getItem('wp_theme') || 'light';
let favorites = JSON.parse(localStorage.getItem('wp_favs') || '[]'); // [{full, lat, lon}]
let recentPlaces = JSON.parse(localStorage.getItem('wp_recent') || '[]').slice(0, 5);
let lastQuery = 'Dagupan, PH';
let lastCoords = null;
let lastPlaceFull = '—';
let map, mapMarker;

/* ====== UNIT/THEME HELPERS ====== */
function toF(c) { return (c * 9/5) + 32; }
function tempDisplay(c) { if (!Number.isFinite(c)) return '—°'; return unit === 'F' ? `${Math.round(toF(c))}°` : `${Math.round(c)}°`; }
function applyTheme() {
  const html = document.documentElement;
  if (theme === 'dark') html.classList.add('dark'); else html.classList.remove('dark');
  localStorage.setItem('wp_theme', theme);
}
function rerenderTemps() {
  if (lastCoords) loadWeatherByCoords(lastCoords.lat, lastCoords.lon);
  else loadWeatherByCity(lastQuery);
}

/* ====== SEARCH STATE ====== */
const searchInput = el('search-input');
const searchToggleBtn = el('search-toggle');
const suggestionsPanel = el('suggestions');
let suggestionsOpen = false;
let currentSuggestions = [];
function saveRecent(place) {
  recentPlaces = [place, ...recentPlaces.filter((p) => p.full !== place.full)].slice(0, 5);
  localStorage.setItem('wp_recent', JSON.stringify(recentPlaces));
}

/* ====== FETCH HELPERS ====== */
async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) { const err = new Error(`HTTP ${r.status}`); err.status = r.status; throw err; }
  return r.json();
}

/* Try One Call; fallback to /weather + /forecast and normalize */
async function fetchWeatherNormalized(lat, lon) {
  // Try One Call v3 then v2.5
  try { return { data: await getJSON(ONECALL_30(lat, lon)), mode: 'onecall' }; }
  catch (e) {
    if (e.status !== 401) { try { return { data: await getJSON(ONECALL_25(lat, lon)), mode: 'onecall' }; } catch (e2) { if (e2.status !== 401) throw e2; } }
  }
  // Fallback compose
  const [current, forecast] = await Promise.all([ getJSON(WEATHER_URL(lat, lon)), getJSON(FORECAST_URL(lat, lon)) ]);
  const tzOffset = forecast?.city?.timezone ?? 0;
  const tz = 'UTC';

  const now = {
    dt: current.dt,
    sunrise: current.sys?.sunrise,
    sunset: current.sys?.sunset,
    temp: current.main?.temp,
    feels_like: current.main?.feels_like,
    pressure: current.main?.pressure,
    humidity: current.main?.humidity,
    clouds: current.clouds?.all,
    visibility: current.visibility,
    wind_speed: current.wind?.speed,
    wind_deg: current.wind?.deg,
    wind_gust: current.wind?.gust,
    weather: current.weather || [],
    uvi: null,
  };

  const hourly = (forecast.list || []).slice(0, 6).map((h) => ({ dt: h.dt, temp: h.main?.temp, weather: h.weather || [] }));

  const byDay = {};
  for (const it of forecast.list || []) {
    const key = new Date((it.dt + tzOffset) * 1000).toISOString().slice(0, 10);
    (byDay[key] ||= { temps: [], mains: [], dt: it.dt }).temps.push(it.main?.temp);
    byDay[key].mains.push(it.weather?.[0]?.main);
  }
  const daily = Object.values(byDay).slice(0, 7).map((b) => {
    const tmax = Math.round(Math.max(...b.temps));
    const tmin = Math.round(Math.min(...b.temps));
    const main = b.mains.filter(Boolean)[0] || '';
    return { dt: b.dt, temp: { max: tmax, min: tmin }, weather: [{ main }], rain: 0, snow: 0 };
  });

  return { data: { timezone: tz, timezone_offset: tzOffset, current: now, hourly, daily, alerts: [] }, mode: 'composed' };
}

/* ====== RENDERERS ====== */
function renderCurrent(data, place) {
  const current = data?.current ?? {};
  const timezone = data?.timezone;
  const icon = iconMap(current.weather?.[0]?.icon);

  const locName = place?.full || `${place?.name || '—'}${place?.state ? ', ' + place.state : ''}${place?.country ? ' • ' + place.country : ''}`;
  el('location-name').textContent = locName;

  const timeEl = el('current-time');
  if (timeEl) {
    if (timezone && timezone !== 'UTC') {
      timeEl.textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZone: timezone, timeZoneName: 'short' });
      timeEl.dataset.tz = timezone;
    } else {
      const off = data?.timezone_offset ?? 0;
      const sign = off >= 0 ? '+' : '-';
      const hours = Math.floor(Math.abs(off) / 3600);
      timeEl.textContent = `${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} GMT${sign}${hours}`;
      timeEl.dataset.tz = '';
    }
  }

  const iconEl = el('current-icon');
  if (iconEl) iconEl.className = `${icon.cls} ${icon.color} text-6xl mr-4`;

  el('current-temp').textContent = tempDisplay(current.temp);
  el('feels-like').textContent = Number.isFinite(current.feels_like)
    ? `Feels like ${tempDisplay(current.feels_like)}`
    : 'Feels like —°';

  const desc = current.weather?.[0]?.description || current.weather?.[0]?.main || '';
  el('current-desc').textContent = desc ? desc.replace(/\b\w/g, (c) => c.toUpperCase()) : '—';

  const brief = current.clouds == null ? '—'
    : current.clouds <= 25 ? 'Clear skies with gentle breeze'
    : current.clouds <= 60 ? 'Partly cloudy with light winds'
    : 'Overcast conditions';
  el('current-brief').textContent = brief;

  el('visibility').textContent = current.visibility != null ? `${mToMiles(current.visibility)} mi` : '—';
  el('humidity').textContent = current.humidity != null ? `${current.humidity}%` : '—';
  el('wind').textContent = current.wind_speed != null ? `${msToMph(current.wind_speed)} mph` : '—';
  el('pressure').textContent = current.pressure != null ? `${hPaToInHg(current.pressure)} in` : '—';
}

function renderHourly(data) {
  const hourly = data?.hourly ?? [];
  const timezone = data?.timezone;
  const list = el('hourly-list');
  if (!list) return;
  list.innerHTML = '';
  hourly.slice(0, 6).forEach((h) => {
    const ic = iconMap(h.weather?.[0]?.icon);
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0';
    row.innerHTML = `
      <span class="text-muted-foreground">${fmtTime(h.dt, timezone)}</span>
      <div class="flex items-center">
        <i class="${ic.cls} ${ic.color} mr-2"></i>
        <span class="font-semibold">${tempDisplay(h.temp)}</span>
      </div>`;
    list.appendChild(row);
  });
}

function renderForecast(data) {
  const daily = data?.daily ?? [];
  const timezone = data?.timezone;
  const grid = el('forecast-grid');
  if (!grid) return;
  grid.innerHTML = '';
  daily.slice(0, 7).forEach((d, i) => {
    const ic = iconMap(d.weather?.[0]?.icon);
    const dayName = i === 0 ? 'Today' : fmtDate(d.dt, timezone, { weekday: 'short' });
    const card = document.createElement('div');
    const base = i === 0 ? 'bg-card' : 'bg-white';
    const main = d.weather?.[0]?.main || '';
    card.className = `${base} rounded-lg p-4 text-center border border-gray-100 shadow-sm hover:shadow-md transition-shadow`;
    card.innerHTML = `
      <div class="font-semibold text-card-foreground mb-2">${dayName}</div>
      <i class="${ic.cls} ${ic.color} text-3xl mb-3"></i>
      <div class="text-lg font-bold text-card-foreground">${tempDisplay(d?.temp?.max)}</div>
      <div class="text-sm text-muted-foreground">${tempDisplay(d?.temp?.min)}</div>
      <div class="text-xs text-muted-foreground mt-2">${main}</div>`;
    grid.appendChild(card);
  });
}

function renderAQI(aqiData) {
  const idx = aqiData?.list?.[0]?.main?.aqi || 0;
  const info = aqiInfo(idx);
  const dot = el('aqi-dot');
  const text = el('aqi-text');
  const advice = el('air-advice');
  if (dot) dot.className = `w-3 h-3 rounded-full mr-2 ${info.dot}`;
  if (text) { text.className = `font-semibold ${info.text}`; text.textContent = info.label; }
  if (advice) advice.innerHTML = `<i class="fas fa-info-circle text-secondary mr-1"></i> ${info.advice}`;
}

function renderUV(current) {
  const uvi = current?.uvi ?? null;
  let info = { dot: 'bg-gray-400', text: 'text-gray-600', label: '—' };
  if (uvi !== null) {
    if (uvi < 3) info = { dot: 'bg-green-500', text: 'text-green-600', label: `Low (${uvi.toFixed(1)})` };
    else if (uvi < 6) info = { dot: 'bg-orange-400', text: 'text-orange-600', label: `Moderate (${uvi.toFixed(1)})` };
    else if (uvi < 8) info = { dot: 'bg-orange-600', text: 'text-orange-700', label: `High (${uvi.toFixed(1)})` };
    else if (uvi < 11) info = { dot: 'bg-red-500', text: 'text-red-600', label: `Very High (${uvi.toFixed(1)})` };
    else info = { dot: 'bg-purple-600', text: 'text-purple-700', label: `Extreme (${uvi.toFixed(1)})` };
  }
  el('uv-dot').className = `w-3 h-3 rounded-full mr-2 ${info.dot}`;
  el('uv-text').className = `font-semibold ${info.text}`;
  el('uv-text').textContent = info.label;
}

function renderSunMoon(data) {
  const current = data?.current ?? {};
  const daily = data?.daily ?? [];
  const timezone = data?.timezone;
  el('sunrise').textContent = fmtTime(current.sunrise, timezone);
  el('sunset').textContent = fmtTime(current.sunset, timezone);
  const mp = daily?.[0]?.moon_phase;
  el('moon-phase').textContent = mp != null ? (
    mp === 0 || mp === 1 ? '🌑 New Moon' :
    mp < 0.25 ? '🌒 Waxing Crescent' :
    mp === 0.25 ? '🌓 First Quarter' :
    mp < 0.5 ? '🌔 Waxing Gibbous' :
    mp === 0.5 ? '🌕 Full Moon' :
    mp < 0.75 ? '🌖 Waning Gibbous' :
    mp === 0.75 ? '🌗 Last Quarter' : '🌘 Waning Crescent'
  ) : '—';
}

function renderPrecip(daily) {
  const today = daily?.[0] ?? {};
  const todayMm = (today?.rain || 0) + (today?.snow || 0);
  el('precip-today').textContent = `${mmToInches(todayMm)} in`;
  const weekMm = (daily || []).slice(0, 7).reduce((sum, d) => sum + (d.rain || 0) + (d.snow || 0), 0);
  el('precip-week').textContent = `${mmToInches(weekMm)} in`;
  el('precip-month').textContent = 'Unavailable';
}

function renderWind(current) {
  el('wind-speed').textContent = current?.wind_speed != null ? `${msToMph(current.wind_speed)} mph` : '—';
  el('wind-dir').textContent = current?.wind_deg != null ? `${degToCompass(current.wind_deg)} (${current.wind_deg}°)` : '—';
  el('wind-gust').textContent = current?.wind_gust != null ? `${msToMph(current.wind_gust)} mph` : '—';
}

function renderAlerts(alerts) {
  const box = el('alerts-box');
  if (!box) return;
  if (Array.isArray(alerts) && alerts.length) {
    const items = alerts.map((a) => {
      const title = a.event || 'Weather Alert';
      const from = a.start ? new Date(a.start * 1000).toLocaleString() : '';
      const to = a.end ? new Date(a.end * 1000).toLocaleString() : '';
      const desc = (a.description || '').split('\n').slice(0, 3).join(' ');
      return `
        <div class="border border-yellow-200 bg-yellow-50 rounded-lg p-4 mb-3">
          <div class="flex items-start">
            <i class="fas fa-exclamation-triangle text-yellow-500 text-xl mr-3"></i>
            <div>
              <h3 class="font-semibold text-yellow-800">${title}</h3>
              <p class="text-yellow-700 text-xs mb-1">${from && to ? `From: ${from} • To: ${to}` : ''}</p>
              <p class="text-yellow-700 text-sm">${desc || 'See details from your local weather authority.'}</p>
            </div>
          </div>
        </div>`;
    }).join('');
    box.innerHTML = items;
  } else {
    box.innerHTML = `
      <div class="flex items-center">
        <i class="fas fa-check-circle text-green-500 text-xl mr-3"></i>
        <div>
          <h3 class="font-semibold text-green-800">No Active Alerts</h3>
          <p class="text-green-700 text-sm">There are currently no weather alerts for your area.</p>
        </div>
      </div>`;
  }
}

/* ====== MAP, TIPS, BG ====== */
function ensureMap(lat, lon) {
  if (!map) {
    map = L.map('map', { zoomControl: true }).setView([lat, lon], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
  }
  if (!mapMarker) {
    mapMarker = L.marker([lat, lon]).addTo(map);
  } else {
    mapMarker.setLatLng([lat, lon]);
  }
  map.setView([lat, lon], 11);
  const open = document.getElementById('open-maps');
  if (open) open.href = `https://www.google.com/maps?q=${lat},${lon}`;
}
function outfitTip({ tempC, rainMm, windMs }) {
  const t = tempC ?? 25; const windy = windMs >= 8;
  if (rainMm > 0.5) return 'Bring an umbrella or rain jacket. Roads may be slippery.';
  if (t <= 12) return 'Cold outside—wear a warm jacket and closed shoes.';
  if (t <= 18) return 'Light jacket or hoodie recommended.';
  if (t >= 33) return 'Very warm—wear breathable clothes and stay hydrated.';
  if (windy) return 'A bit breezy—consider a light windbreaker.';
  return 'Comfy weather—T-shirt and light pants are fine.';
}
function applySkyBackground(current, isNight) {
  const body = document.body;
  body.classList.remove('sky-clear','sky-cloudy','sky-rain','sky-night');
  const main = current?.weather?.[0]?.main || '';
  if (isNight) body.classList.add('sky-night');
  else if (/Rain|Drizzle|Thunderstorm/i.test(main)) body.classList.add('sky-rain');
  else if (/Cloud/i.test(main)) body.classList.add('sky-cloudy');
  else body.classList.add('sky-clear');

  // particles for rain/snow
  let part = document.querySelector('.particles');
  if (/Rain|Drizzle|Snow/i.test(main)) {
    if (!part) { part = document.createElement('div'); part.className = 'particles'; document.body.appendChild(part); }
  } else if (part) { part.remove(); }
}

/* ====== DATA FLOW ====== */
async function loadAndRender(lat, lon, place) {
  const { data } = await fetchWeatherNormalized(lat, lon);

  renderCurrent(data, place);
  renderHourly(data);
  renderForecast(data);
  renderUV(data.current);
  renderSunMoon(data);
  renderPrecip(data.daily || []);
  renderWind(data.current);
  try { renderAQI(await getJSON(AIR_URL(lat, lon))); } catch {}
  renderAlerts(data.alerts || []);

  // track state
  lastPlaceFull = place?.full || place?.name || lastPlaceFull;
  lastCoords = { lat, lon };

  // map + extras
  ensureMap(lat, lon);

  const today = (data.daily && data.daily[0]) || {};
  const tempC = data.current?.temp;
  const rainMm = (today?.rain || 0) + (today?.snow || 0);
  const windMs = data.current?.wind_speed || 0;
  el('outfit-tip').textContent = outfitTip({ tempC, rainMm, windMs });

  const now = (data.current?.dt || Math.floor(Date.now()/1000));
  const isNight = data.current?.sunset && data.current?.sunrise ? (now < data.current.sunrise || now > data.current.sunset) : false;
  applySkyBackground(data.current, isNight);
}

async function loadWeatherByCity(city) {
  try {
    setSpinning(true);
    const geo = await getJSON(GEO_URL(city));
    if (!geo.length) throw new Error('Location not found');
    const g = geo[0];
    lastQuery = city;
    const place = { name: g.name, state: g.state, country: g.country, full: `${g.name}${g.state ? ', ' + g.state : ''}${g.country ? ', ' + g.country : ''}` };
    await loadAndRender(g.lat, g.lon, place);
  } catch (e) {
    alert(`Could not load weather for "${city}". ${e.message || e}`);
    console.error(e);
  } finally { setSpinning(false); }
}
async function loadWeatherByCoords(lat, lon) {
  try {
    setSpinning(true);
    const rev = await getJSON(REV_GEO_URL(lat, lon)).catch(() => []);
    const g = rev?.[0];
    const place = g ? { name: g.name, state: g.state, country: g.country, full: `${g.name}${g.state ? ', ' + g.state : ''}${g.country ? ', ' + g.country : ''}` }
                    : { full: `Lat ${lat.toFixed(2)}, Lon ${lon.toFixed(2)}` };
    await loadAndRender(lat, lon, place);
  } catch (e) {
    alert(`Could not load weather for your location. ${e.message || e}`);
    console.error(e);
  } finally { setSpinning(false); }
}

/* ====== CLOCK ====== */
function updateClock() {
  const timeEl = el('current-time'); if (!timeEl) return;
  const tz = timeEl.dataset.tz;
  const now = tz
    ? new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZone: tz, timeZoneName: 'short' })
    : new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  timeEl.textContent = now;
}

/* ====== FAVORITES BAR ====== */
function renderFavorites() {
  const bar = el('fav-bar'); if (!bar) return;
  bar.innerHTML = favorites.map((p, i) => `
    <span class="fav-chip" data-i="${i}">
      <i class="fas fa-map-pin text-secondary"></i>
      ${p.full}
      <i class="fas fa-times remove"></i>
    </span>
  `).join('') || `<span class="text-xs text-muted-foreground">No favorites yet</span>`;
}
el('fav-bar').addEventListener('click', (e) => {
  const chip = e.target.closest('.fav-chip'); if (!chip) return;
  const i = Number(chip.dataset.i);
  if (e.target.classList.contains('remove')) {
    favorites.splice(i,1);
    localStorage.setItem('wp_favs', JSON.stringify(favorites));
    renderFavorites();
    return;
  }
  const p = favorites[i];
  if (p) loadAndRender(p.lat, p.lon, p);
});
el('fav-add').addEventListener('click', () => {
  if (!lastCoords || !lastPlaceFull) return;
  const p = { full: lastPlaceFull, lat: lastCoords.lat, lon: lastCoords.lon };
  if (!favorites.find(f => f.full === p.full)) {
    favorites.unshift(p); favorites = favorites.slice(0,8);
    localStorage.setItem('wp_favs', JSON.stringify(favorites));
    renderFavorites();
  }
});

/* ====== SEARCH SUGGESTIONS UI ====== */
function renderDefaultSuggestions() {
  const items = [];
  items.push(`
    <button data-action="use-current" class="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2">
      <i class="fas fa-location-arrow text-secondary"></i> Use current location
    </button>`);
  if (recentPlaces.length) {
    items.push(`<div class="px-4 pt-2 pb-1 text-xs uppercase tracking-wide text-gray-500">Recent</div>`);
    recentPlaces.forEach((p, idx) => {
      items.push(`<button data-idx="${idx}" data-type="recent" class="w-full text-left px-4 py-2 hover:bg-gray-50">${p.full}</button>`);
    });
  } else {
    items.push(`<div class="px-4 py-2 text-sm text-muted-foreground">No recent searches</div>`);
  }
  suggestionsPanel.innerHTML = items.join('');
}
function renderSuggestions(list) {
  if (!list?.length) {
    suggestionsPanel.innerHTML = `<div class="p-3 text-sm text-muted-foreground">No results. Try another query.</div>`;
    return;
  }
  currentSuggestions = list.map((g) => ({
    name: g.name, state: g.state, country: g.country, lat: g.lat, lon: g.lon,
    full: `${g.name}${g.state ? ', ' + g.state : ''}${g.country ? ', ' + g.country : ''}`,
  }));
  suggestionsPanel.innerHTML = currentSuggestions.map((p, i) => `
    <button data-idx="${i}" data-type="geo" class="w-full text-left px-4 py-2 hover:bg-gray-50">
      <div class="font-medium">${p.name}</div>
      <div class="text-xs text-muted-foreground">${[p.state, p.country].filter(Boolean).join(' • ')}</div>
    </button>
  `).join('');
}
function openSuggestions() { renderDefaultSuggestions(); suggestionsPanel.classList.remove('hidden'); searchInput.setAttribute('aria-expanded', 'true'); suggestionsOpen = true; }
function closeSuggestions() { suggestionsPanel.classList.add('hidden'); searchInput.setAttribute('aria-expanded', 'false'); suggestionsOpen = false; }
function selectPlace(p) { searchInput.value = p.full; saveRecent(p); loadAndRender(p.lat, p.lon, p); }

/* Events: suggestions */
searchToggleBtn.addEventListener('click', (e) => { e.stopPropagation(); suggestionsOpen ? closeSuggestions() : openSuggestions(); });
const doSuggest = debounce(async (q) => {
  if (!q || q.length < 2) { renderDefaultSuggestions(); return; }
  try { renderSuggestions(await getJSON(GEO_SUG_URL(q))); }
  catch { suggestionsPanel.innerHTML = `<div class="p-3 text-sm text-muted-foreground">Could not load suggestions.</div>`; }
}, 250);
searchInput.addEventListener('input', (e) => { if (!suggestionsOpen) openSuggestions(); doSuggest(e.target.value.trim()); });
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const q = e.currentTarget.value.trim(); if (!q) return;
    if (currentSuggestions.length) selectPlace(currentSuggestions[0]); else loadWeatherByCity(q);
    closeSuggestions();
  }
});
suggestionsPanel.addEventListener('click', (e) => {
  const btn = e.target.closest('button'); if (!btn) return;
  if (btn.dataset.action === 'use-current') {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => loadWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
        () => loadWeatherByCity(lastQuery),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
      );
    } else { loadWeatherByCity(lastQuery); }
    closeSuggestions(); return;
  }
  const idx = Number(btn.dataset.idx); const type = btn.dataset.type;
  if (type === 'geo' && currentSuggestions[idx]) selectPlace(currentSuggestions[idx]);
  else if (type === 'recent' && recentPlaces[idx]) selectPlace(recentPlaces[idx]);
  closeSuggestions();
});
document.addEventListener('click', (e) => { if (!suggestionsOpen) return; if (!document.getElementById('searchbox').contains(e.target)) closeSuggestions(); });

/* ====== NAV/UNIT/THEME/REFRESH EVENTS ====== */
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault(); const target = document.querySelector(this.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});
el('refresh-btn').addEventListener('click', () => { if (lastCoords) loadWeatherByCoords(lastCoords.lat, lastCoords.lon); else loadWeatherByCity(lastQuery); });

// Theme toggle & unit buttons
document.getElementById('theme-toggle').addEventListener('click', () => { theme = theme === 'dark' ? 'light' : 'dark'; applyTheme(); });
const unitC = document.getElementById('unit-c');
const unitF = document.getElementById('unit-f');
function paintUnitButtons() {
  unitC.classList.toggle('bg-secondary/10', unit === 'C');
  unitF.classList.toggle('bg-secondary/10', unit === 'F');
}
unitC.addEventListener('click', () => { unit = 'C'; localStorage.setItem('wp_unit','C'); paintUnitButtons(); rerenderTemps(); });
unitF.addEventListener('click', () => { unit = 'F'; localStorage.setItem('wp_unit','F'); paintUnitButtons(); rerenderTemps(); });

/* ====== INIT ====== */
(function init() {
  applyTheme(); paintUnitButtons(); renderFavorites();

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => loadWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
      () => loadWeatherByCity(lastQuery),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
    );
  } else { loadWeatherByCity(lastQuery); }

  updateClock();
  setInterval(updateClock, 60000);
})();

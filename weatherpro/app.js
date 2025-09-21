/* ====== CONFIG ====== */
const API_KEY = 'ad636eab8b1bd12294e40601fd2ce5ec'; // put your own key here
const GEO_URL = (q) =>
  `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=1&appid=${API_KEY}`;
const REV_GEO_URL = (lat, lon) =>
  `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`;

const ONECALL_30 = (lat, lon) =>
  `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
const ONECALL_25 = (lat, lon) =>
  `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;

const WEATHER_URL = (lat, lon) =>
  `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
const FORECAST_URL = (lat, lon) =>
  `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;

const AIR_URL = (lat, lon) =>
  `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;

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
const moonPhaseText = (p) => {
  if (p === 0 || p === 1) return '🌑 New Moon';
  if (p < 0.25) return '🌒 Waxing Crescent';
  if (p === 0.25) return '🌓 First Quarter';
  if (p < 0.5) return '🌔 Waxing Gibbous';
  if (p === 0.5) return '🌕 Full Moon';
  if (p < 0.75) return '🌖 Waning Gibbous';
  if (p === 0.75) return '🌗 Last Quarter';
  return '🌘 Waning Crescent';
};

const setSpinning = (spin) => {
  const icon = document.getElementById('refresh-icon');
  if (icon) icon.classList.toggle('animate-spin', !!spin);
};
const el = (id) => document.getElementById(id);

/* ====== FETCH HELPERS ====== */
async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) {
    const err = new Error(`HTTP ${r.status}`);
    err.status = r.status;
    throw err;
  }
  return r.json();
}

/* Try One Call, else fall back to free /weather + /forecast and normalize the structure */
async function fetchWeatherNormalized(lat, lon) {
  // 1) One Call v3, then v2.5
  try {
    const data = await getJSON(ONECALL_30(lat, lon));
    return { data, mode: 'onecall' };
  } catch (e) {
    if (e.status !== 401) {
      // try v2.5 if not auth issue
      try {
        const data2 = await getJSON(ONECALL_25(lat, lon));
        return { data: data2, mode: 'onecall' };
      } catch (e2) {
        if (e2.status !== 401) throw e2; // different error, bubble up
      }
    }
  }

  // 2) Fallback: build a OneCall-like object from /weather + /forecast
  const [current, forecast] = await Promise.all([
    getJSON(WEATHER_URL(lat, lon)),
    getJSON(FORECAST_URL(lat, lon)),
  ]);

  const timezoneOffset = forecast?.city?.timezone ?? 0;
  const tz = 'UTC'; // we’ll show GMT± via offset; browsers need an IANA tz but not provided by API

  // Build "current"
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
    wind_speed: current.wind?.speed, // m/s already
    wind_deg: current.wind?.deg,
    wind_gust: current.wind?.gust,
    weather: current.weather || [],
    uvi: null, // not in free endpoints
  };

  // Build "hourly" from next 6 forecast items (3-hour step)
  const hourly = (forecast.list || []).slice(0, 6).map((h) => ({
    dt: h.dt,
    temp: h.main?.temp,
    weather: h.weather || [],
  }));

  // Build "daily" (7 buckets) from forecast by date (min/max & main)
  const byDay = {};
  for (const it of forecast.list || []) {
    const d = new Date((it.dt + timezoneOffset) * 1000); // shift by tz offset
    const key = d.toISOString().slice(0, 10);
    byDay[key] ||= { temps: [], mains: [], dt: it.dt };
    byDay[key].temps.push(it.main?.temp);
    byDay[key].mains.push(it.weather?.[0]?.main);
  }
  const days = Object.values(byDay)
    .slice(0, 7)
    .map((b) => {
      const tmax = Math.round(Math.max(...b.temps));
      const tmin = Math.round(Math.min(...b.temps));
      const main = b.mains
        .filter(Boolean)
        .sort((a,b)=> byDay.mains ? 0 : 0)[0] || '';
      return {
        dt: b.dt,
        temp: { max: tmax, min: tmin },
        weather: [{ main }],
        rain: 0, snow: 0, // not available from free forecast in a simple way
      };
    });

  const normalized = {
    timezone: tz,          // we can still render times with the offset text below
    timezone_offset: timezoneOffset,
    current: now,
    hourly,
    daily: days,
    alerts: [],
  };

  return { data: normalized, mode: 'composed' };
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
    // If we have an IANA tz, use it; else show GMT offset
    if (timezone && timezone !== 'UTC') {
      timeEl.textContent = new Date().toLocaleTimeString([], {
        hour: 'numeric', minute: '2-digit', timeZone: timezone, timeZoneName: 'short',
      });
      timeEl.dataset.tz = timezone;
    } else {
      const off = data?.timezone_offset ?? 0;
      const sign = off >= 0 ? '+' : '-';
      const hours = Math.floor(Math.abs(off) / 3600);
      timeEl.textContent = `${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} GMT${sign}${hours}`;
      timeEl.dataset.tz = ''; // no IANA tz
    }
  }

  const iconEl = el('current-icon');
  if (iconEl) iconEl.className = `${icon.cls} ${icon.color} text-6xl mr-4`;

  el('current-temp').textContent = Number.isFinite(current.temp) ? `${Math.round(current.temp)}°` : '—°';
  el('feels-like').textContent = Number.isFinite(current.feels_like) ? `Feels like ${Math.round(current.feels_like)}°` : 'Feels like —°';

  const desc = current.weather?.[0]?.description || current.weather?.[0]?.main || '';
  el('current-desc').textContent = desc ? desc.replace(/\b\w/g, (c) => c.toUpperCase()) : '—';

  const brief =
    current.clouds == null ? '—'
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
        <span class="font-semibold">${Math.round(h.temp)}°</span>
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
      <div class="text-lg font-bold text-card-foreground">${Math.round(d?.temp?.max ?? 0)}°</div>
      <div class="text-sm text-muted-foreground">${Math.round(d?.temp?.min ?? 0)}°</div>
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
  el('moon-phase').textContent = mp != null ? moonPhaseText(mp) : '—';
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
  el('wind-dir').textContent =
    current?.wind_deg != null ? `${degToCompass(current.wind_deg)} (${current.wind_deg}°)` : '—';
  el('wind-gust').textContent = current?.wind_gust != null ? `${msToMph(current.wind_gust)} mph` : '—';
}

function renderAlerts(alerts) {
  const box = el('alerts-box');
  if (!box) return;

  if (Array.isArray(alerts) && alerts.length) {
    const items = alerts
      .map((a) => {
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
      })
      .join('');
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

/* ====== DATA FLOW ====== */
let lastQuery = 'Dagupan, PH';
let lastCoords = null;

async function loadAndRender(lat, lon, place) {
  const { data, mode } = await fetchWeatherNormalized(lat, lon);
  renderCurrent(data, place);
  renderHourly(data);
  renderForecast(data);
  renderUV(data.current);
  renderSunMoon(data);
  renderPrecip(data.daily || []);
  renderWind(data.current);
  // AQI is optional; ignore failures
  try {
    const air = await getJSON(AIR_URL(lat, lon));
    renderAQI(air);
  } catch {}
  renderAlerts(data.alerts || []);
  // console.info(`Rendered using mode: ${mode}`);
}

async function loadWeatherByCity(city) {
  try {
    setSpinning(true);
    const geo = await getJSON(GEO_URL(city));
    if (!geo.length) throw new Error('Location not found');
    const g = geo[0];
    lastQuery = city;
    lastCoords = { lat: g.lat, lon: g.lon };

    const place = {
      name: g.name, state: g.state, country: g.country,
      full: `${g.name}${g.state ? ', ' + g.state : ''}${g.country ? ', ' + g.country : ''}`,
    };
    await loadAndRender(g.lat, g.lon, place);
  } catch (e) {
    alert(`Could not load weather for "${city}". ${e.message || e}`);
    console.error(e);
  } finally {
    setSpinning(false);
  }
}

async function loadWeatherByCoords(lat, lon) {
  try {
    setSpinning(true);
    const rev = await getJSON(REV_GEO_URL(lat, lon)).catch(() => []);
    lastCoords = { lat, lon };
    const g = rev?.[0];
    const place = g
      ? { name: g.name, state: g.state, country: g.country,
          full: `${g.name}${g.state ? ', ' + g.state : ''}${g.country ? ', ' + g.country : ''}` }
      : { full: `Lat ${lat.toFixed(2)}, Lon ${lon.toFixed(2)}` };

    await loadAndRender(lat, lon, place);
  } catch (e) {
    alert(`Could not load weather for your location. ${e.message || e}`);
    console.error(e);
  } finally {
    setSpinning(false);
  }
}

/* ====== TIME DISPLAY ====== */
function updateClock() {
  const timeEl = el('current-time');
  if (!timeEl) return;
  const tz = timeEl.dataset.tz;
  const now = tz
    ? new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZone: tz, timeZoneName: 'short' })
    : new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  timeEl.textContent = now;
}

/* ====== EVENTS ====== */
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

el('search-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const q = e.currentTarget.value.trim();
    if (q) loadWeatherByCity(q);
  }
});

el('refresh-btn').addEventListener('click', () => {
  if (lastCoords) loadWeatherByCoords(lastCoords.lat, lastCoords.lon);
  else loadWeatherByCity(lastQuery);
});

/* ====== INIT ====== */
(function init() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => loadWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
      () => loadWeatherByCity(lastQuery),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
    );
  } else {
    loadWeatherByCity(lastQuery);
  }
  updateClock();
  setInterval(updateClock, 60000);
})();

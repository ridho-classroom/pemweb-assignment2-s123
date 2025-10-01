/* app.js
   Full script: search + suggestions + history + geolocation + current + forecast + air quality + dark/unit settings + offline cache + map + alerts + comparison + trends + sharing
   Paste as-is into app.js
*/

const API_KEY = "c6735dcbc971284fc219f8b5735636ee";
const API_BASE = "https://api.openweathermap.org/data/2.5";

///// State & DOM
let currentUnit = localStorage.getItem("weather_unit") || "metric"; // metric or imperial
let currentCity = null;
let lastCoords = null;
let map = null;
let currentForecast = null;
let trendsChart = null;

const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const suggestionsEl = document.getElementById("suggestions");
const historyEl = document.getElementById("history");
const toggleDarkBtn = document.getElementById("toggle-dark");
const toggleUnitBtn = document.getElementById("toggle-unit");
const shareBtn = document.getElementById("share-btn");
const compareCityInput = document.getElementById("compare-city");
const compareBtn = document.getElementById("compare-btn");
const compareResult = document.getElementById("compare-result");
const compareSuggestionsEl = document.getElementById("compare-suggestions");

const currentLocationEl = document.getElementById("current-location");
const currentIconEl = document.getElementById("current-icon");
const currentTempEl = document.getElementById("current-temp");
const currentDescEl = document.getElementById("current-desc");
const currentMessageEl = document.getElementById("current-message");

const infoHumidity = document.getElementById("info-humidity");
const infoWind = document.getElementById("info-wind");
const infoVisibility = document.getElementById("info-visibility");
const infoFeels = document.getElementById("info-feels");
const infoPressure = document.getElementById("info-pressure");
const infoAqi = document.getElementById("info-aqi");
const infoUv = document.getElementById("info-uv");
const infoSunrise = document.getElementById("info-sunrise");
const infoSunset = document.getElementById("info-sunset");

const forecastGrid = document.getElementById("forecast-grid");

const popularCities = [
  "Jakarta",
  "Bandung",
  "Surabaya",
  "Medan",
  "Denpasar",
  "Yogyakarta",
  "Bali",
  "Tokyo",
  "London",
  "New York",
  "Singapore",
  "Makassar",
];

///// utilities
function unitSymbol() {
  return currentUnit === "metric" ? "°C" : "°F";
}
function windUnit() {
  return currentUnit === "metric" ? "m/s" : "mph";
}
function setLoadingCurrent(msg = "Memuat...") {
  currentLocationEl.textContent = "";
  currentIconEl.src = "";
  currentTempEl.textContent = msg;
  currentDescEl.textContent = "";
  currentMessageEl.textContent = "";
  infoUv.textContent = "";
  infoSunrise.textContent = "";
  infoSunset.textContent = "";
  forecastGrid.innerHTML = "";
  document.getElementById("hourly-grid").innerHTML = "";
}
function saveLocal(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}
function loadLocal(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function checkOfflineCache() {
  if (navigator.onLine) return null;
  const cached = loadLocal("weather_cache", null);
  if (cached && Date.now() - cached.timestamp < 3600000) {
    // 1 hour
    return cached.data;
  }
  return null;
}

function saveWeatherCache(weather, forecast, aqi, uv) {
  saveLocal("weather_cache", {
    data: { weather, forecast, aqi, uv },
    timestamp: Date.now(),
  });
}

///// History
function loadHistory() {
  const saved = loadLocal("weatherHistory", []);
  const favs = loadLocal("weatherFavorites", []);
  saved.sort((a, b) => {
    const aFav = favs.includes(a);
    const bFav = favs.includes(b);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;
    return 0;
  });
  historyEl.innerHTML = "";
  if (saved.length > 0) {
    const clearBtn = document.createElement("button");
    clearBtn.className = "history-btn clear-all-btn";
    clearBtn.textContent = "Clear All History";
    clearBtn.onclick = clearAllHistory;
    historyEl.appendChild(clearBtn);
  }
  saved.forEach((city) => {
    const btn = document.createElement("button");
    btn.className = "history-btn";
    btn.innerHTML = `<button class="fav-btn" onclick="toggleFavorite('${city}')">${
      isFavorite(city) ? "★" : "☆"
    }</button>${city}<button class="delete-btn" onclick="deleteHistory('${city}')">×</button>`;
    btn.onclick = (e) => {
      if (
        !e.target.classList.contains("delete-btn") &&
        !e.target.classList.contains("fav-btn")
      )
        performSearch(city);
    };
    historyEl.appendChild(btn);
  });
}
function pushHistory(city) {
  if (!city) return;
  let saved = loadLocal("weatherHistory", []);
  city = city.trim();
  if (!saved.includes(city)) {
    saved.unshift(city);
    if (saved.length > 6) saved = saved.slice(0, 6);
    saveLocal("weatherHistory", saved);
    loadHistory();
  }
}
function deleteHistory(city) {
  let saved = loadLocal("weatherHistory", []);
  saved = saved.filter((c) => c !== city);
  saveLocal("weatherHistory", saved);
  loadHistory();
}

function clearAllHistory() {
  const favs = loadLocal("weatherFavorites", []);
  let saved = loadLocal("weatherHistory", []);
  saved = saved.filter((c) => favs.includes(c));
  saveLocal("weatherHistory", saved);
  loadHistory();
}
function isFavorite(city) {
  const favs = loadLocal("weatherFavorites", []);
  return favs.includes(city);
}
function toggleFavorite(city) {
  let favs = loadLocal("weatherFavorites", []);
  if (favs.includes(city)) {
    favs = favs.filter((c) => c !== city);
  } else {
    favs.push(city);
  }
  saveLocal("weatherFavorites", favs);
  loadHistory();
  loadFavorites();
}

async function loadFavorites() {
  const favs = loadLocal("weatherFavorites", []);
  const favList = document.getElementById("fav-list");
  if (!favList) return;
  favList.innerHTML = "";
  for (const city of favs) {
    try {
      const weather = await fetchWeatherByCity(city);
      const icon = weather.weather?.[0]?.icon || "";
      const temp = Math.round(weather.main.temp);
      const btn = document.createElement("button");
      btn.className = "fav-btn";
      btn.innerHTML = `
        <img src="${
          icon ? `https://openweathermap.org/img/wn/${icon}.png` : ""
        }" alt="icon" style="width: 40px; height: 40px; margin-right: 4px;">
        <div style="flex: 1; overflow: hidden;">
          <div style="font-weight: 600; font-size: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${city}</div>
          <div style="font-size: 0.7rem; color: var(--muted);">${temp}${unitSymbol()}</div>
        </div>
        <button class="delete-fav" onclick="event.stopPropagation(); toggleFavorite('${city}')">×</button>
      `;
      btn.onclick = () => performSearch(city);
      favList.appendChild(btn);
    } catch (e) {
      // Fallback if fetch fails
      const btn = document.createElement("button");
      btn.className = "fav-btn";
      btn.innerHTML = `${city} <button class="delete-fav" onclick="event.stopPropagation(); toggleFavorite('${city}')">×</button>`;
      btn.onclick = () => performSearch(city);
      favList.appendChild(btn);
    }
  }
}

///// Suggestions (simple debounce)
let debounceTimer = null;
let filteredSuggestions = [];
let filteredCompareSuggestions = [];
function debounce(fn, delay = 250) {
  return (...args) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => fn(...args), delay);
  };
}
function positionHistory() {
  const baseTop = 52; // suggestions base top
  let historyTop = baseTop;
  if (
    suggestionsEl.style.display === "block" &&
    suggestionsEl.offsetHeight > 0
  ) {
    historyTop = baseTop + suggestionsEl.offsetHeight + 6; // + gap
  }
  historyEl.style.top = historyTop + "px";
}

function filterSuggestions(q) {
  if (!q) {
    suggestionsEl.style.display = "none";
    suggestionsEl.innerHTML = "";
    filteredSuggestions = [];
    positionHistory();
    return;
  }
  const ql = q.toLowerCase();
  const filtered = popularCities
    .filter((c) => c.toLowerCase().startsWith(ql))
    .slice(0, 8);
  filteredSuggestions = filtered;
  suggestionsEl.innerHTML = "";
  if (filtered.length === 0) {
    suggestionsEl.style.display = "none";
    positionHistory();
    return;
  }
  filtered.forEach((city) => {
    const li = document.createElement("li");
    li.textContent = city;
    li.onclick = () => {
      searchInput.value = city;
      suggestionsEl.style.display = "none";
      performSearch(city);
    };
    suggestionsEl.appendChild(li);
  });
  suggestionsEl.style.display = "block";
  positionHistory();
}

function filterCompareSuggestions(q) {
  if (!q) {
    compareSuggestionsEl.style.display = "none";
    compareSuggestionsEl.innerHTML = "";
    filteredCompareSuggestions = [];
    return;
  }
  const ql = q.toLowerCase();
  const filtered = popularCities
    .filter((c) => c.toLowerCase().startsWith(ql))
    .slice(0, 8);
  filteredCompareSuggestions = filtered;
  compareSuggestionsEl.innerHTML = "";
  if (filtered.length === 0) {
    compareSuggestionsEl.style.display = "none";
    return;
  }
  filtered.forEach((city) => {
    const li = document.createElement("li");
    li.textContent = city;
    li.onclick = () => {
      compareCityInput.value = city;
      compareSuggestionsEl.style.display = "none";
      // Optionally trigger comparison, but since it's for input, maybe not
    };
    compareSuggestionsEl.appendChild(li);
  });
  compareSuggestionsEl.style.display = "block";
}

searchInput.addEventListener(
  "input",
  debounce((e) => filterSuggestions(e.target.value), 150)
);

compareCityInput.addEventListener(
  "input",
  debounce((e) => filterCompareSuggestions(e.target.value), 150)
);

searchInput.addEventListener("click", () => {
  historyEl.classList.add("show");
  historyEl.style.display = "flex";
  positionHistory();
});

document.addEventListener("click", (ev) => {
  if (!suggestionsEl.contains(ev.target) && ev.target !== searchInput) {
    suggestionsEl.style.display = "none";
    positionHistory();
  }
  if (!historyEl.contains(ev.target) && ev.target !== searchInput) {
    historyEl.classList.remove("show");
    setTimeout(() => (historyEl.style.display = "none"), 300);
  }
  if (
    !compareSuggestionsEl.contains(ev.target) &&
    ev.target !== compareCityInput
  ) {
    compareSuggestionsEl.style.display = "none";
  }
});

///// Fetch helpers
async function fetchJSON(url) {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "API error");
  return data;
}

async function fetchWeatherByCity(city) {
  return await fetchJSON(
    `${API_BASE}/weather?q=${encodeURIComponent(
      city
    )}&units=${currentUnit}&appid=${API_KEY}&lang=id`
  );
}
async function fetchWeatherByCoords(lat, lon) {
  return await fetchJSON(
    `${API_BASE}/weather?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${API_KEY}&lang=id`
  );
}
async function fetchForecast(lat, lon) {
  return await fetchJSON(
    `${API_BASE}/forecast?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${API_KEY}&lang=id`
  );
}
async function fetchAirQuality(lat, lon) {
  return await fetchJSON(
    `${API_BASE}/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`
  );
}

async function fetchUV(lat, lon) {
  return await fetchJSON(
    `${API_BASE}/uvi?lat=${lat}&lon=${lon}&appid=${API_KEY}`
  );
}

///// Renderers
function renderCurrent(data) {
  if (!data) return;
  currentLocationEl.textContent = `${data.name}, ${data.sys.country}`;
  // Base illustration from city clouds, adjusted based on condition
  const condition = data.weather?.[0]?.main?.toLowerCase() || "";
  let baseIcon = "02d"; // default city clouds
  if (condition.includes("clear")) baseIcon = "01d";
  else if (condition.includes("rain")) baseIcon = "10d";
  else if (condition.includes("snow")) baseIcon = "13d";
  else if (condition.includes("thunderstorm")) baseIcon = "11d";
  else if (condition.includes("mist") || condition.includes("fog"))
    baseIcon = "50d";
  currentIconEl.src = `https://openweathermap.org/img/wn/${baseIcon}@2x.png`;
  currentIconEl.alt = data.weather?.[0]?.description || "weather";
  currentTempEl.textContent = `${Math.round(data.main.temp)}${unitSymbol()}`;
  currentDescEl.textContent = capitalize(data.weather?.[0]?.description || "");
  infoHumidity.textContent = `${data.main.humidity}%`;
  infoFeels.textContent = `${Math.round(data.main.feels_like)}${unitSymbol()}`;
  infoPressure.textContent = `${data.main.pressure} hPa`;
  infoVisibility.textContent = data.visibility
    ? `${(data.visibility / 1000).toFixed(1)} km`
    : "—";
  infoWind.textContent = `${data.wind.speed} ${windUnit()}`;
  // Sunrise and sunset
  if (data.sys?.sunrise && data.sys?.sunset) {
    const sunrise = new Date(data.sys.sunrise * 1000);
    const sunset = new Date(data.sys.sunset * 1000);
    infoSunrise.textContent = sunrise.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
    infoSunset.textContent = sunset.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } else {
    infoSunrise.textContent = "—";
    infoSunset.textContent = "—";
  }

  // Init map if coords available
  if (data.coord) {
    initMap(data.coord.lat, data.coord.lon, data.name);
  }
}

function renderAQI(aqiObj) {
  // aqiObj is response.list[0].main.aqi (1..5)
  try {
    const aqi = aqiObj.list?.[0]?.main?.aqi;
    if (!aqi) {
      infoAqi.textContent = "—";
      infoAqi.className = "";
      return;
    }
    let label = "",
      cls = "";
    switch (aqi) {
      case 1:
        label = "Baik";
        cls = "aq-good";
        break;
      case 2:
        label = "Sedang";
        cls = "aq-moderate";
        break;
      case 3:
        label = "Tidak sehat untuk sensitif";
        cls = "aq-unhealthy";
        break;
      case 4:
        label = "Tidak sehat";
        cls = "aq-bad";
        break;
      case 5:
        label = "Sangat tidak sehat";
        cls = "aq-bad";
        break;
      default:
        label = "—";
    }
    infoAqi.textContent = `${label} (AQI ${aqi})`;
    infoAqi.className = cls;
  } catch (e) {
    infoAqi.textContent = "—";
    infoAqi.className = "";
  }
}

function renderUV(uvObj) {
  try {
    const uv = uvObj.value;
    if (uv === undefined || uv === null) {
      infoUv.textContent = "—";
      return;
    }
    let label = "",
      cls = "";
    if (uv <= 2) {
      label = "Rendah";
      cls = "uv-low";
    } else if (uv <= 5) {
      label = "Sedang";
      cls = "uv-moderate";
    } else if (uv <= 7) {
      label = "Tinggi";
      cls = "uv-high";
    } else if (uv <= 10) {
      label = "Sangat Tinggi";
      cls = "uv-very-high";
    } else {
      label = "Ekstrem";
      cls = "uv-extreme";
    }
    infoUv.textContent = `${label} (${uv})`;
    infoUv.className = cls;
  } catch (e) {
    infoUv.textContent = "—";
  }
}

function renderForecast(data) {
  if (!data || !Array.isArray(data.list)) {
    forecastGrid.innerHTML = "<p>Prakiraan tidak tersedia</p>";
    return;
  }
  currentForecast = data;
  forecastGrid.innerHTML = "";
  // Group by date
  const grouped = {};
  data.list.forEach((item) => {
    const date = item.dt_txt.split(" ")[0];
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(item);
  });
  // Get dates after today
  const today = new Date().toISOString().split("T")[0];
  const dates = Object.keys(grouped)
    .filter((d) => d > today)
    .slice(0, 5);
  dates.forEach((date) => {
    const items = grouped[date];
    const temps = items.map((i) => i.main.temp);
    const min = Math.min(...temps);
    const max = Math.max(...temps);
    const icon = items[0].weather[0].icon;
    const desc = items[0].weather[0].description;
    const d = new Date(date);
    const day = d.toLocaleDateString("id-ID", { weekday: "long" });
    const card = document.createElement("div");
    card.className = "forecast-card";
    card.style.cursor = "pointer";
    card.onclick = () => showForecastDetails(date, items);
    card.innerHTML = `
      <h4>${day}</h4>
      <img src="https://openweathermap.org/img/wn/${icon}.png" alt="">
      <div class="temp-range">${Math.round(min)}${unitSymbol()} / ${Math.round(
      max
    )}${unitSymbol()}</div>
      <div class="desc">${capitalize(desc)}</div>
    `;
    forecastGrid.appendChild(card);
  });
  renderTrends(data);
}

function renderHourly(data) {
  const grid = document.getElementById("hourly-grid");
  if (!data || !Array.isArray(data.list)) {
    grid.innerHTML = "<p>Prakiraan per jam tidak tersedia</p>";
    return;
  }
  const items = data.list.slice(0, 8);
  grid.innerHTML = "";
  items.forEach((it) => {
    const time = new Date(it.dt * 1000).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const icon = it.weather?.[0]?.icon || "";
    const temp = Math.round(it.main.temp);
    const card = document.createElement("div");
    card.className = "hourly-card";
    card.innerHTML = `
      <div class="time">${time}</div>
      <img src="${
        icon ? `https://openweathermap.org/img/wn/${icon}.png` : ""
      }" alt="">
      <div class="temp">${temp}${unitSymbol()}</div>
    `;
    grid.appendChild(card);
  });
}

function capitalize(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function initMap(lat, lon, locationName) {
  if (map) {
    map.remove();
  }
  map = L.map("map").setView([lat, lon], 10);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  const marker = L.marker([lat, lon]).addTo(map);
  marker
    .bindPopup(
      `<b>${locationName}</b><br>Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`
    )
    .openPopup();
}

function showForecastDetails(date, items) {
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Detail Prakiraan - ${new Date(date).toLocaleDateString("id-ID")}</h3>
      <div class="hourly-grid">
        ${items
          .map(
            (it) => `
          <div class="hourly-card">
            <div class="time">${new Date(it.dt_txt).toLocaleTimeString(
              "id-ID",
              { hour: "2-digit", minute: "2-digit" }
            )}</div>
            <img src="https://openweathermap.org/img/wn/${
              it.weather[0].icon
            }.png" alt="${it.weather[0].description}">
            <div class="temp">${Math.round(it.main.temp)}${unitSymbol()}</div>
            <div class="desc">${capitalize(it.weather[0].description)}</div>
          </div>
        `
          )
          .join("")}
      </div>
      <button onclick="this.closest('.modal').remove()">Tutup</button>
    </div>
  `;
  document.body.appendChild(modal);
}

function checkAlerts(forecast) {
  let alertMsg = "";
  const hasSevere = forecast.list.some((item) => {
    const w = item.weather[0].main;
    const rain = item.rain ? item.rain["3h"] || 0 : 0;
    return w === "Thunderstorm" || (w === "Rain" && rain > 5);
  });
  if (hasSevere) {
    alertMsg =
      "⚠️ Peringatan Cuaca Buruk: Potensi hujan lebat atau badai petir.";
  }
  const alertsEl = document.getElementById("alerts");
  if (alertsEl) {
    alertsEl.innerHTML = alertMsg ? `<p>${alertMsg}</p>` : "";
  }
}

function renderTrends(forecast) {
  const canvas = document.getElementById("trends-chart");
  if (!canvas || !forecast) return;

  // Destroy previous chart
  if (trendsChart) {
    trendsChart.destroy();
  }

  // Group by date for highs/lows
  const grouped = {};
  forecast.list.forEach((item) => {
    const date = item.dt_txt.split(" ")[0];
    if (!grouped[date]) {
      grouped[date] = { high: -Infinity, low: Infinity };
    }
    grouped[date].high = Math.max(grouped[date].high, item.main.temp);
    grouped[date].low = Math.min(grouped[date].low, item.main.temp);
  });

  const dates = Object.keys(grouped).slice(0, 5); // Next 5 days
  if (dates.length < 2) return;

  const labels = dates.map((d) =>
    new Date(d).toLocaleDateString("id-ID", { weekday: "short" })
  );
  const highs = dates.map((d) => Math.round(grouped[d].high));
  const lows = dates.map((d) => Math.round(grouped[d].low));

  trendsChart = new Chart(canvas, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Tinggi",
          data: highs,
          borderColor: "#ffd166",
          backgroundColor: "rgba(255, 209, 102, 0.1)",
          fill: false,
          tension: 0.4,
          pointRadius: 5,
          pointBackgroundColor: "#ffd166",
        },
        {
          label: "Rendah",
          data: lows,
          borderColor: "#66ccff",
          backgroundColor: "rgba(102, 204, 255, 0.1)",
          fill: false,
          tension: 0.4,
          pointRadius: 5,
          pointBackgroundColor: "#66ccff",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2,
      plugins: {
        legend: {
          position: "top",
          labels: {
            color: "#fff",
            font: {
              size: 14,
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
          ticks: {
            color: "#fff",
          },
        },
        y: {
          beginAtZero: false,
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
          ticks: {
            color: "#fff",
            callback: function (value) {
              return value + unitSymbol();
            },
          },
        },
      },
      elements: {
        point: {
          hoverRadius: 8,
        },
      },
    },
  });
}

///// Comparison
async function performComparison(city1, city2) {
  try {
    const weather1 = await fetchWeatherByCity(city1);
    const weather2 = await fetchWeatherByCity(city2);
    let aqi2 = null,
      uv2 = null;
    if (weather2.coord) {
      aqi2 = await fetchAirQuality(weather2.coord.lat, weather2.coord.lon);
      uv2 = await fetchUV(weather2.coord.lat, weather2.coord.lon);
    }
    const renderAQI = (aqiObj) => {
      if (!aqiObj || !aqiObj.list?.[0]?.main?.aqi) return "—";
      const aqi = aqiObj.list[0].main.aqi;
      let label = "";
      switch (aqi) {
        case 1:
          label = "Baik";
          break;
        case 2:
          label = "Sedang";
          break;
        case 3:
          label = "Tidak sehat untuk sensitif";
          break;
        case 4:
          label = "Tidak sehat";
          break;
        case 5:
          label = "Sangat tidak sehat";
          break;
        default:
          label = "—";
      }
      return `${label} (AQI ${aqi})`;
    };
    const renderUV = (uvObj) => {
      if (!uvObj || uvObj.value === undefined) return "—";
      const uv = uvObj.value;
      let label = "";
      if (uv <= 2) label = "Rendah";
      else if (uv <= 5) label = "Sedang";
      else if (uv <= 7) label = "Tinggi";
      else if (uv <= 10) label = "Sangat Tinggi";
      else label = "Ekstrem";
      return `${label} (${uv})`;
    };
    const formatSunriseSunset = (sys) => {
      if (!sys?.sunrise || !sys?.sunset) return { sunrise: "—", sunset: "—" };
      const sunrise = new Date(sys.sunrise * 1000).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const sunset = new Date(sys.sunset * 1000).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return { sunrise, sunset };
    };
    const times1 = formatSunriseSunset(weather1.sys);
    const times2 = formatSunriseSunset(weather2.sys);

    // Comparison indicators
    const compareValues = (val1, val2, higherBetter = false) => {
      if (val1 === val2) return { ind1: " = ", ind2: " = " };
      if (higherBetter) {
        return val1 > val2
          ? { ind1: " ↑ ", ind2: " ↓ " }
          : { ind1: " ↓ ", ind2: " ↑ " };
      } else {
        return val1 < val2
          ? { ind1: " ↑ ", ind2: " ↓ " }
          : { ind1: " ↓ ", ind2: " ↑ " };
      }
    };

    const tempComp = compareValues(
      weather1.main.temp,
      weather2.main.temp,
      true
    );
    const feelsComp = compareValues(
      weather1.main.feels_like,
      weather2.main.feels_like,
      true
    );
    const humComp = compareValues(
      weather1.main.humidity,
      weather2.main.humidity,
      true
    );
    const windComp = compareValues(
      weather1.wind.speed,
      weather2.wind.speed,
      true
    );
    const visComp = compareValues(
      weather1.visibility || 0,
      weather2.visibility || 0,
      true
    );
    const pressComp = compareValues(
      weather1.main.pressure,
      weather2.main.pressure,
      true
    );
    const aqiComp = aqi2
      ? compareValues(aqi2.list[0].main.aqi, 6, true)
      : { ind1: "", ind2: "" };
    const uvComp = uv2
      ? compareValues(uv2.value, 11, true)
      : { ind1: "", ind2: "" };

    compareResult.innerHTML = `
      <div class="compare-card">
        <div class="left">
          <div class="location">${weather1.name}, ${weather1.sys.country}</div>
          <div class="weather-main">
            <img class="weather-icon" src="https://openweathermap.org/img/wn/${
              weather1.weather[0].icon
            }.png" alt="">
            <div class="temps">
              <div class="temp">${Math.round(
                weather1.main.temp
              )}${unitSymbol()}${tempComp.ind1}</div>
              <div class="desc">${capitalize(
                weather1.weather[0].description
              )}</div>
            </div>
          </div>
        </div>
        <div class="right">
          <div class="extra-info">
            <div class="info-grid">
              <div class="info-item">
                💧<span>Kelembaban</span><strong>${weather1.main.humidity}%${
      humComp.ind1
    }</strong>
              </div>
              <div class="info-item">
                🌬️<span>Angin</span><strong>${
                  weather1.wind.speed
                } ${windUnit()}${windComp.ind1}</strong>
              </div>
              <div class="info-item">
                👁️<span>Visibilitas</span><strong>${
                  weather1.visibility
                    ? (weather1.visibility / 1000).toFixed(1) + " km"
                    : "—"
                }${visComp.ind1}</strong>
              </div>
              <div class="info-item">
                ⏱️<span>Terasa seperti</span><strong>${Math.round(
                  weather1.main.feels_like
                )}${unitSymbol()}${feelsComp.ind1}</strong>
              </div>
              <div class="info-item">
                ⚖️<span>Tekanan</span><strong>${weather1.main.pressure} hPa${
      pressComp.ind1
    }</strong>
              </div>
              <div class="info-item aq-item">
                🌫️<span>Kualitas Udara</span><strong>—</strong>
              </div>
              <div class="info-item">
                🌞<span>UV Indeks</span><strong>—</strong>
              </div>
              <div class="info-item">
                🌅<span>Matahari Terbit</span><strong>${times1.sunrise}</strong>
              </div>
              <div class="info-item">
                🌇<span>Matahari Terbenam</span><strong>${
                  times1.sunset
                }</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="compare-card">
        <div class="left">
          <div class="location">${weather2.name}, ${weather2.sys.country}</div>
          <div class="weather-main">
            <img class="weather-icon" src="https://openweathermap.org/img/wn/${
              weather2.weather[0].icon
            }.png" alt="">
            <div class="temps">
              <div class="temp">${Math.round(
                weather2.main.temp
              )}${unitSymbol()}${tempComp.ind2}</div>
              <div class="desc">${capitalize(
                weather2.weather[0].description
              )}</div>
            </div>
          </div>
        </div>
        <div class="right">
          <div class="extra-info">
            <div class="info-grid">
              <div class="info-item">
                💧<span>Kelembaban</span><strong>${weather2.main.humidity}%${
      humComp.ind2
    }</strong>
              </div>
              <div class="info-item">
                🌬️<span>Angin</span><strong>${
                  weather2.wind.speed
                } ${windUnit()}${windComp.ind2}</strong>
              </div>
              <div class="info-item">
                👁️<span>Visibilitas</span><strong>${
                  weather2.visibility
                    ? (weather2.visibility / 1000).toFixed(1) + " km"
                    : "—"
                }${visComp.ind2}</strong>
              </div>
              <div class="info-item">
                ⏱️<span>Terasa seperti</span><strong>${Math.round(
                  weather2.main.feels_like
                )}${unitSymbol()}${feelsComp.ind2}</strong>
              </div>
              <div class="info-item">
                ⚖️<span>Tekanan</span><strong>${weather2.main.pressure} hPa${
      pressComp.ind2
    }</strong>
              </div>
              <div class="info-item aq-item ${
                aqi2
                  ? "aq-" +
                    (aqi2.list[0].main.aqi === 1
                      ? "good"
                      : aqi2.list[0].main.aqi === 2
                      ? "moderate"
                      : aqi2.list[0].main.aqi === 3
                      ? "unhealthy"
                      : aqi2.list[0].main.aqi === 4
                      ? "bad"
                      : "bad")
                  : ""
              }">
                🌫️<span>Kualitas Udara</span><strong>${renderAQI(aqi2)}${
      aqiComp.ind2
    }</strong>
              </div>
              <div class="info-item ${
                uv2
                  ? "uv-" +
                    (uv2.value <= 2
                      ? "low"
                      : uv2.value <= 5
                      ? "moderate"
                      : uv2.value <= 7
                      ? "high"
                      : uv2.value <= 10
                      ? "very-high"
                      : "extreme")
                  : ""
              }">
                🌞<span>UV Indeks</span><strong>${renderUV(uv2)}${
      uvComp.ind2
    }</strong>
              </div>
              <div class="info-item">
                🌅<span>Matahari Terbit</span><strong>${times2.sunrise}</strong>
              </div>
              <div class="info-item">
                🌇<span>Matahari Terbenam</span><strong>${
                  times2.sunset
                }</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    compareResult.innerHTML = `<p>❌ Gagal membandingkan: ${err.message}</p>`;
  }
}

///// Sharing
function shareWeather() {
  const text = `${currentLocationEl.textContent}: ${currentTempEl.textContent}, ${currentDescEl.textContent}`;
  if (navigator.share) {
    navigator
      .share({
        title: "Cuaca Saat Ini",
        text: text,
      })
      .catch((err) => console.log("Error sharing", err));
  } else {
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(text).then(() => {
      alert("Cuaca disalin ke clipboard!");
    });
  }
}

///// Main flows
async function performSearch(city) {
  if (!city) return;
  suggestionsEl.style.display = "none";
  historyEl.classList.remove("show");
  setTimeout(() => (historyEl.style.display = "none"), 300);
  setLoadingCurrent("Mencari...");

  // Check offline cache first
  const cached = checkOfflineCache();
  if (cached) {
    renderCurrent(cached.weather);
    if (cached.forecast) {
      renderForecast(cached.forecast);
      renderHourly(cached.forecast);
    }
    if (cached.aqi) renderAQI(cached.aqi);
    if (cached.uv) renderUV(cached.uv);
    currentCity = cached.weather.name || city;
    pushHistory(currentCity);
    if (cached.weather.coord)
      initMap(cached.weather.coord.lat, cached.weather.coord.lon);
    checkAlerts(cached.forecast);
    renderTrends(cached.forecast);
    return;
  }

  try {
    const weather = await fetchWeatherByCity(city);
    renderCurrent(weather);
    pushHistory(weather.name || city);
    currentCity = weather.name || city;
    let forecast, aqi, uv;
    // forecast using forecast API with coordinates
    if (weather.coord) {
      forecast = await fetchForecast(weather.coord.lat, weather.coord.lon);
      renderForecast(forecast);
      renderHourly(forecast);
      initMap(weather.coord.lat, weather.coord.lon);
      aqi = await fetchAirQuality(weather.coord.lat, weather.coord.lon);
      renderAQI(aqi);
      uv = await fetchUV(weather.coord.lat, weather.coord.lon);
      renderUV(uv);
    } else {
      forecastGrid.innerHTML = "<p>Prakiraan tidak tersedia</p>";
      document.getElementById("hourly-grid").innerHTML =
        "<p>Prakiraan per jam tidak tersedia</p>";
    }
    // Cache the data
    saveWeatherCache(weather, forecast, aqi, uv);
    checkAlerts(forecast);
    renderTrends(forecast);
  } catch (err) {
    currentLocationEl.textContent = `❌ ${err.message}`;
    currentTempEl.textContent = "--";
    forecastGrid.innerHTML = "";
    document.getElementById("hourly-grid").innerHTML = "";
    infoAqi.textContent = "--";
    infoUv.textContent = "--";
  }
}

async function loadByCoords(lat, lon) {
  setLoadingCurrent("Memuat lokasi...");

  // Check offline cache first
  const cached = checkOfflineCache();
  if (cached) {
    renderCurrent(cached.weather);
    if (cached.forecast) {
      renderForecast(cached.forecast);
      renderHourly(cached.forecast);
    }
    if (cached.aqi) renderAQI(cached.aqi);
    if (cached.uv) renderUV(cached.uv);
    currentCity = cached.weather.name;
    lastCoords = { lat, lon };
    pushHistory(currentCity);
    initMap(lat, lon);
    checkAlerts(cached.forecast);
    renderTrends(cached.forecast);
    return;
  }

  try {
    const weather = await fetchWeatherByCoords(lat, lon);
    renderCurrent(weather);
    currentCity = weather.name;
    lastCoords = { lat, lon };
    let forecast, aqi, uv;
    forecast = await fetchForecast(lat, lon);
    renderForecast(forecast);
    renderHourly(forecast);
    initMap(lat, lon);
    aqi = await fetchAirQuality(lat, lon);
    renderAQI(aqi);
    uv = await fetchUV(lat, lon);
    renderUV(uv);
    // Cache the data
    saveWeatherCache(weather, forecast, aqi, uv);
    pushHistory(weather.name);
    checkAlerts(forecast);
    renderTrends(forecast);
  } catch (e) {
    currentLocationEl.textContent = "⚠️ Gagal memuat lokasi";
    currentTempEl.textContent = "--";
  }
}

///// Event handlers
searchBtn.addEventListener("click", () => {
  const q = searchInput.value.trim();
  if (q) performSearch(q);
});
searchInput.addEventListener("keyup", (e) => {
  if (e.key === "Enter") {
    const q = searchInput.value.trim();
    if (q) performSearch(q);
  }
});

// keyboard nav for suggestion list (simple)
searchInput.addEventListener("keydown", (e) => {
  const items = Array.from(suggestionsEl.querySelectorAll("li"));
  if (!items.length) return;
  let idx = items.findIndex((li) => li.classList.contains("active"));
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (idx < items.length - 1) {
      if (idx >= 0) items[idx].classList.remove("active");
      idx++;
      items[idx].classList.add("active");
      items[idx].scrollIntoView({ block: "nearest" });
    }
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (idx > 0) {
      items[idx].classList.remove("active");
      idx--;
      items[idx].classList.add("active");
      items[idx].scrollIntoView({ block: "nearest" });
    }
  } else if (e.key === "Enter") {
    const active = suggestionsEl.querySelector("li.active");
    if (active) {
      e.preventDefault();
      const val = active.textContent;
      searchInput.value = val;
      suggestionsEl.style.display = "none";
      performSearch(val);
    }
  } else if (e.key === "Tab") {
    if (filteredSuggestions.length > 0) {
      searchInput.value = filteredSuggestions[0];
      suggestionsEl.style.display = "none";
      e.preventDefault();
    }
  }
});

// keyboard nav for compare suggestions
compareCityInput.addEventListener("keydown", (e) => {
  const items = Array.from(compareSuggestionsEl.querySelectorAll("li"));
  if (!items.length) return;
  let idx = items.findIndex((li) => li.classList.contains("active"));
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (idx < items.length - 1) {
      if (idx >= 0) items[idx].classList.remove("active");
      idx++;
      items[idx].classList.add("active");
      items[idx].scrollIntoView({ block: "nearest" });
    }
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (idx > 0) {
      items[idx].classList.remove("active");
      idx--;
      items[idx].classList.add("active");
      items[idx].scrollIntoView({ block: "nearest" });
    }
  } else if (e.key === "Enter") {
    const active = compareSuggestionsEl.querySelector("li.active");
    if (active) {
      e.preventDefault();
      const val = active.textContent;
      compareCityInput.value = val;
      compareSuggestionsEl.style.display = "none";
      // Optionally trigger comparison, but since it's for input, maybe not
    }
  } else if (e.key === "Tab") {
    if (filteredCompareSuggestions.length > 0) {
      compareCityInput.value = filteredCompareSuggestions[0];
      compareSuggestionsEl.style.display = "none";
      e.preventDefault();
    }
  }
});

toggleDarkBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  localStorage.setItem("weather_dark", isDark ? "1" : "0");
});

toggleUnitBtn.addEventListener("click", async () => {
  currentUnit = currentUnit === "metric" ? "imperial" : "metric";
  localStorage.setItem("weather_unit", currentUnit);
  toggleUnitBtn.textContent = currentUnit === "metric" ? "°C / °F" : "°F / °C";
  // re-fetch displayed data
  if (currentCity) performSearch(currentCity);
  else if (lastCoords) loadByCoords(lastCoords.lat, lastCoords.lon);
  else initGeolocation();
  loadFavorites();
});

compareBtn.addEventListener("click", () => {
  const city2 = compareCityInput.value.trim();
  if (city2 && currentCity) {
    performComparison(currentCity, city2);
  } else {
    compareResult.innerHTML = "<p>Masukkan kota kedua untuk membandingkan.</p>";
  }
});

if (shareBtn) {
  shareBtn.addEventListener("click", shareWeather);
}

///// Geolocation & init
function initGeolocation() {
  if (!navigator.geolocation) {
    performSearch("Jakarta");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      loadByCoords(pos.coords.latitude, pos.coords.longitude);
    },
    (err) => {
      const last = loadLocal("weather_last_city", "Jakarta");
      performSearch(last);
    },
    { timeout: 8000 }
  );
}
function saveLastCity(city) {
  if (!city) return;
  localStorage.setItem("weather_last_city", city);
}

// wrap renderCurrent to save last city
const origRenderCurrent = renderCurrent;
renderCurrent = function (data) {
  origRenderCurrent(data);
  if (data && data.name) saveLastCity(data.name);
};

///// startup
function initUI() {
  // load prefs
  const darkPref = localStorage.getItem("weather_dark");
  if (darkPref === "1") document.body.classList.add("dark");
  toggleUnitBtn.textContent = currentUnit === "metric" ? "°C / °F" : "°F / °C";
  suggestionsEl.style.display = "none";
  loadHistory();
  loadFavorites();
  // Show comparison section if needed
  const comparisonSection = document.getElementById("comparison");
  if (comparisonSection) comparisonSection.style.display = "block";
}
initUI();
setTimeout(initGeolocation, 200);

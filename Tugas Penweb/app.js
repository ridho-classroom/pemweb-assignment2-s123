// Weather Dashboard JS
// Core: Geolocation, Search, Weather API, Forecast, Persistence, UI
// API: OpenWeatherMap (replace 'YOUR_API_KEY' with your key)

const API_KEY = '{API key}'; // OpenWeatherMap API key
const BASE_URL = 'https://api.openweathermap.org/data/2.5/';
const ICON_URL = 'https://openweathermap.org/img/wn/';

// DOM Elements
const searchInput = document.getElementById('search-input');
const suggestions = document.getElementById('suggestions');
const currentWeather = document.getElementById('current-weather');
const forecast = document.getElementById('forecast');
const loading = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const favoritesList = document.getElementById('favorites-list');
const historyList = document.getElementById('history-list');
const themeToggle = document.getElementById('theme-toggle');
const unitToggle = document.getElementById('unit-toggle');

// State
let unit = localStorage.getItem('unit') || 'metric'; // 'metric' or 'imperial'
let theme = localStorage.getItem('theme') || 'light';
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
let history = JSON.parse(localStorage.getItem('history') || '[]');
let weatherCache = JSON.parse(localStorage.getItem('weatherCache') || '{}');

// Utility
function kelvinToC(k) { return (k - 273.15).toFixed(1); }
function kelvinToF(k) { return ((k - 273.15) * 9/5 + 32).toFixed(1); }
function getUnitSymbol() { return unit === 'metric' ? '°C' : '°F'; }
function getSpeedUnit() { return unit === 'metric' ? 'm/s' : 'mph'; }
function capitalize(str) { return str.charAt(0).toUpperCase() + str.slice(1); }

// Theme
function applyTheme() {
  document.documentElement.setAttribute('data-theme', theme);
  themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
}
themeToggle.addEventListener('click', () => {
  theme = theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', theme);
  applyTheme();
});
applyTheme();

// Unit Toggle
function applyUnit() {
  unitToggle.textContent = unit === 'metric' ? '°C/°F' : '°F/°C';
  localStorage.setItem('unit', unit);
  if (window.lastWeatherData) renderWeather(window.lastWeatherData);
}
unitToggle.addEventListener('click', () => {
  unit = unit === 'metric' ? 'imperial' : 'metric';
  applyUnit();
});
applyUnit();

// Geolocation
window.addEventListener('DOMContentLoaded', () => {
  if (navigator.geolocation) {
    showLoading();
    navigator.geolocation.getCurrentPosition(
      pos => {
        fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        hideLoading();
        showError('Geolocation denied. Please search for a city.');
      }
    );
  }
  renderFavorites();
  renderHistory();
});

// Search
searchInput.addEventListener('input', async e => {
  const q = e.target.value.trim();
  if (!q) {
    suggestions.classList.add('hidden');
    return;
  }
  // Autocomplete using OpenWeatherMap Geocoding API
  try {
    const res = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=5&appid=${API_KEY}`);
    const data = await res.json();
    suggestions.innerHTML = '';
    data.forEach(loc => {
      const li = document.createElement('li');
      li.tabIndex = 0;
      li.textContent = `${loc.name}, ${loc.country}`;
      li.addEventListener('click', () => {
        searchInput.value = '';
        suggestions.classList.add('hidden');
        fetchWeatherByCoords(loc.lat, loc.lon, `${loc.name}, ${loc.country}`);
      });
      li.addEventListener('keydown', e => {
        if (e.key === 'Enter') li.click();
      });
      suggestions.appendChild(li);
    });
    suggestions.classList.toggle('hidden', data.length === 0);
  } catch {
    suggestions.classList.add('hidden');
  }
});
searchInput.addEventListener('blur', () => setTimeout(() => suggestions.classList.add('hidden'), 200));

// Fetch Weather
async function fetchWeatherByCoords(lat, lon, locationName) {
  showLoading();
  hideError();
  try {
    // Check cache
    const cacheKey = `${lat},${lon},${unit}`;
    if (weatherCache[cacheKey] && Date.now() - weatherCache[cacheKey].ts < 10*60*1000) {
      renderWeather(weatherCache[cacheKey].data, locationName);
      hideLoading();
      return;
    }
    const [weatherRes, forecastRes] = await Promise.all([
      fetch(`${BASE_URL}weather?lat=${lat}&lon=${lon}&units=${unit}&appid=${API_KEY}`),
      fetch(`${BASE_URL}forecast?lat=${lat}&lon=${lon}&units=${unit}&appid=${API_KEY}`)
    ]);
    if (!weatherRes.ok || !forecastRes.ok) throw new Error('API error');
    const weatherData = await weatherRes.json();
    const forecastData = await forecastRes.json();
    const data = { weather: weatherData, forecast: forecastData, lat, lon };
    weatherCache[cacheKey] = { data, ts: Date.now() };
    localStorage.setItem('weatherCache', JSON.stringify(weatherCache));
    renderWeather(data, locationName);
    addToHistory(locationName || `${weatherData.name}, ${weatherData.sys.country}`);
  } catch (err) {
    showError('Failed to fetch weather data.');
  }
  hideLoading();
}

// Render Weather
function renderWeather(data, locationName) {
  window.lastWeatherData = data;
  const w = data.weather;
  const f = data.forecast;
  const loc = locationName || `${w.name}, ${w.sys.country}`;
  // Current weather
  currentWeather.innerHTML = `
    <h2>${loc}</h2>
    <img src="${ICON_URL}${w.weather[0].icon}@2x.png" alt="${w.weather[0].description}" width="80" height="80">
    <div class="temp">${Math.round(w.main.temp)}${getUnitSymbol()}</div>
    <div class="desc">${capitalize(w.weather[0].description)}</div>
    <div class="details">
      <span>Feels like: ${Math.round(w.main.feels_like)}${getUnitSymbol()}</span> |
      <span>Humidity: ${w.main.humidity}%</span> |
      <span>Wind: ${w.wind.speed} ${getSpeedUnit()}</span>
    </div>
    <button id="fav-btn">${isFavorite(loc) ? '★ Remove Favorite' : '☆ Add Favorite'}</button>
  `;
  document.getElementById('fav-btn').onclick = () => toggleFavorite(loc, data.lat, data.lon);
  // 5-day forecast
  const days = {};
  f.list.forEach(item => {
    const date = item.dt_txt.split(' ')[0];
    if (!days[date]) days[date] = [];
    days[date].push(item);
  });
  forecast.innerHTML = '';
  Object.keys(days).slice(0,5).forEach(date => {
    const dayData = days[date];
    const temps = dayData.map(d => d.main.temp);
    const icon = dayData[0].weather[0].icon;
    const desc = dayData[0].weather[0].description;
    const min = Math.round(Math.min(...temps));
    const max = Math.round(Math.max(...temps));
    const item = document.createElement('div');
    item.className = 'forecast-item';
    item.tabIndex = 0;
    item.innerHTML = `
      <div>${new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
      <img src="${ICON_URL}${icon}.png" alt="${desc}" width="48" height="48">
      <div>${min}–${max}${getUnitSymbol()}</div>
      <div>${capitalize(desc)}</div>
    `;
    item.onclick = () => showForecastDetails(dayData, date);
    item.onkeydown = e => { if (e.key === 'Enter') item.click(); };
    forecast.appendChild(item);
  });
}

function showForecastDetails(dayData, date) {
  const details = dayData.map(d =>
    `<div>
      <strong>${d.dt_txt.split(' ')[1].slice(0,5)}</strong>: ${Math.round(d.main.temp)}${getUnitSymbol()}, ${capitalize(d.weather[0].description)}
    </div>`
  ).join('');
  errorDiv.innerHTML = `<div><strong>${new Date(date).toLocaleDateString()}</strong><br>${details}</div>`;
  errorDiv.classList.remove('hidden');
  setTimeout(() => errorDiv.classList.add('hidden'), 8000);
}

// Favorites
function isFavorite(loc) { return favorites.some(f => f.loc === loc); }
function toggleFavorite(loc, lat, lon) {
  if (isFavorite(loc)) {
    favorites = favorites.filter(f => f.loc !== loc);
  } else {
    favorites.push({ loc, lat, lon });
  }
  localStorage.setItem('favorites', JSON.stringify(favorites));
  renderFavorites();
}
function renderFavorites() {
  favoritesList.innerHTML = '';
  favorites.forEach(fav => {
    const li = document.createElement('li');
    li.textContent = fav.loc;
    li.tabIndex = 0;
    li.onclick = () => fetchWeatherByCoords(fav.lat, fav.lon, fav.loc);
    li.onkeydown = e => { if (e.key === 'Enter') li.click(); };
    favoritesList.appendChild(li);
  });
}

// History
function addToHistory(loc) {
  if (!loc) return;
  history = history.filter(h => h !== loc);
  history.unshift(loc);
  if (history.length > 8) history = history.slice(0,8);
  localStorage.setItem('history', JSON.stringify(history));
  renderHistory();
}
function renderHistory() {
  historyList.innerHTML = '';
  history.forEach(loc => {
    const li = document.createElement('li');
    li.textContent = loc;
    li.tabIndex = 0;
    li.onclick = () => {
      // Find lat/lon from favorites or cache
      const fav = favorites.find(f => f.loc === loc);
      if (fav) fetchWeatherByCoords(fav.lat, fav.lon, fav.loc);
      else {
        // Try to find in cache
        for (const key in weatherCache) {
          if (weatherCache[key].data && (weatherCache[key].data.weather.name + ', ' + weatherCache[key].data.weather.sys.country) === loc) {
            const d = weatherCache[key].data;
            fetchWeatherByCoords(d.lat, d.lon, loc);
            return;
          }
        }
        showError('Location not found in cache. Please search again.');
      }
    };
    li.onkeydown = e => { if (e.key === 'Enter') li.click(); };
    historyList.appendChild(li);
  });
}

// Loading & Error
function showLoading() { loading.classList.remove('hidden'); }
function hideLoading() { loading.classList.add('hidden'); }
function showError(msg) { errorDiv.textContent = msg; errorDiv.classList.remove('hidden'); }
function hideError() { errorDiv.classList.add('hidden'); }

// Accessibility: keyboard navigation for suggestions
searchInput.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown' && suggestions.children.length) {
    suggestions.children[0].focus();
  }
});
suggestions.addEventListener('keydown', e => {
  const items = Array.from(suggestions.children);
  const idx = items.indexOf(document.activeElement);
  if (e.key === 'ArrowDown' && idx < items.length - 1) {
    items[idx + 1].focus();
    e.preventDefault();
  } else if (e.key === 'ArrowUp' && idx > 0) {
    items[idx - 1].focus();
    e.preventDefault();
  } else if (e.key === 'Escape') {
    searchInput.focus();
    suggestions.classList.add('hidden');
  }
});

// Service Worker for offline support (optional, progressive enhancement)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

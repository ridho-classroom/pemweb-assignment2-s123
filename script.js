const API_KEY = "8174bbd0f512ba1a75df1374a82875ff"; 
const tempEl = document.getElementById("temperature");
const descEl = document.getElementById("description");
const iconEl = document.getElementById("icon");
const dateEl = document.getElementById("date");
const cityEl = document.getElementById("city"); 
const detailsEl = document.getElementById("details"); 

let isCelsius = true; 
let currentWeatherData = null; 

const CACHE_KEYS = {
  CURRENT_WEATHER: 'cached_current_weather',
  FORECAST_WEATHER: 'cached_forecast_weather',
  CACHE_TIMESTAMP: 'cache_timestamp',
  TEMPERATURE_UNIT: 'temperature_unit',
  THEME_PREFERENCE: 'theme_preference',
  FAVORITE_CITIES: 'favoriteCities'
};
const CACHE_EXPIRE_TIME = 30 * 60 * 1000;
function celsiusToFahrenheit(celsius) {
  return (celsius * 9/5) + 32;
}
function formatTemperature(temp) {
  const unit = isCelsius ? '°C' : '°F';
  const convertedTemp = isCelsius ? temp : celsiusToFahrenheit(temp);
  return `${Math.round(convertedTemp)}${unit}`;
}
function loadPreferences() {
  const savedUnit = localStorage.getItem(CACHE_KEYS.TEMPERATURE_UNIT);
  if (savedUnit === 'fahrenheit') {
    isCelsius = false;
  }
  updateUnitToggleUI();
}
const savedTheme = localStorage.getItem(CACHE_KEYS.THEME_PREFERENCE);
if (savedTheme === 'dark') {
  document.documentElement.setAttribute('data-theme', 'dark');
  updateThemeToggleUI();
}

function savePreferences() {
  localStorage.setItem(
    CACHE_KEYS.TEMPERATURE_UNIT,
    isCelsius ? 'celsius' : 'fahrenheit'
  );
}
function toggleTheme() {
  const isDark = document.documentElement.hasAttribute('data-theme');

  if (isDark) {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem(CACHE_KEYS.THEME_PREFERENCE, 'light');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem(CACHE_KEYS.THEME_PREFERENCE, 'dark');
  }

  updateThemeToggleUI();
}

function updateThemeToggleUI() {
  const themeButton = document.getElementById('themeToggleMain');
  const isDark = document.documentElement.hasAttribute('data-theme');

  if (themeButton) {
    themeButton.textContent = isDark ? '🌙' : '☀️';
    themeButton.title = isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme';
  }
}
function toggleHamburgerMenu() {
  const menu = document.getElementById('hamburgerMenu');
  const hamburger = document.getElementById('hamburgerBtn');
  
  if (menu && hamburger) {
    const isActive = menu.classList.contains('active');
    
    if (isActive) {
      menu.classList.remove('active');
      hamburger.classList.remove('active');
    } else {
      menu.classList.add('active');
      hamburger.classList.add('active');
      updateFavoritesList(); 
    }
  }
}
function closeHamburgerMenu() {
  const menu = document.getElementById('hamburgerMenu');
  const hamburger = document.getElementById('hamburgerBtn');

  if (menu && hamburger) {
    menu.classList.remove('active');
    hamburger.classList.remove('active');
  }
}
function closeHamburgerMenu() {
  const menu = document.getElementById('hamburgerMenu');
  const hamburger = document.getElementById('hamburgerBtn');
  
  if (menu && hamburger) {
    menu.classList.remove('active');
    hamburger.classList.remove('active');
  }
}

function toggleTemperatureUnit() {
  isCelsius = !isCelsius;
  updateUnitToggleUI();
  savePreferences();
  
  if (currentWeatherData) {
    updateWeatherUI(currentWeatherData);
  }
  
  const forecastData = getWeatherFromCache();
  if (forecastData && forecastData.forecast) {
    updateForecastUI(forecastData.forecast);
  }
  
  console.log(`Temperature unit switched to: ${isCelsius ? 'Celsius' : 'Fahrenheit'}`);
}

function updateUnitToggleUI() {
  const unitToggle = document.getElementById('unitToggle');
  if (unitToggle) {
    if (isCelsius) {
      unitToggle.textContent = '°C';
      unitToggle.classList.remove('fahrenheit');
    } else {
      unitToggle.textContent = '°F';
      unitToggle.classList.add('fahrenheit');
    }
  }
}

function updateFavoritesList() {
  const favoritesList = document.getElementById('favoritesList');
  if (!favoritesList) return;
  
  const favorites = JSON.parse(localStorage.getItem(CACHE_KEYS.FAVORITE_CITIES)) || [];
  
  if (favorites.length === 0) {
    favoritesList.innerHTML = '<p class="no-favorites">No favorites yet</p>';
    return;
  }
  
  favoritesList.innerHTML = favorites.map(city => `
    <div class="favorite-item" onclick="loadFavoriteCity('${city}')">
      <span class="favorite-name">${city}</span>
      <button class="favorite-remove" onclick="removeFavorite('${city}', event)" title="Remove">×</button>
    </div>
  `).join('');
}

function loadFavoriteCity(city) {
  fetchWeather(city);
  closeHamburgerMenu();
  console.log(`Loading favorite city: ${city}`);
}

function removeFavorite(city, event) {
  event.stopPropagation(); // Prevent triggering loadFavoriteCity
  
  let favorites = JSON.parse(localStorage.getItem(CACHE_KEYS.FAVORITE_CITIES)) || [];
  favorites = favorites.filter(fav => fav !== city);
  
  localStorage.setItem(CACHE_KEYS.FAVORITE_CITIES, JSON.stringify(favorites));
  updateFavoritesList();
  
  console.log(`Removed ${city} from favorites`);
}

function addToFavorites() {
  const city = cityEl.textContent.split(",")[0];
  if (!city || city === '--') {
    alert('No city to add to favorites');
    return;
  }

  let favorites = JSON.parse(localStorage.getItem(CACHE_KEYS.FAVORITE_CITIES)) || [];

  if (!favorites.includes(city)) {
    favorites.push(city);
    localStorage.setItem(CACHE_KEYS.FAVORITE_CITIES, JSON.stringify(favorites));
    alert(`${city} added to favorites!`);
    console.log(`Added ${city} to favorites`);
  } else {
    alert(`${city} is already in favorites`);
  }
}

function clearAllFavorites() {
  if (confirm('Are you sure you want to clear all favorites?')) {
    localStorage.removeItem(CACHE_KEYS.FAVORITE_CITIES);
    updateFavoritesList();
    alert('All favorites cleared');
    console.log('All favorites cleared');
  }
}

function saveWeatherToCache(weatherData, forecastData = null) {
  try {
    localStorage.setItem(CACHE_KEYS.CURRENT_WEATHER, JSON.stringify(weatherData));
    if (forecastData) {
      localStorage.setItem(CACHE_KEYS.FORECAST_WEATHER, JSON.stringify(forecastData));
    }
    localStorage.setItem(CACHE_KEYS.CACHE_TIMESTAMP, Date.now().toString());
    console.log("Weather data saved to cache");
  } catch (error) {
    console.error("Failed to save cache:", error);
  }
}

function getWeatherFromCache() {
  try {
    const currentWeather = localStorage.getItem(CACHE_KEYS.CURRENT_WEATHER);
    const forecastWeather = localStorage.getItem(CACHE_KEYS.FORECAST_WEATHER);
    const timestamp = localStorage.getItem(CACHE_KEYS.CACHE_TIMESTAMP);
    
    if (currentWeather && timestamp) {
      const cacheAge = Date.now() - parseInt(timestamp);
      
      return {
        current: JSON.parse(currentWeather),
        forecast: forecastWeather ? JSON.parse(forecastWeather) : null,
        isExpired: cacheAge > CACHE_EXPIRE_TIME,
        cacheAge: cacheAge
      };
    }
    
    return null;
  } catch (error) {
    console.error("Failed to read cache:", error);
    return null;
  }
}

function clearWeatherCache() {
  localStorage.removeItem(CACHE_KEYS.CURRENT_WEATHER);
  localStorage.removeItem(CACHE_KEYS.FORECAST_WEATHER);
  localStorage.removeItem(CACHE_KEYS.CACHE_TIMESTAMP);
  alert('Cache cleared');
  console.log("Cache cleared");
}

function isOnline() {
  return navigator.onLine;
}

function showOfflineIndicator() {
  const offlineIndicator = document.createElement('div');
  offlineIndicator.id = 'offline-indicator';
  offlineIndicator.textContent = '📡 Data dari cache (offline)';
  
  const weatherCard = document.querySelector('.weather-card');
  const existingIndicator = document.getElementById('offline-indicator');
  
  if (!existingIndicator && weatherCard) {
    weatherCard.insertBefore(offlineIndicator, weatherCard.firstChild);
  }
}

function hideOfflineIndicator() {
  const indicator = document.getElementById('offline-indicator');
  if (indicator) {
    indicator.remove();
  }
}

function showCacheInfo(cacheAge) {
  const minutes = Math.floor(cacheAge / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  
  let timeText = '';
  if (hours > 0) {
    timeText = `${hours} jam ${minutes % 60} menit yang lalu`;
  } else {
    timeText = `${minutes} menit yang lalu`;
  }
  
  const cacheInfo = document.createElement('p');
  cacheInfo.id = 'cache-info';
  cacheInfo.textContent = `📅 Data diperbarui ${timeText}`;
  
  const existingInfo = document.getElementById('cache-info');
  if (existingInfo) {
    existingInfo.remove();
  }
  
  if (detailsEl) {
    detailsEl.appendChild(cacheInfo);
  }
}
function updateNetworkStatus() {
  const statusEl = document.getElementById('networkStatus');
  if (statusEl) {
    if (navigator.onLine) {
      statusEl.className = 'network-status online';
      statusEl.setAttribute('data-status', 'Online');
    } else {
      statusEl.className = 'network-status offline';
      statusEl.setAttribute('data-status', 'Offline');
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  updateDate();
  loadPreferences();
  updateNetworkStatus();
  
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  if (hamburgerBtn) {
    hamburgerBtn.addEventListener('click', toggleHamburgerMenu);
  }
  
  const closeMenuBtn = document.getElementById('closeMenu');
  if (closeMenuBtn) {
    closeMenuBtn.addEventListener('click', closeHamburgerMenu);
  }

  const themeToggleBtn = document.getElementById('themeToggleMain');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', toggleTheme);
  }
  
  const unitToggle = document.getElementById('unitToggle');
  if (unitToggle) {
    unitToggle.addEventListener('click', toggleTemperatureUnit);
  }
  
  const clearFavBtn = document.getElementById('clearFavorites');
  if (clearFavBtn) {
    clearFavBtn.addEventListener('click', clearAllFavorites);
  }
  
  const clearCacheBtn = document.getElementById('clearCache');
  if (clearCacheBtn) {
    clearCacheBtn.addEventListener('click', clearWeatherCache);
  }
  
  // Setup add favorite button
  const addFavoriteBtn = document.getElementById('addFavorite');
  if (addFavoriteBtn) {
    addFavoriteBtn.addEventListener('click', addToFavorites);
  }
  
  const hamburgerMenu = document.getElementById('hamburgerMenu');
  if (hamburgerMenu) {
    hamburgerMenu.addEventListener('click', (e) => {
      if (e.target === hamburgerMenu) {
        closeHamburgerMenu();
      }
    });
  }

  window.addEventListener('online', () => {
    console.log("Back online");
    hideOfflineIndicator();
    updateNetworkStatus();
    
    const cachedData = getWeatherFromCache();
    if (cachedData && cachedData.isExpired) {
      const currentCity = cityEl.textContent.split(",")[0];
      if (currentCity && currentCity !== '--') {
        fetchWeather(currentCity);
      }
    }
  });
  
  window.addEventListener('offline', () => {
    console.log("Offline mode");
    showOfflineIndicator();
    updateNetworkStatus();
  });
});

function updateDate() {
  const today = new Date();
  dateEl.textContent = today.toLocaleDateString("id-ID", {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
}

async function fetchWeather(city) {
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric&lang=id`;

  if (!isOnline()) {
    const cachedData = getWeatherFromCache();
    if (cachedData) {
      console.log("Using cached data (offline)");
      currentWeatherData = cachedData.current;
      updateWeatherUI(cachedData.current);
      if (cachedData.forecast) {
        updateForecastUI(cachedData.forecast);
      }
      showOfflineIndicator();
      showCacheInfo(cachedData.cacheAge);
      return;
    } else {
      alert("❌ Tidak ada koneksi internet dan tidak ada data cache.");
      return;
    }
  }

  try {
    const res = await fetch(url);
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const data = await res.json();

    if (data.cod !== 200) {
      const cachedData = getWeatherFromCache();
      if (cachedData) {
        console.log("API error, using cached data");
        currentWeatherData = cachedData.current;
        updateWeatherUI(cachedData.current);
        if (cachedData.forecast) {
          updateForecastUI(cachedData.forecast);
        }
        showCacheInfo(cachedData.cacheAge);
        alert(`⚠️ Kota tidak ditemukan, menampilkan data terakhir.`);
        return;
      }
      alert("❌ Kota tidak ditemukan!");
      return;
    }

    currentWeatherData = data;
    updateWeatherUI(data);
    fetchForecast(data.name, data);
    hideOfflineIndicator();

  } catch (error) {
    console.error("Error fetching weather:", error);
    
    const cachedData = getWeatherFromCache();
    if (cachedData) {
      console.log("Network error, using cached data");
      currentWeatherData = cachedData.current;
      updateWeatherUI(cachedData.current);
      if (cachedData.forecast) {
        updateForecastUI(cachedData.forecast);
      }
      showCacheInfo(cachedData.cacheAge);
      alert("⚠️ Koneksi bermasalah, menampilkan data terakhir.");
    } else {
      alert("❌ Gagal mengambil data cuaca dan tidak ada data cache.");
    }
  }
}

async function fetchGeoWeather(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=id`;

  if (!isOnline()) {
    const cachedData = getWeatherFromCache();
    if (cachedData) {
      console.log("Using cached data (offline - geo)");
      currentWeatherData = cachedData.current;
      updateWeatherUI(cachedData.current);
      if (cachedData.forecast) {
        updateForecastUI(cachedData.forecast);
      }
      showOfflineIndicator();
      showCacheInfo(cachedData.cacheAge);
      return;
    } else {
      alert("❌ Tidak ada koneksi internet dan tidak ada data cache.");
      return;
    }
  }

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.cod !== 200) {
      const cachedData = getWeatherFromCache();
      if (cachedData) {
        currentWeatherData = cachedData.current;
        updateWeatherUI(cachedData.current);
        if (cachedData.forecast) {
          updateForecastUI(cachedData.forecast);
        }
        showCacheInfo(cachedData.cacheAge);
        return;
      }
      alert("❌ Lokasi tidak ditemukan!");
      return;
    }

    currentWeatherData = data;
    updateWeatherUI(data);
    fetchForecast(data.name, data);
    hideOfflineIndicator();

  } catch (error) {
    console.error("Error geo weather:", error);
    
    const cachedData = getWeatherFromCache();
    if (cachedData) {
      currentWeatherData = cachedData.current;
      updateWeatherUI(cachedData.current);
      if (cachedData.forecast) {
        updateForecastUI(cachedData.forecast);
      }
      showCacheInfo(cachedData.cacheAge);
      alert("⚠️ Koneksi bermasalah, menampilkan data terakhir.");
    } else {
      alert("❌ Gagal mengambil data cuaca dari lokasi dan tidak ada data cache.");
    }
  }
}

async function fetchForecast(city, currentWeatherData = null) {
  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric&lang=id`;

  if (!isOnline()) {
    console.log("Offline - forecast already loaded from cache");
    return;
  }

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.cod !== "200") {
      console.error("Failed to get forecast");
      return;
    }

    updateForecastUI(data);
    
    if (currentWeatherData) {
      saveWeatherToCache(currentWeatherData, data);
    }

  } catch (error) {
    console.error("Error forecast:", error);
  }
}

function updateWeatherUI(data) {
  tempEl.textContent = formatTemperature(data.main.temp);
  descEl.textContent = `${data.weather[0].main} • ${data.weather[0].description}`;
  cityEl.textContent = `${data.name}, ${data.sys.country}`;
  iconEl.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;

  const feelsLike = formatTemperature(data.main.feels_like);
  detailsEl.innerHTML = `
    <p>Kelembapan: ${data.main.humidity}%</p>
    <p>Terasa: ${feelsLike}</p>
    <p>Angin: ${data.wind.speed} m/s</p>
  `;
}

function updateForecastUI(data) {
  const tableBody = document.querySelector("#forecastTable tbody");
  if (!tableBody) return;
  
  tableBody.innerHTML = "";

  const daily = data.list.filter(item => item.dt_txt.includes("12:00:00"));
  daily.slice(0, 5).forEach(day => {
    const date = new Date(day.dt_txt).toLocaleDateString("id-ID", {
      weekday: "short", day: "numeric", month: "short"
    });
  
    const temp = formatTemperature(day.main.temp);
    const icon = `https://openweathermap.org/img/wn/${day.weather[0].icon}.png`;
    const desc = day.weather[0].description;
    
    const row = `
      <tr>
        <td>${date}</td>
        <td><img src="${icon}" alt="${desc}"></td>
        <td>${temp}</td>
        <td>${desc}</td>
      </tr>
    `;
    tableBody.innerHTML += row;
  });
}
const cities = ["Jakarta", "Bandung", "Surabaya", "Medan", "Bali", "Yogyakarta"];
const cityInput = document.getElementById("cityInput");
const suggestions = document.getElementById("suggestions");

function searchWeather() {
  const city = cityInput.value.trim();
  if (city !== "") {
    fetchWeather(city);
    saveHistory(city);
    closeHamburgerMenu();
  }
}
function saveHistory(city) {
  let history = JSON.parse(localStorage.getItem("cityHistory")) || [];
  
  if (!history.includes(city)) {
    history.unshift(city);
  }
  
  if (history.length > 10) history.pop();
  
  localStorage.setItem("cityHistory", JSON.stringify(history));
}

cityInput?.addEventListener("input", () => {
  const value = cityInput.value.toLowerCase();
  suggestions.innerHTML = "";

  const history = JSON.parse(localStorage.getItem("cityHistory")) || [];
  const allCities = [...history, ...cities];
  const uniqueCities = [...new Set(allCities)];

  if (value) {
    const matches = uniqueCities.filter(city => city.toLowerCase().startsWith(value));
    matches.forEach(match => {
      const div = document.createElement("div");
      div.textContent = match;
      div.addEventListener("click", () => {
        cityInput.value = match;
        suggestions.innerHTML = "";
        fetchWeather(match);
        saveHistory(match);
        closeHamburgerMenu();
      });
      suggestions.appendChild(div);
    });
  }
});

document.addEventListener("click", (e) => {
  if (cityInput && suggestions && 
      !cityInput.contains(e.target) && !suggestions.contains(e.target)) {
    suggestions.innerHTML = "";
  }
});

document.getElementById("geoToggle")?.addEventListener("change", function () {
  if (this.checked) {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(position => {
        fetchGeoWeather(position.coords.latitude, position.coords.longitude);
        closeHamburgerMenu();
      });
    } else {
      alert("❌ Geolocation tidak didukung di browser ini.");
    }
  }
});
window.addEventListener("load", () => {
  const cachedData = getWeatherFromCache();
  if (cachedData && !cachedData.isExpired) {
    console.log("Loading cached data on startup");
    currentWeatherData = cachedData.current;
    updateWeatherUI(cachedData.current);
    if (cachedData.forecast) {
      updateForecastUI(cachedData.forecast);
    }
    showCacheInfo(cachedData.cacheAge);
  }
  
  if (navigator.geolocation && isOnline()) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetchGeoWeather(pos.coords.latitude, pos.coords.longitude);
        document.getElementById("geoToggle").checked = true; 
      },
      (err) => {
        console.warn("Location permission denied");
        
        if (cachedData) {
          console.log("Using cached data because location denied");
        } else {
          alert("Aktifkan lokasi atau ketik kota di kolom pencarian.");
        }
      }
    );
  } else if (!isOnline() && cachedData) {
    console.log("Offline mode - using cache");
    showOfflineIndicator();
  } else if (!cachedData) {
    console.warn("Browser doesn't support geolocation or offline without cache");
    alert("Browser tidak mendukung lokasi, silakan cari kota manual.");
  }
});
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'T') {
    e.preventDefault();
    toggleTheme();
  }
  
  if (e.ctrlKey && e.key === 'm') {
    e.preventDefault();
    toggleHamburgerMenu();
  }
  
  // Ctrl + U untuk toggle unit
  if (e.ctrlKey && e.key === 'u') {
    e.preventDefault();
    toggleTemperatureUnit();
  }
});

window.weatherCache = {
  clear: clearWeatherCache,
  status: () => {
    const cachedData = getWeatherFromCache();
    if (cachedData) {
      console.log("Cache status:", {
        hasData: !!cachedData.current,
        hasForecast: !!cachedData.forecast,
        isExpired: cachedData.isExpired,
        ageMinutes: Math.floor(cachedData.cacheAge / (1000 * 60))
      });
    } else {
      console.log("No cached data");
    }
  },
  get: getWeatherFromCache,
  toggleUnit: toggleTemperatureUnit,
  toggleMenu: toggleHamburgerMenu,
  toggleTheme: toggleTheme
};
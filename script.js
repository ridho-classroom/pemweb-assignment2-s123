/* 
   ===========================================
   WEATHER DASHBOARD JAVASCRIPT
   ===========================================
   File ini menangani semua functionality:
   - API calls ke OpenWeatherMap
   - DOM manipulation
   - Local storage management
   - Event handling
   - Theme switching
   - Temperature unit conversion
*/

// ===========================================
// KONSTANTA DAN KONFIGURASI
// ===========================================

// API key dari OpenWeatherMap
const API_KEY = "ffd954fc18fb9699af20a0e5a7b85fdf";

// Base URL untuk OpenWeatherMap API
const BASE_URL = "https://api.openweathermap.org/data/2.5";

// ===========================================
// GLOBAL VARIABLES
// ===========================================

// Menyimpan data cuaca saat ini untuk reference
let currentWeatherData = null;

// Theme state - false = light, true = dark
let isDarkMode = false;

// Temperature unit - 'celsius' atau 'fahrenheit'
let tempUnit = "celsius";

// Array untuk menyimpan lokasi favorit
let favorites = [];

// Array untuk menyimpan recent searches
let recentSearches = [];

// ===========================================
// WEATHER ICONS MAPPING
// ===========================================

const weatherIcons = {
  clear: "☀️",
  sunny: "☀️",
  clouds: "☁️",
  overcast: "☁️",
  rain: "🌧️",
  drizzle: "🌧️",
  thunderstorm: "⛈️",
  storm: "⛈️",
  snow: "❄️",
  snowy: "❄️",
  mist: "🌫️",
  fog: "🌫️",
  haze: "🌫️",
  "few clouds": "⛅",
  "scattered clouds": "⛅",
};

// ===========================================
// INITIALIZATION
// ===========================================

document.addEventListener("DOMContentLoaded", function () {
  console.log("🌤️ Weather Dashboard initializing...");

  // Load settings dari localStorage
  loadSettings();

  // Setup event listeners
  setupEventListeners();

  // Load default weather (Jakarta)
  loadDefaultWeather();
});

// ===========================================
// SETTINGS & STORAGE MANAGEMENT
// ===========================================

function loadSettings() {
  console.log("📂 Loading saved settings...");

  // Load theme preference
  isDarkMode = localStorage.getItem("darkMode") === "true";
  if (isDarkMode) {
    document.body.classList.add("dark");
    console.log("🌙 Dark mode enabled");
  }

  // Load temperature unit preference
  tempUnit = localStorage.getItem("tempUnit") || "celsius";
  updateUnitToggle();
  console.log(`🌡️ Temperature unit: ${tempUnit}`);

  // Load favorites dan recent searches dari localStorage
  favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
  recentSearches = JSON.parse(localStorage.getItem("recentSearches") || "[]");

  console.log(`❤️ Loaded ${favorites.length} favorites`);
  console.log(`🔍 Loaded ${recentSearches.length} recent searches`);

  // Update UI untuk menampilkan favorites
  updateFavoritesDisplay();
}

function setupEventListeners() {
  console.log("🔧 Setting up event listeners...");

  const searchInput = document.getElementById("searchInput");

  // Event listener untuk Enter key pada search input
  searchInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      const query = this.value.trim();
      if (query) {
        console.log(`🔍 Search triggered: ${query}`);
        searchWeather(query);
      }
    }
  });
}

// ===========================================
// THEME & UI CONTROLS
// ===========================================

function toggleTheme() {
  isDarkMode = !isDarkMode;

  document.body.classList.toggle("dark", isDarkMode);
  localStorage.setItem("darkMode", isDarkMode.toString());

  console.log(`🎨 Theme switched to: ${isDarkMode ? "dark" : "light"}`);
}

function toggleUnit() {
  tempUnit = tempUnit === "celsius" ? "fahrenheit" : "celsius";
  localStorage.setItem("tempUnit", tempUnit);

  updateUnitToggle();
  console.log(`🌡️ Temperature unit changed to: ${tempUnit}`);

  // Refresh display jika ada data cuaca saat ini
  if (currentWeatherData) {
    displayCurrentWeather(currentWeatherData.current);
    displayForecast(currentWeatherData.forecast);
  }
}

function updateUnitToggle() {
  const unitToggle = document.getElementById("unitToggle");
  unitToggle.textContent = tempUnit === "celsius" ? "°C" : "°F";
}

function convertTemp(temp) {
  if (tempUnit === "fahrenheit") {
    return Math.round((temp * 9) / 5 + 32);
  }
  return Math.round(temp);
}

// ===========================================
// UI STATE MANAGEMENT
// ===========================================

function showLoading() {
  const loading = document.getElementById("loading");
  const weatherCard = document.getElementById("weatherCard");

  loading.classList.remove("hidden");
  weatherCard.style.opacity = "0.5";

  console.log("⏳ Loading state activated");
}

function hideLoading() {
  const loading = document.getElementById("loading");
  const weatherCard = document.getElementById("weatherCard");

  loading.classList.add("hidden");
  weatherCard.style.opacity = "1";

  console.log("✅ Loading state deactivated");
}

function showError(message) {
  const errorEl = document.getElementById("error");
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");

  console.error(`❌ Error: ${message}`);

  // Auto-hide setelah 5 detik
  setTimeout(() => {
    errorEl.classList.add("hidden");
  }, 5000);
}

// ===========================================
// WEATHER DATA FETCHING
// ===========================================

async function loadDefaultWeather() {
  console.log("🏠 Loading default weather for Jakarta...");
  try {
    showLoading();
    await fetchWeatherByCity("Jakarta");
  } catch (error) {
    console.error("Failed to load default weather:", error);
    showError("Failed to load default weather data");
  }
}

async function getCurrentLocation() {
  console.log("📍 Getting current location...");

  if (!navigator.geolocation) {
    showError("Geolocation is not supported by your browser");
    return;
  }

  showLoading();

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      console.log(`📍 Location found: ${latitude}, ${longitude}`);
      await fetchWeatherByCoords(latitude, longitude);
    },
    (error) => {
      hideLoading();
      console.error("Geolocation error:", error);

      let errorMessage = "Unable to get your location";
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage += ": Permission denied";
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage += ": Location unavailable";
          break;
        case error.TIMEOUT:
          errorMessage += ": Request timeout";
          break;
      }

      showError(errorMessage);
    },
    {
      timeout: 10000,
      enableHighAccuracy: true,
    }
  );
}

async function searchWeather(city) {
  if (!city.trim()) {
    console.warn("⚠️ Empty city name provided");
    return;
  }

  console.log(`🔍 Searching weather for: ${city}`);
  showLoading();

  await fetchWeatherByCity(city.trim());
  addToRecentSearches(city.trim());

  // Clear search input
  document.getElementById("searchInput").value = "";
}

async function fetchWeatherByCity(city) {
  try {
    console.log(`🌐 Fetching weather for city: ${city}`);

    const response = await fetch(
      `${BASE_URL}/weather?q=${encodeURIComponent(
        city
      )}&appid=${API_KEY}&units=metric`
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`City "${city}" not found`);
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ Weather data received:", data.name);

    await fetchAdditionalData(data);
  } catch (error) {
    hideLoading();
    console.error("Error fetching weather by city:", error);
    showError(`Error: ${error.message}`);
  }
}

async function fetchWeatherByCoords(lat, lon) {
  try {
    console.log(`🌐 Fetching weather for coordinates: ${lat}, ${lon}`);

    const response = await fetch(
      `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ Weather data received:", data.name);

    await fetchAdditionalData(data);
  } catch (error) {
    hideLoading();
    console.error("Error fetching weather by coordinates:", error);
    showError(`Error: ${error.message}`);
  }
}

async function fetchAdditionalData(currentData) {
  try {
    console.log("📊 Fetching forecast data...");

    const forecastResponse = await fetch(
      `${BASE_URL}/forecast?q=${currentData.name}&appid=${API_KEY}&units=metric`
    );

    if (!forecastResponse.ok) {
      throw new Error("Failed to fetch forecast data");
    }

    const forecastData = await forecastResponse.json();
    console.log("✅ Forecast data received");

    currentWeatherData = {
      current: currentData,
      forecast: forecastData,
    };

    displayCurrentWeather(currentData);
    displayForecast(forecastData);
    updateFavoriteButton(currentData);

    console.log("🎉 Weather display updated successfully");
  } catch (error) {
    console.error("Error fetching additional data:", error);
    displayCurrentWeather(currentData);
    updateFavoriteButton(currentData);
    showError("Some weather data may be incomplete");
  } finally {
    hideLoading();
  }
}

// ===========================================
// DISPLAY FUNCTIONS
// ===========================================

function displayCurrentWeather(data) {
  console.log("🎨 Updating current weather display...");

  const location = `${data.name}, ${data.sys.country}`;
  const temp = convertTemp(data.main.temp);
  const feelsLike = convertTemp(data.main.feels_like);
  const unit = tempUnit === "celsius" ? "C" : "F";

  document.getElementById("locationName").textContent = location;
  document.getElementById("temperature").textContent = `${temp}°`;
  document.getElementById("condition").textContent =
    data.weather[0].description;
  document.getElementById(
    "feelsLike"
  ).textContent = `Feels like ${feelsLike}°${unit}`;

  const condition = data.weather[0].main.toLowerCase();
  const description = data.weather[0].description;
  document.getElementById("weatherEmoji").textContent = getWeatherEmoji(
    condition,
    description
  );

  updateWeatherDetails(data);
  updateSunTimes(data);

  console.log(`✅ Weather display updated for ${location}`);
}

function updateWeatherDetails(data) {
  const windSpeed = Math.round(data.wind.speed * 3.6);
  document.getElementById("windSpeed").textContent = `${windSpeed} km/h`;

  document.getElementById("humidity").textContent = `${data.main.humidity}%`;

  // UV Index placeholder (requires additional API call)
  document.getElementById("uvIndex").textContent = "6";

  const visibility = Math.round(data.visibility / 1000);
  document.getElementById("visibility").textContent = `${visibility} km`;
}

function updateSunTimes(data) {
  const sunrise = new Date(data.sys.sunrise * 1000);
  const sunset = new Date(data.sys.sunset * 1000);

  const sunriseTime = sunrise.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const sunsetTime = sunset.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  document.getElementById("sunrise").textContent = sunriseTime;
  document.getElementById("sunset").textContent = sunsetTime;
}

function getWeatherEmoji(condition, description) {
  const desc = description.toLowerCase();

  if (desc.includes("clear") || desc.includes("sunny")) return "☀️";
  if (desc.includes("few clouds")) return "⛅";
  if (desc.includes("cloud")) return "☁️";
  if (desc.includes("rain") || desc.includes("drizzle")) return "🌧️";
  if (desc.includes("thunderstorm") || desc.includes("storm")) return "⛈️";
  if (desc.includes("snow")) return "❄️";
  if (desc.includes("mist") || desc.includes("fog") || desc.includes("haze"))
    return "🌫️";

  return weatherIcons[condition] || "🌤️";
}

function displayForecast(data) {
  console.log("📅 Updating forecast display...");

  const forecastList = document.getElementById("forecastList");
  const dailyForecasts = [];

  // Group forecast by day (setiap 8 item = 24 jam)
  for (let i = 0; i < data.list.length; i += 8) {
    if (dailyForecasts.length >= 5) break;
    dailyForecasts.push(data.list[i]);
  }

  const forecastHTML = dailyForecasts
    .map((day, index) => {
      const date = new Date(day.dt * 1000);
      const dayName =
        index === 0
          ? "Today"
          : date.toLocaleDateString("en-US", { weekday: "short" });

      const high = convertTemp(day.main.temp_max);
      const low = convertTemp(day.main.temp_min);

      const emoji = getWeatherEmoji(
        day.weather[0].main.toLowerCase(),
        day.weather[0].description
      );

      return `
            <div class="forecast-item">
                <div class="forecast-day-info">
                    <div class="forecast-emoji">${emoji}</div>
                    <div class="forecast-day">${dayName}</div>
                </div>
                <div class="forecast-condition">${day.weather[0].description}</div>
                <div class="forecast-temps">
                    <span class="forecast-high">${high}°</span>
                    <span style="color: var(--text-secondary-light)">/</span>
                    <span class="forecast-low">${low}°</span>
                </div>
            </div>
        `;
    })
    .join("");

  forecastList.innerHTML = forecastHTML;
  console.log("✅ Forecast display updated");
}

// ===========================================
// FAVORITES MANAGEMENT
// ===========================================

function toggleFavorite() {
  if (!currentWeatherData) return;

  const location = `${currentWeatherData.current.name}, ${currentWeatherData.current.sys.country}`;

  if (favorites.includes(location)) {
    removeFromFavorites(location);
  } else {
    addToFavorites(location);
  }

  updateFavoriteButton(currentWeatherData.current);
  updateFavoritesDisplay();
}

function addToFavorites(location) {
  if (!favorites.includes(location)) {
    favorites.push(location);
    localStorage.setItem("favorites", JSON.stringify(favorites));
    console.log(`❤️ Added ${location} to favorites`);
  }
}

function removeFromFavorites(location) {
  favorites = favorites.filter((fav) => fav !== location);
  localStorage.setItem("favorites", JSON.stringify(favorites));
  console.log(`💔 Removed ${location} from favorites`);
}

function updateFavoriteButton(data) {
  const location = `${data.name}, ${data.sys.country}`;
  const favoriteBtn = document.querySelector(".favorite-btn");
  const favoriteIcon = document.querySelector(".favorite-icon");

  if (favorites.includes(location)) {
    favoriteBtn.classList.add("active");
    favoriteIcon.style.fill = "var(--red)";
  } else {
    favoriteBtn.classList.remove("active");
    favoriteIcon.style.fill = "none";
  }
}

function updateFavoritesDisplay() {
  const favoritesCard = document.getElementById("favoritesCard");
  const favoritesList = document.getElementById("favoritesList");

  if (favorites.length === 0) {
    favoritesCard.classList.add("hidden");
    return;
  }

  favoritesCard.classList.remove("hidden");

  const favoritesHTML = favorites
    .map(
      (location) => `
        <div class="favorite-item" onclick="searchWeather('${
          location.split(",")[0]
        }')">
            <div class="favorite-location">
                <svg class="pin-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                <span class="favorite-name">${location}</span>
            </div>
            <button class="remove-btn" onclick="event.stopPropagation(); removeFromFavorites('${location}'); updateFavoritesDisplay();">
                <svg class="remove-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        </div>
    `
    )
    .join("");

  favoritesList.innerHTML = favoritesHTML;
}

// ===========================================
// RECENT SEARCHES MANAGEMENT
// ===========================================

function addToRecentSearches(city) {
  // Remove if already exists
  recentSearches = recentSearches.filter((search) => search !== city);

  // Add to beginning
  recentSearches.unshift(city);

  // Keep only last 5 searches
  recentSearches = recentSearches.slice(0, 5);

  // Save to localStorage
  localStorage.setItem("recentSearches", JSON.stringify(recentSearches));

  console.log(`🔍 Added ${city} to recent searches`);
}

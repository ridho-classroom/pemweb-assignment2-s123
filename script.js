// Weather Dashboard JavaScript
// API Configuration
const API_KEY = "e30e59a46cf9deea7e7b82eca3c209dd"; // Ganti dengan API key kamu dari openweathermap.org
const BASE_URL = "https://api.openweathermap.org/data/2.5";
const GEO_URL = "https://api.openweathermap.org/geo/1.0";

// State Management
let currentUnit = "metric";
let currentCity = null;
let favorites = JSON.parse(localStorage.getItem("weatherFavorites")) || [];
let recentSearches = JSON.parse(localStorage.getItem("recentSearches")) || [];

// DOM Elements
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const locationBtn = document.getElementById("locationBtn");
const themeToggle = document.getElementById("themeToggle");
const unitBtns = document.querySelectorAll(".unit-btn");
const loadingSpinner = document.getElementById("loadingSpinner");
const weatherContent = document.getElementById("weatherContent");
const favoriteBtn = document.getElementById("favoriteBtn");

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
  initializeTheme();
  initializeEventListeners();
  loadRecentSearches();
  loadFavorites();

  // Load default city (Jakarta)
  fetchWeatherByCity("Jakarta");
});

// Theme Management
function initializeTheme() {
  const savedTheme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
  updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
  const icon = themeToggle.querySelector("i");
  icon.className = theme === "light" ? "fas fa-moon" : "fas fa-sun";
}

// Event Listeners
function initializeEventListeners() {
  searchBtn.addEventListener("click", handleSearch);
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleSearch();
  });
  locationBtn.addEventListener("click", getCurrentLocation);
  themeToggle.addEventListener("click", toggleTheme);

  unitBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      unitBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentUnit = btn.dataset.unit;
      if (currentCity) {
        fetchWeatherByCity(currentCity);
      }
    });
  });

  favoriteBtn.addEventListener("click", toggleFavorite);
}

// Search Functions
function handleSearch() {
  const city = searchInput.value.trim();
  if (city) {
    fetchWeatherByCity(city);
    addToRecentSearches(city);
  }
}

function addToRecentSearches(city) {
  if (!recentSearches.includes(city)) {
    recentSearches.unshift(city);
    if (recentSearches.length > 5) recentSearches.pop();
    localStorage.setItem("recentSearches", JSON.stringify(recentSearches));
    loadRecentSearches();
  }
}

function loadRecentSearches() {
  const container = document.getElementById("recentSearches");
  container.innerHTML = "";

  recentSearches.forEach((city) => {
    const item = document.createElement("div");
    item.className = "recent-item";
    item.textContent = city;
    item.addEventListener("click", () => {
      searchInput.value = city;
      fetchWeatherByCity(city);
    });
    container.appendChild(item);
  });
}

// Geolocation
function getCurrentLocation() {
  if (navigator.geolocation) {
    loadingSpinner.style.display = "block";
    weatherContent.style.display = "none";

    navigator.geolocation.getCurrentPosition(
      (position) => {
        fetchWeatherByCoords(
          position.coords.latitude,
          position.coords.longitude
        );
      },
      (error) => {
        alert(
          "Unable to get your location. Please search for a city manually."
        );
        loadingSpinner.style.display = "none";
      }
    );
  } else {
    alert("Geolocation is not supported by your browser.");
  }
}

// API Calls
async function fetchWeatherByCity(city) {
  try {
    loadingSpinner.style.display = "block";
    weatherContent.style.display = "none";

    // Get coordinates first
    const geoResponse = await fetch(
      `${GEO_URL}/direct?q=${city}&limit=1&appid=${API_KEY}`
    );
    const geoData = await geoResponse.json();

    if (geoData.length === 0) {
      throw new Error("City not found");
    }

    const { lat, lon, name, country } = geoData[0];
    currentCity = name;

    await fetchWeatherByCoords(lat, lon, name, country);
  } catch (error) {
    console.error("Error fetching weather:", error);
    alert("City not found. Please try again.");
    loadingSpinner.style.display = "none";
  }
}

async function fetchWeatherByCoords(
  lat,
  lon,
  cityName = null,
  countryName = null
) {
  try {
    // Fetch current weather
    const currentResponse = await fetch(
      `${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${API_KEY}`
    );
    const currentData = await currentResponse.json();

    // Fetch forecast
    const forecastResponse = await fetch(
      `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${API_KEY}`
    );
    const forecastData = await forecastResponse.json();

    // Fetch air quality
    const airQualityResponse = await fetch(
      `${BASE_URL}/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`
    );
    const airQualityData = await airQualityResponse.json();

    currentCity = cityName || currentData.name;

    displayCurrentWeather(currentData);
    displayHourlyForecast(forecastData);
    displayDailyForecast(forecastData);
    displayAirQuality(airQualityData);
    updateMap(lat, lon);
    updateFavoriteButton();

    loadingSpinner.style.display = "none";
    weatherContent.style.display = "block";
  } catch (error) {
    console.error("Error fetching weather data:", error);
    alert("Error loading weather data. Please try again.");
    loadingSpinner.style.display = "none";
  }
}

// Display Functions
function displayCurrentWeather(data) {
  const unitSymbol = currentUnit === "metric" ? "°C" : "°F";
  const windUnit = currentUnit === "metric" ? "m/s" : "mph";

  document.getElementById("cityName").textContent = data.name;
  document.getElementById("country").textContent = data.sys.country;
  document.getElementById("dateTime").textContent = new Date().toLocaleString(
    "id-ID",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );

  document.getElementById("temperature").textContent = Math.round(
    data.main.temp
  );
  document.querySelector(".unit").textContent = unitSymbol;
  document.getElementById("weatherDescription").textContent =
    data.weather[0].description;
  document.getElementById("feelsLike").textContent =
    Math.round(data.main.feels_like) + unitSymbol;

  const iconCode = data.weather[0].icon;
  document.getElementById(
    "weatherIcon"
  ).src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  document.getElementById("weatherIcon").alt = data.weather[0].description;

  document.getElementById("humidity").textContent = data.main.humidity + "%";
  document.getElementById("windSpeed").textContent =
    data.wind.speed + " " + windUnit;
  document.getElementById("visibility").textContent =
    (data.visibility / 1000).toFixed(1) + " km";
  document.getElementById("pressure").textContent = data.main.pressure + " hPa";

  // UV Index (mock data - requires additional API call for real data)
  document.getElementById("uvIndex").textContent = "3";

  const sunrise = new Date(data.sys.sunrise * 1000);
  const sunset = new Date(data.sys.sunset * 1000);
  document.getElementById("sunrise").textContent = sunrise.toLocaleTimeString(
    "id-ID",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function displayHourlyForecast(data) {
  const container = document.getElementById("hourlyForecast");
  container.innerHTML = "";

  const unitSymbol = currentUnit === "metric" ? "°C" : "°F";

  // Show next 24 hours (8 items, 3-hour intervals)
  for (let i = 0; i < 8; i++) {
    const item = data.list[i];
    const time = new Date(item.dt * 1000);

    const hourlyDiv = document.createElement("div");
    hourlyDiv.className = "hourly-item";
    hourlyDiv.innerHTML = `
      <div class="hourly-time">${time.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      })}</div>
      <img src="https://openweathermap.org/img/wn/${
        item.weather[0].icon
      }.png" alt="${item.weather[0].description}">
      <div class="hourly-temp">${Math.round(item.main.temp)}${unitSymbol}</div>
    `;
    container.appendChild(hourlyDiv);
  }
}

function displayDailyForecast(data) {
  const container = document.getElementById("forecastContainer");
  container.innerHTML = "";

  const unitSymbol = currentUnit === "metric" ? "°C" : "°F";
  const dailyData = {};

  // Group by day
  data.list.forEach((item) => {
    const date = new Date(item.dt * 1000).toLocaleDateString("id-ID");
    if (!dailyData[date]) {
      dailyData[date] = {
        temps: [],
        icon: item.weather[0].icon,
        description: item.weather[0].description,
        date: new Date(item.dt * 1000),
      };
    }
    dailyData[date].temps.push(item.main.temp);
  });

  // Display 5 days
  Object.values(dailyData)
    .slice(0, 5)
    .forEach((day) => {
      const maxTemp = Math.round(Math.max(...day.temps));
      const minTemp = Math.round(Math.min(...day.temps));

      const forecastDiv = document.createElement("div");
      forecastDiv.className = "forecast-item";
      forecastDiv.innerHTML = `
      <div class="forecast-day">
        <div class="day-name">${day.date.toLocaleDateString("id-ID", {
          weekday: "long",
        })}</div>
        <div class="day-date">${day.date.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
        })}</div>
      </div>
      <div class="forecast-weather">
        <img src="https://openweathermap.org/img/wn/${day.icon}.png" alt="${
        day.description
      }">
        <div class="condition">${day.description}</div>
      </div>
      <div class="forecast-temps">
        <span class="temp-high">${maxTemp}${unitSymbol}</span>
        <span class="temp-low">${minTemp}${unitSymbol}</span>
      </div>
    `;
      container.appendChild(forecastDiv);
    });
}


function displayAirQuality(data) {
  const container = document.getElementById("airQualityContainer");

  if (!data.list || data.list.length === 0) {
    container.innerHTML = "<p>Air quality data not available</p>";
    return;
  }

  const aqi = data.list[0].main.aqi;
  const components = data.list[0].components;

  const aqiLabels = ["Good", "Fair", "Moderate", "Poor", "Very Poor"];
  const aqiClasses = [
    "aqi-good",
    "aqi-fair",
    "aqi-moderate",
    "aqi-poor",
    "aqi-very-poor",
  ];

  container.innerHTML = `
    <div class="aqi-main">
      <div class="aqi-value">
        <div class="aqi-number ${aqiClasses[aqi - 1]}">${aqi}</div>
        <div class="aqi-label ${aqiClasses[aqi - 1]}">${
    aqiLabels[aqi - 1]
  }</div>
      </div>
    </div>
    <div class="aqi-details">
      <div class="aqi-item">
        <span>PM2.5</span>
        <span>${components.pm2_5.toFixed(1)} μg/m³</span>
      </div>
      <div class="aqi-item">
        <span>PM10</span>
        <span>${components.pm10.toFixed(1)} μg/m³</span>
      </div>
      <div class="aqi-item">
        <span>CO</span>
        <span>${components.co.toFixed(1)} μg/m³</span>
      </div>
      <div class="aqi-item">
        <span>NO₂</span>
        <span>${components.no2.toFixed(1)} μg/m³</span>
      </div>
      <div class="aqi-item">
        <span>O₃</span>
        <span>${components.o3.toFixed(1)} μg/m³</span>
      </div>
      <div class="aqi-item">
        <span>SO₂</span>
        <span>${components.so2.toFixed(1)} μg/m³</span>
      </div>
    </div>
  `;
}

function updateMap(lat, lon) {
  const mapFrame = document.getElementById("mapFrame");
  mapFrame.src = `https://openweathermap.org/weathermap?basemap=map&cities=true&layer=temperature&lat=${lat}&lon=${lon}&zoom=8`;
}

// Favorites Management
function toggleFavorite() {
  if (!currentCity) return;

  const cityName = document.getElementById("cityName").textContent;
  const country = document.getElementById("country").textContent;
  const temp = document.getElementById("temperature").textContent;
  const icon = document.getElementById("weatherIcon").src;
  const unitSymbol = currentUnit === "metric" ? "°C" : "°F";

  const favoriteData = {
    city: cityName,
    country: country,
    temp: temp + unitSymbol,
    icon: icon,
    timestamp: Date.now(),
  };

  const index = favorites.findIndex((f) => f.city === cityName);

  if (index > -1) {
    favorites.splice(index, 1);
  } else {
    favorites.unshift(favoriteData);
    if (favorites.length > 10) favorites.pop();
  }

  localStorage.setItem("weatherFavorites", JSON.stringify(favorites));
  updateFavoriteButton();
  loadFavorites();
}

function updateFavoriteButton() {
  const cityName = document.getElementById("cityName").textContent;
  const isFavorite = favorites.some((f) => f.city === cityName);

  if (isFavorite) {
    favoriteBtn.classList.add("active");
    favoriteBtn.innerHTML =
      '<i class="fas fa-heart"></i> Remove from Favorites';
  } else {
    favoriteBtn.classList.remove("active");
    favoriteBtn.innerHTML = '<i class="far fa-heart"></i> Add to Favorites';
  }
}

function loadFavorites() {
  const container = document.getElementById("favoritesContainer");
  const noFavorites = document.getElementById("noFavorites");

  if (favorites.length === 0) {
    noFavorites.style.display = "block";
    return;
  }

  noFavorites.style.display = "none";
  container.innerHTML = "";

  favorites.forEach((fav) => {
    const card = document.createElement("div");
    card.className = "favorite-card";
    card.innerHTML = `
      <div class="favorite-header">
        <div class="favorite-location">
          <h4>${fav.city}</h4>
          <p class="favorite-country">${fav.country}</p>
        </div>
        <button class="favorite-remove" aria-label="Remove favorite">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="favorite-weather">
        <div class="favorite-temp">${fav.temp}</div>
        <div class="favorite-icon">
          <img src="${fav.icon}" alt="Weather icon">
        </div>
      </div>
    `;

    card.addEventListener("click", (e) => {
      if (!e.target.closest(".favorite-remove")) {
        fetchWeatherByCity(fav.city);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });

    card.querySelector(".favorite-remove").addEventListener("click", (e) => {
      e.stopPropagation();
      const index = favorites.findIndex((f) => f.city === fav.city);
      favorites.splice(index, 1);
      localStorage.setItem("weatherFavorites", JSON.stringify(favorites));
      loadFavorites();
      updateFavoriteButton();
    });

    container.appendChild(card);
  });
}

// API Configuration
const apiKey = "664843b75302a2643f31ee9c81ced69b"; 

// DOM Elements
const cityInput = document.getElementById("city");
const searchBtn = document.getElementById("search-btn");
const favBtn = document.getElementById("fav-btn");
const unitToggle = document.getElementById("unit-toggle");
const themeToggle = document.getElementById("theme-toggle");

const weatherIcon = document.getElementById("weather-icon");
const tempDiv = document.getElementById("temp-div");
const weatherInfo = document.getElementById("weather-info");
const weatherDetails = document.getElementById("weather-details");
const hourlyForecastDiv = document.getElementById("hourly-forecast");
const dailyForecastDiv = document.getElementById("daily-forecast");
const favoritesList = document.getElementById("favorites");
const loading = document.getElementById("loading");
const errorDiv = document.getElementById("error");
const suggestions = document.getElementById("suggestions");
const hourlyContainer = document.getElementById("hourly-container");
const dailyContainer = document.getElementById("daily-container");
const currentWeather = document.getElementById("current-weather");

// State
let unit = localStorage.getItem("unit") || "metric";
let theme = localStorage.getItem("theme") || "dark";
let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
let recentSearches = JSON.parse(localStorage.getItem("recent")) || [];
let currentCity = "";
let currentCoords = null;
let searchTimeout = null;

// Initialize App
init();

function init() {
  // Set theme
  if (theme === "light") {
    document.body.classList.remove("dark");
  } else {
    document.body.classList.add("dark");
  }
  themeToggle.checked = theme === "light";
  unitToggle.checked = unit === "imperial";

  // Render initial data
  renderFavorites();

  // Event listeners
  searchBtn.addEventListener("click", () => getWeather(cityInput.value));
  favBtn.addEventListener("click", addFavorite);
  unitToggle.addEventListener("change", toggleUnit);
  themeToggle.addEventListener("change", toggleTheme);
  
  cityInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") getWeather(cityInput.value);
  });

  // Autocomplete search suggestions
  cityInput.addEventListener("input", handleCityInput);

  // Close suggestions when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-container")) {
      suggestions.style.display = "none";
    }
  });

  // Get user location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => getWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
      () => { 
        if (recentSearches.length) getWeather(recentSearches[0]); 
      }
    );
  }
}

// Autocomplete handler with API city search
async function handleCityInput() {
  const query = cityInput.value.trim();
  
  if (query.length < 3) {
    suggestions.style.display = "none";
    return;
  }

  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${apiKey}`
      );
      const cities = await response.json();
      
      if (cities.length > 0) {
        suggestions.innerHTML = cities.map(city => {
          const statePart = city.state ? `, ${city.state}` : '';
          return `<div class="suggestion-item" 
                    data-lat="${city.lat}" 
                    data-lon="${city.lon}" 
                    data-name="${city.name}, ${city.country}">
                    ${city.name}${statePart}, ${city.country}
                  </div>`;
        }).join('');
        suggestions.style.display = 'block';
        
        // Add click handlers to suggestions
        document.querySelectorAll('.suggestion-item').forEach(item => {
          item.addEventListener('click', () => {
            const name = item.dataset.name;
            const lat = item.dataset.lat;
            const lon = item.dataset.lon;
            cityInput.value = name;
            suggestions.style.display = 'none';
            currentCity = name;
            getWeatherByCoords(lat, lon);
          });
        });
      } else {
        suggestions.style.display = 'none';
      }
    } catch (err) {
      console.error('Autocomplete error:', err);
    }
  }, 300);
}

// Loading state
function showLoading(show) { 
  loading.classList.toggle("hidden", !show); 
}

// Error display
function showError(msg) { 
  errorDiv.textContent = msg; 
  errorDiv.classList.remove("hidden"); 
  setTimeout(() => errorDiv.classList.add("hidden"), 5000); 
}

// Get weather by city name
function getWeather(city) {
  if (!city) return;
  showLoading(true);
  errorDiv.classList.add("hidden");
  
  const currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=${unit}`;
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=${unit}`;

  Promise.all([fetch(currentUrl), fetch(forecastUrl)])
    .then(responses => Promise.all(responses.map(r => r.json())))
    .then(([current, forecast]) => {
      if (current.cod !== 200) throw new Error(current.message);
      
      currentCity = `${current.name}, ${current.sys.country}`;
      currentCoords = { lat: current.coord.lat, lon: current.coord.lon };
      
      // Fetch air quality data
      return fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${current.coord.lat}&lon=${current.coord.lon}&appid=${apiKey}`
      ).then(airRes => airRes.json())
        .then(airData => {
          displayWeather(current, airData);
          displayHourly(forecast.list);
          displayDaily(forecast.list);
          saveRecent(currentCity);
          
          currentWeather.classList.remove("hidden");
          hourlyContainer.classList.remove("hidden");
          dailyContainer.classList.remove("hidden");
        });
    })
    .catch(err => showError(err.message))
    .finally(() => showLoading(false));
}

// Get weather by coordinates
function getWeatherByCoords(lat, lon) {
  showLoading(true);
  errorDiv.classList.add("hidden");
  
  const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${unit}`;
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${unit}`;
  const airQualityUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;
  
  Promise.all([fetch(currentUrl), fetch(forecastUrl), fetch(airQualityUrl)])
    .then(responses => Promise.all(responses.map(r => r.json())))
    .then(([current, forecast, airData]) => {
      if (!currentCity) {
        currentCity = `${current.name}, ${current.sys.country}`;
      }
      currentCoords = { lat, lon };
      
      displayWeather(current, airData);
      displayHourly(forecast.list);
      displayDaily(forecast.list);
      
      currentWeather.classList.remove("hidden");
      hourlyContainer.classList.remove("hidden");
      dailyContainer.classList.remove("hidden");
    })
    .catch(err => showError(err.message))
    .finally(() => showLoading(false));
}

// Display current weather with all details
function displayWeather(data, airData) {
  const temp = Math.round(data.main.temp);
  const tempUnit = unit === "metric" ? "°C" : "°F";
  const description = data.weather[0].description;
  const iconUrl = `https://openweathermap.org/img/wn/${data.weather[0].icon}@4x.png`;

  tempDiv.textContent = `${temp}${tempUnit}`;
  weatherInfo.innerHTML = `
    <div style="font-size: 1.5em; font-weight: 600; margin-bottom: 10px;">
      ${description.charAt(0).toUpperCase() + description.slice(1)}
    </div>
    <div>${data.name}, ${data.sys.country}</div>
  `;
  weatherIcon.src = iconUrl;
  weatherIcon.style.display = "block";

  // Calculate sunrise/sunset times
  const sunrise = new Date(data.sys.sunrise * 1000).toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  const sunset = new Date(data.sys.sunset * 1000).toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  // Get AQI data
  const aqi = airData.list[0].main.aqi;
  const aqiLabels = ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];
  const aqiClasses = ['aqi-good', 'aqi-good', 'aqi-moderate', 'aqi-unhealthy', 'aqi-very-unhealthy'];
  const aqiText = aqiLabels[aqi - 1];
  const aqiClass = aqiClasses[aqi - 1];

  // Calculate UV Index (approximation based on cloud coverage and time)
  const hour = new Date().getHours();
  const cloudCover = data.clouds.all;
  let uvIndex = 0;
  
  // UV is highest between 10 AM and 4 PM
  if (hour >= 10 && hour <= 16) {
    if (cloudCover < 30) uvIndex = 8;
    else if (cloudCover < 60) uvIndex = 5;
    else uvIndex = 3;
  } else if (hour >= 8 && hour <= 18) {
    if (cloudCover < 30) uvIndex = 5;
    else if (cloudCover < 60) uvIndex = 3;
    else uvIndex = 2;
  } else {
    uvIndex = 0;
  }

  const uvCategory = uvIndex < 3 ? 'Low' : uvIndex < 6 ? 'Moderate' : uvIndex < 8 ? 'High' : 'Very High';

  // Weather details with 4 new features
  weatherDetails.innerHTML = `
    <div class="detail-card">
      <div class="label">Feels Like</div>
      <div class="value">${Math.round(data.main.feels_like)}${tempUnit}</div>
    </div>
    <div class="detail-card">
      <div class="label">High / Low</div>
      <div class="value">
        <span class="temp-high">${Math.round(data.main.temp_max)}°</span> / 
        <span class="temp-low">${Math.round(data.main.temp_min)}°</span>
      </div>
    </div>
    <div class="detail-card">
      <div class="label">Humidity</div>
      <div class="value">${data.main.humidity}%</div>
    </div>
    <div class="detail-card">
      <div class="label">Wind Speed</div>
      <div class="value">${data.wind.speed} ${unit === "metric" ? "m/s" : "mph"}</div>
    </div>
    <div class="detail-card">
      <div class="label">Air Quality Index</div>
      <div class="value ${aqiClass}">AQI ${aqi}<br>${aqiText}</div>
    </div>
    <div class="detail-card">
      <div class="label">UV Index</div>
      <div class="value">${uvIndex}<br><span style="font-size: 0.9em;">${uvCategory}</span></div>
    </div>
    <div class="detail-card">
      <div class="label">☀️ Sunrise</div>
      <div class="value">${sunrise}</div>
    </div>
    <div class="detail-card">
      <div class="label">🌙 Sunset</div>
      <div class="value">${sunset}</div>
    </div>
  `;
}

// Display hourly forecast
function displayHourly(list) {
  hourlyForecastDiv.innerHTML = "";
  const tempUnit = unit === "metric" ? "°C" : "°F";
  
  list.slice(0, 8).forEach(item => {
    const dt = new Date(item.dt * 1000);
    const time = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const temp = Math.round(item.main.temp);
    const icon = `https://openweathermap.org/img/wn/${item.weather[0].icon}.png`;
    
    const el = document.createElement("div");
    el.className = "hourly-item";
    el.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 5px;">${time}</div>
      <img src="${icon}" alt="${item.weather[0].description}">
      <div style="font-size: 1.1em; font-weight: bold; margin-top: 5px;">${temp}${tempUnit}</div>
      <div style="font-size: 0.85em; opacity: 0.8;">${item.weather[0].main}</div>
    `;
    hourlyForecastDiv.appendChild(el);
  });
}

// Display daily forecast with high/low temperatures
function displayDaily(list) {
  dailyForecastDiv.innerHTML = "";
  const tempUnit = unit === "metric" ? "°C" : "°F";
  const days = {};
  
  // Group by day and collect all temps
  list.forEach(item => {
    const date = new Date(item.dt * 1000).toLocaleDateString();
    if (!days[date]) {
      days[date] = {
        temps: [],
        icon: item.weather[0].icon,
        description: item.weather[0].main,
        date: new Date(item.dt * 1000)
      };
    }
    days[date].temps.push(item.main.temp);
  });

  // Display first 5 days
  Object.values(days).slice(0, 5).forEach(day => {
    const dayName = day.date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
    const high = Math.round(Math.max(...day.temps));
    const low = Math.round(Math.min(...day.temps));
    const icon = `https://openweathermap.org/img/wn/${day.icon}.png`;
    
    const el = document.createElement("div");
    el.className = "daily-item";
    el.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 5px;">${dayName}</div>
      <img src="${icon}" alt="${day.description}">
      <div style="font-size: 0.9em; margin: 5px 0;">${day.description}</div>
      <div class="temp-range">
        <span class="temp-high">↑${high}${tempUnit}</span>
        <span class="temp-low">↓${low}${tempUnit}</span>
      </div>
    `;
    dailyForecastDiv.appendChild(el);
  });
}

// Add to favorites
function addFavorite() {
  if (!currentCity) {
    showError("Search for a city first");
    return;
  }

  // Check if already in favorites
  const exists = favorites.some(fav => fav.name === currentCity);
  if (!exists) {
    favorites.push({ 
      name: currentCity, 
      coords: currentCoords 
    });
    localStorage.setItem("favorites", JSON.stringify(favorites));
    renderFavorites();
  } else {
    showError("City already in favorites");
  }
}

// Render favorites list
function renderFavorites() {
  favoritesList.innerHTML = "";
  favorites.forEach((fav, index) => {
    const li = document.createElement("li");

    const citySpan = document.createElement("span");
    citySpan.textContent = fav.name;
    citySpan.style.cursor = "pointer";
    citySpan.style.flex = "1";
    citySpan.addEventListener("click", () => {
      if (fav.coords) {
        currentCity = fav.name;
        getWeatherByCoords(fav.coords.lat, fav.coords.lon);
      } else {
        getWeather(fav.name);
      }
    });

    const deleteBtn = document.createElement("span");
    deleteBtn.textContent = "×";
    deleteBtn.className = "remove-fav";
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      favorites.splice(index, 1);
      localStorage.setItem("favorites", JSON.stringify(favorites));
      renderFavorites();
    });

    li.appendChild(citySpan);
    li.appendChild(deleteBtn);
    favoritesList.appendChild(li);
  });
}

// Save recent search
function saveRecent(city) {
  if (!recentSearches.includes(city)) {
    recentSearches.unshift(city);
    if (recentSearches.length > 5) recentSearches.pop();
    localStorage.setItem("recent", JSON.stringify(recentSearches));
  }
}

// Toggle temperature unit
function toggleUnit() {
  unit = unitToggle.checked ? "imperial" : "metric";
  localStorage.setItem("unit", unit);
  if (currentCoords) {
    getWeatherByCoords(currentCoords.lat, currentCoords.lon);
  }
}

// Toggle theme
function toggleTheme() {
  theme = themeToggle.checked ? "light" : "dark";
  localStorage.setItem("theme", theme);
  
  if (theme === "dark") {
    document.body.classList.add("dark");
  } else {
    document.body.classList.remove("dark");
  }
}

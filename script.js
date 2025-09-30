document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  const locationBtn = document.getElementById('location-btn');
  const refreshBtn = document.getElementById('refresh-btn');
  const weatherDisplay = document.getElementById('weather-display');
  const loading = document.getElementById('loading');
  const errorMessage = document.getElementById('error-message');
  const celsiusBtn = document.getElementById('celsius-btn');
  const fahrenheitBtn = document.getElementById('fahrenheit-btn');

  const locationEl = document.getElementById('location').querySelector('span');
  const dateTimeEl = document.getElementById('date-time');
  const weatherIcon = document.getElementById('weather-icon');
  const temperatureEl = document.getElementById('temperature').querySelector('.temp-value');
  const weatherDesc = document.getElementById('weather-description');
  const feelsLikeEl = document.getElementById('feels-like');
  const humidityEl = document.getElementById('humidity');
  const windSpeedEl = document.getElementById('wind-speed');
  const uvIndexEl = document.getElementById('uv-index');
  const forecastItems = document.getElementById('forecast-items');
  const lastUpdatedEl = document.getElementById('last-updated');

  // State
  let currentUnit = 'celsius';
  let lastSearchedCity = '';
  let currentWeatherData = null;
  let refreshInterval;
  let timeUpdateInterval;

  // Dark mode toggle
  const toggleBtn = document.getElementById("darkModeToggle");
  const body = document.body;
  if (localStorage.getItem("theme") === "dark") {
    body.classList.add("dark-mode");
    toggleBtn.textContent = "☀️";
  }
  toggleBtn.addEventListener("click", () => {
    body.classList.toggle("dark-mode");
    if (body.classList.contains("dark-mode")) {
      toggleBtn.innerHTML = "<i class='bx bx-sun'></i>";
} else {
  toggleBtn.innerHTML = "<i class='bx bx-moon'></i>";
}
  });

  // === FAVORITES FEATURE ===
  const favoriteBtn = document.getElementById("favorite-btn");
  const favoriteIcon = document.getElementById("favorite-icon");
  const favoritesList = document.getElementById("favorites-list");
  let favorites = JSON.parse(localStorage.getItem("favorites")) || [];

  function renderFavorites() {
    favoritesList.innerHTML = "";
    if (favorites.length === 0) {
      favoritesList.innerHTML = "<li>No favorites yet</li>";
      return;
    }
    favorites.forEach(city => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span class="fav-city">${city}</span>
        <button class="remove-fav" data-city="${city}">
          <i class='bx bx-x'></i>
        </button>
      `;

      // klik nama → tampilkan cuaca
      li.querySelector(".fav-city").addEventListener("click", () => {
        getWeatherByCity(city);
      });

      // klik X → hapus
      li.querySelector(".remove-fav").addEventListener("click", (e) => {
        e.stopPropagation();
        removeFavorite(city);
      });

      favoritesList.appendChild(li);
    });
  }

  function addFavorite(city) {
    if (!favorites.includes(city)) {
      favorites.push(city);
      localStorage.setItem("favorites", JSON.stringify(favorites));
      renderFavorites();
      updateFavoriteBtn(city);
    }
  }

  function removeFavorite(city) {
    favorites = favorites.filter(c => c !== city);
    localStorage.setItem("favorites", JSON.stringify(favorites));
    renderFavorites();
    updateFavoriteBtn(city);
  }

  function updateFavoriteBtn(city) {
    if (favorites.includes(city)) {
      favoriteBtn.classList.add("active");
      favoriteIcon.classList.remove("bx-star");
      favoriteIcon.classList.add("bxs-star");
    } else {
      favoriteBtn.classList.remove("active");
      favoriteIcon.classList.remove("bxs-star");
      favoriteIcon.classList.add("bx-star");
    }
  }

  favoriteBtn.addEventListener("click", () => {
    if (!lastSearchedCity) return;
    if (favorites.includes(lastSearchedCity)) {
      removeFavorite(lastSearchedCity);
    } else {
      addFavorite(lastSearchedCity);
    }
  });

  renderFavorites();

  // === AUTOCOMPLETE FEATURE ===
  const suggestionsEl = document.getElementById("suggestions");
  let debounceTimer;

  async function fetchSuggestions(query) {
    const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=10274462b267d8ec56682dfcd77bd96b`;
    try {
      const res = await fetch(url);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  }

  function showSuggestions(list) {
    suggestionsEl.innerHTML = "";
    if (!list.length) {
      suggestionsEl.style.display = "none";
      return;
    }
    list.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = `${item.name}, ${item.country}`;
      li.addEventListener("click", () => {
        searchInput.value = item.name;
        suggestionsEl.innerHTML = "";
        suggestionsEl.style.display = "none";
        getWeatherByCity(item.name);
      });
      suggestionsEl.appendChild(li);
    });
    suggestionsEl.style.display = "block";
  }

  searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    const query = searchInput.value.trim();
    if (!query) {
      suggestionsEl.innerHTML = "";
      suggestionsEl.style.display = "none";
      return;
    }
    debounceTimer = setTimeout(async () => {
      const results = await fetchSuggestions(query);
      showSuggestions(results);
    }, 300);
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-container")) {
      suggestionsEl.innerHTML = "";
      suggestionsEl.style.display = "none";
    }
  });

  // === CORE APP ===
  initApp();

  searchBtn.addEventListener('click', searchWeather);
  searchInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') searchWeather();
  });
  locationBtn.addEventListener('click', getLocationWeather);
  refreshBtn.addEventListener('click', refreshWeather);

  celsiusBtn.addEventListener('click', function() {
    if (currentUnit !== 'celsius') toggleUnits('celsius');
  });
  fahrenheitBtn.addEventListener('click', function() {
    if (currentUnit !== 'fahrenheit') toggleUnits('fahrenheit');
  });

  function initApp() {
    updateTime();
    timeUpdateInterval = setInterval(updateTime, 1000);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => getWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
        () => getWeatherByCity('London')
      );
    } else {
      getWeatherByCity('London');
    }
  }

  function updateTime() {
    const now = new Date();
    dateTimeEl.textContent = now.toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }

  function searchWeather() {
    const city = searchInput.value.trim();
    if (city) getWeatherByCity(city);
  }

  function getLocationWeather() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => getWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
        () => showError("Please enable location access to use this feature")
      );
    } else {
      showError("Geolocation not supported");
    }
  }

  function refreshWeather() {
    if (lastSearchedCity) {
      getWeatherByCity(lastSearchedCity);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => getWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
        () => showError("Could not refresh weather data")
      );
    }
  }

  function startAutoRefresh() {
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(refreshWeather, 900000); // 15 menit
  }

  async function getWeatherByCity(city) {
    showLoading();
    lastSearchedCity = city;
    try {
      const currentResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=10274462b267d8ec56682dfcd77bd96b`
      );
      if (!currentResponse.ok) throw new Error('City not found');
      const currentData = await currentResponse.json();

      const forecastResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=10274462b267d8ec56682dfcd77bd96b`
      );
      const forecastData = await forecastResponse.json();

      currentWeatherData = { current: currentData, forecast: forecastData };
      updateWeatherDisplay(currentWeatherData);
      hideError();
      lastUpdatedEl.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
      startAutoRefresh();
    } catch (err) {
      showError(err.message || "Failed to fetch weather data");
    } finally {
      hideLoading();
    }
  }

  async function getWeatherByCoords(lat, lon) {
    showLoading();
    try {
      const currentResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=10274462b267d8ec56682dfcd77bd96b`
      );
      const currentData = await currentResponse.json();

      const forecastResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=10274462b267d8ec56682dfcd77bd96b`
      );
      const forecastData = await forecastResponse.json();

      currentWeatherData = { current: currentData, forecast: forecastData };
      lastSearchedCity = currentData.name;
      updateWeatherDisplay(currentWeatherData);
      hideError();
      lastUpdatedEl.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
      startAutoRefresh();
    } catch {
      showError("Failed to fetch weather data");
    } finally {
      hideLoading();
    }
  }

  function updateWeatherDisplay(data) {
    const current = data.current;
    const forecast = data.forecast;

    locationEl.textContent = `${current.name}, ${current.sys.country}`;
    weatherIcon.src = `https://openweathermap.org/img/wn/${current.weather[0].icon}@2x.png`;
    weatherIcon.alt = current.weather[0].description;

    updateTemperature(current.main.temp);
    weatherDesc.textContent = current.weather[0].description;

    if (currentUnit === 'celsius') {
      feelsLikeEl.textContent = `${Math.round(current.main.feels_like)}°C`;
    } else {
      feelsLikeEl.textContent = `${Math.round((current.main.feels_like * 9/5) + 32)}°F`;
    }

    humidityEl.textContent = `${current.main.humidity}%`;
    windSpeedEl.textContent = `${Math.round(current.wind.speed * 3.6)} km/h`;
    uvIndexEl.textContent = Math.min(Math.floor(current.main.temp / 5), 10);

    updateForecast(forecast);
    weatherDisplay.style.display = 'flex';

    // update favorit button sesuai kota ini
    updateFavoriteBtn(current.name);
  }

  function updateForecast(forecastData) {
    forecastItems.innerHTML = '';
    const dailyForecasts = {};
    forecastData.list.forEach(item => {
      const date = new Date(item.dt * 1000);
      const dayKey = date.toLocaleDateString('en-US', { weekday: 'long', month: 'numeric', day: 'numeric' });
      if (!dailyForecasts[dayKey]) dailyForecasts[dayKey] = { date, items: [] };
      dailyForecasts[dayKey].items.push(item);
    });

    const days = Object.keys(dailyForecasts).slice(0, 6);
    days.forEach(dayKey => {
      const dayData = dailyForecasts[dayKey];
      const date = dayData.date;
      const dayItems = dayData.items;

      let midday = dayItems.find(i => {
        const h = new Date(i.dt * 1000).getHours();
        return h >= 11 && h <= 14;
      }) || dayItems[Math.floor(dayItems.length / 2)];

      const el = document.createElement('div');
      el.className = 'forecast-item';
      el.innerHTML = `
        <div class="forecast-day">${date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
        <div class="forecast-date">${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
        <img src="https://openweathermap.org/img/wn/${midday.weather[0].icon}.png" alt="${midday.weather[0].description}">
        <div class="forecast-temp">${Math.round(midday.main.temp)}°</div>
        <div class="forecast-desc">${midday.weather[0].description}</div>
      `;
      forecastItems.appendChild(el);
    });
  }

  function toggleUnits(unit) {
    currentUnit = unit;
    if (unit === 'celsius') {
      celsiusBtn.classList.add('active');
      fahrenheitBtn.classList.remove('active');
    } else {
      celsiusBtn.classList.remove('active');
      fahrenheitBtn.classList.add('active');
    }
    if (currentWeatherData) {
      const temp = currentWeatherData.current.main.temp;
      const feelsLike = currentWeatherData.current.main.feels_like;
      if (unit === 'celsius') {
        temperatureEl.textContent = Math.round(temp);
        feelsLikeEl.textContent = `${Math.round(feelsLike)}°C`;
        document.querySelectorAll('.forecast-temp').forEach(el => {
          const v = parseInt(el.textContent);
          el.textContent = `${Math.round((v - 32) * 5/9)}°`;
        });
      } else {
        temperatureEl.textContent = Math.round((temp * 9/5) + 32);
        feelsLikeEl.textContent = `${Math.round((feelsLike * 9/5) + 32)}°F`;
        document.querySelectorAll('.forecast-temp').forEach(el => {
          const v = parseInt(el.textContent);
          el.textContent = `${Math.round((v * 9/5) + 32)}°`;
        });
      }
      document.querySelector('.temp-unit').textContent = unit === 'celsius' ? 'C' : 'F';
    }
  }

  function updateTemperature(temp) {
    temperatureEl.textContent = currentUnit === 'celsius'
      ? Math.round(temp)
      : Math.round((temp * 9/5) + 32);
  }

  function showLoading() {
    loading.style.display = 'flex';
    weatherDisplay.style.display = 'none';
  }
  function hideLoading() {
    loading.style.display = 'none';
  }
  function showError(msg) {
    errorMessage.textContent = msg;
    errorMessage.style.display = 'block';
    weatherDisplay.style.display = 'none';
  }
  function hideError() {
    errorMessage.style.display = 'none';
  }
});

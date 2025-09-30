const apiKey = "45095b77a84f1de4f699e5777626e6b9"; // OpenWeatherMap
let isCelsius = true;

// ================== Elements ==================
const cityName = document.getElementById("cityName");
const country = document.getElementById("country");
const temperature = document.getElementById("temperature");
const condition = document.getElementById("condition");
const feelsLike = document.getElementById("feelsLike");
const humidity = document.getElementById("humidity");
const wind = document.getElementById("wind");
const weatherIcon = document.getElementById("weatherIcon");
const dateTime = document.getElementById("dateTime");
const forecastContainer = document.getElementById("forecastContainer");
const loading = document.getElementById("loading");
const errorDiv = document.getElementById("error");
const cityInput = document.getElementById("cityInput");
const suggestionsBox = document.getElementById("suggestions");

// ================== UI Buttons ==================
document.getElementById("searchBtn").addEventListener("click", () => {
  const city = cityInput.value.trim();
  if (city) {
    getWeather(city);
    saveRecentSearch(city);
    suggestionsBox.style.display = "none";
  }
});

document.getElementById("themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("light");
  localStorage.setItem(
    "theme",
    document.body.classList.contains("light") ? "light" : "dark"
  );
});

document.getElementById("unitToggle").addEventListener("click", () => {
  isCelsius = !isCelsius;
  localStorage.setItem("unit", isCelsius ? "metric" : "imperial");
  const lastCity = localStorage.getItem("lastCity") || "Jakarta";
  getWeather(lastCity);
});

document.getElementById("saveFavorite").addEventListener("click", () => {
  const city = cityName.textContent;
  if (city && city !== "--") toggleFavorite(city);
});

// ================== Autocomplete Suggestions ==================
cityInput.addEventListener("input", async () => {
  const query = cityInput.value.trim();
  if (query.length < 2) {
    suggestionsBox.style.display = "none";
    return;
  }

  try {
    const res = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${apiKey}`
    );
    const data = await res.json();
    suggestionsBox.innerHTML = "";

    if (data.length === 0) {
      suggestionsBox.style.display = "none";
      return;
    }

    data.forEach(loc => {
      const li = document.createElement("li");
      li.textContent = `${loc.name}, ${loc.country}`;
      li.addEventListener("click", () => {
        cityInput.value = loc.name;
        getWeather(loc.name);
        saveRecentSearch(loc.name);
        suggestionsBox.style.display = "none";
      });
      suggestionsBox.appendChild(li);
    });

    suggestionsBox.style.display = "block";
  } catch {
    suggestionsBox.style.display = "none";
  }
});

// Tutup dropdown kalau klik luar
document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-bar")) {
    suggestionsBox.style.display = "none";
  }
});

// ================== Init (Geolocation & Theme) ==================
window.onload = () => {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "light") document.body.classList.add("light");

  isCelsius = localStorage.getItem("unit") !== "imperial";

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => getWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
      () => getWeather("Jakarta")
    );
  } else {
    getWeather("Jakarta");
  }
};

// ================== API Calls ==================
async function getWeather(city) {
  showLoading();
  try {
    const unit = isCelsius ? "metric" : "imperial";
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=${unit}`
    );
    const data = await res.json();
    if (data.cod !== 200) throw new Error(data.message);

    updateCurrentWeather(data);
    getForecast(city);
    localStorage.setItem("lastCity", city);
    hideLoading();
  } catch {
    showError("City not found!");
  }
}

async function getWeatherByCoords(lat, lon) {
  showLoading();
  try {
    const unit = isCelsius ? "metric" : "imperial";
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${unit}`
    );
    const data = await res.json();

    updateCurrentWeather(data);
    getForecast(data.name);
    localStorage.setItem("lastCity", data.name);
    hideLoading();
  } catch {
    showError("Unable to fetch location weather.");
  }
}

async function getForecast(city) {
  const unit = isCelsius ? "metric" : "imperial";
  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=${unit}`
  );
  const data = await res.json();
  forecastContainer.innerHTML = "";

  // ========== DAILY FORECAST ==========
  const dailyData = {};
  data.list.forEach(item => {
    const date = item.dt_txt.split(" ")[0];
    if (!dailyData[date]) dailyData[date] = [];
    dailyData[date].push(item);
  });

  Object.keys(dailyData).slice(0, 5).forEach(date => {
    const temps = dailyData[date].map(d => d.main.temp);
    const min = Math.round(Math.min(...temps));
    const max = Math.round(Math.max(...temps));
    const cond = dailyData[date][0].weather[0].description;
    const icon = dailyData[date][0].weather[0].icon;

    const card = document.createElement("div");
    card.className = "forecast-card";
    card.innerHTML = `
      <h3>${new Date(date).toLocaleDateString("en-US", { weekday: "long" })}</h3>
      <img src="https://openweathermap.org/img/wn/${icon}.png" alt="${cond}">
      <p>${min}° / ${max}°</p>
      <p>${cond}</p>
    `;
    forecastContainer.appendChild(card);
  });

  // ========== HOURLY FORECAST ==========
  const hourlyContainer = document.getElementById("hourlyContainer");
  hourlyContainer.innerHTML = "";

  data.list.slice(0, 6).forEach(item => {
    const time = new Date(item.dt_txt).toLocaleTimeString("en-US", {
      hour: "numeric",
      hour12: true
    });
    const temp = Math.round(item.main.temp);
    const cond = item.weather[0].description;
    const icon = item.weather[0].icon;

    const card = document.createElement("div");
    card.className = "hourly-card";
    card.innerHTML = `
      <p>${time}</p>
      <img src="https://openweathermap.org/img/wn/${icon}.png" alt="${cond}">
      <p>${temp}°</p>
    `;
    hourlyContainer.appendChild(card);
  });
}

// ================== UI Updates ==================
function updateCurrentWeather(data) {
  cityName.textContent = data.name;
  country.textContent = data.sys.country;
  temperature.textContent = `${Math.round(data.main.temp)}°${isCelsius ? "C" : "F"}`;
  condition.textContent = data.weather[0].description;
  feelsLike.textContent = `${Math.round(data.main.feels_like)}°`;
  humidity.textContent = `${data.main.humidity}%`;
  wind.textContent = `${data.wind.speed} ${isCelsius ? "km/h" : "mph"}`;
  weatherIcon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
  dateTime.textContent = new Date().toLocaleString();

  // cek status favorite
  const favorites = JSON.parse(localStorage.getItem("favorites")) || [];
  const favBtn = document.getElementById("saveFavorite");
  if (favorites.includes(data.name)) {
    favBtn.classList.add("saved");
    favBtn.textContent = "❌ Remove";
  } else {
    favBtn.classList.remove("saved");
    favBtn.textContent = "⭐ Save";
  }
}

function showLoading() {
  loading.style.display = "block";
  errorDiv.style.display = "none";
}

function hideLoading() {
  loading.style.display = "none";
}

function showError(msg) {
  hideLoading();
  errorDiv.textContent = msg;
  errorDiv.style.display = "block";
}

// ================== Recent Searches ==================
function saveRecentSearch(city) {
  let searches = JSON.parse(localStorage.getItem("recentSearches")) || [];
  if (!searches.includes(city)) {
    searches.unshift(city);
    if (searches.length > 5) searches.pop();
    localStorage.setItem("recentSearches", JSON.stringify(searches));
  }
  renderRecentSearches();
}

function renderRecentSearches() {
  const list = document.getElementById("recentSearches");
  const searches = JSON.parse(localStorage.getItem("recentSearches")) || [];
  list.innerHTML = "";
  searches.forEach(city => {
    const li = document.createElement("li");
    li.textContent = city;
    li.addEventListener("click", () => getWeather(city));
    list.appendChild(li);
  });
}

// ================== Favorites ==================
function toggleFavorite(city) {
  let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
  const favBtn = document.getElementById("saveFavorite");

  if (favorites.includes(city)) {
    favorites = favorites.filter(c => c !== city);
    favBtn.classList.remove("saved");
    favBtn.textContent = "⭐ Save";
  } else {
    favorites.push(city);
    favBtn.classList.add("saved");
    favBtn.textContent = "❌ Remove";
  }

  localStorage.setItem("favorites", JSON.stringify(favorites));
  renderFavorites();
}

function renderFavorites() {
  const list = document.getElementById("favoritesList");
  const favorites = JSON.parse(localStorage.getItem("favorites")) || [];
  list.innerHTML = "";
  favorites.forEach(city => {
    const li = document.createElement("li");
    li.textContent = city;
    li.addEventListener("click", () => getWeather(city));
    list.appendChild(li);
  });

  // update tombol sesuai status
  const currentCity = cityName.textContent;
  const favBtn = document.getElementById("saveFavorite");
  if (favorites.includes(currentCity)) {
    favBtn.classList.add("saved");
    favBtn.textContent = "❌ Remove";
  } else {
    favBtn.classList.remove("saved");
    favBtn.textContent = "⭐ Save";
  }
}

// ================== Init render ==================
renderRecentSearches();
renderFavorites();
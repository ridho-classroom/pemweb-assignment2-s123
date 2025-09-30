// script.js

// ================== CONFIG ==================
const API_KEY = "f0a94c5c4345ae825343263fbfdf6470"; // Ganti dengan API key kamu
const BASE_URL = "https://api.openweathermap.org/data/2.5/";

let isCelsius = true;

// ================== ELEMENTS ==================
const searchInput = document.getElementById("city-input");
const searchButton = document.getElementById("search-button");
const switchCFBtn = document.getElementById("switch-cf");
const themeToggleBtn = document.getElementById("theme-toggle");

const loadingEl = document.getElementById("loading");
const errorEl = document.getElementById("error-message");

const tempEl = document.getElementById("temperature");
const conditionEl = document.getElementById("condition");
const humidityEl = document.getElementById("humidity-value");
const windEl = document.getElementById("wind-value");
const feelsLikeEl = document.getElementById("feelslike-value");

const locationPlaceEl = document.getElementById("location-place");
const locationDateEl = document.getElementById("location-date");
const weatherIconContainer = document.getElementById("weather-icon-container");

const currentLocationNameEl = document.getElementById("current-location-name");
const saveLocationBtn = document.getElementById("save-location-btn");
const savedLocationListEl = document.getElementById("saved-location-list");

const hourlyForecastEl = document.getElementById("hourly-forecast");
const fiveDaysForecastEl = document.querySelector(".five-days-card");

const recentSearchesEl = document.getElementById("recent-searches");

// ================== HELPERS ==================
function showLoading(show) {
    loadingEl.style.display = show ? "flex" : "none";
}
function showError(show, message = "") {
    errorEl.style.display = show ? "flex" : "none";
    if (message) errorEl.textContent = message;
}
function formatDate(timestamp, withTime = false) {
    const d = new Date(timestamp * 1000);
    const options = withTime
        ? { weekday: "short", hour: "2-digit", minute: "2-digit" }
        : { weekday: "long", day: "numeric", month: "long", year: "numeric" };
    return d.toLocaleDateString(undefined, options);
}
function convertTemp(tempK) {
    return isCelsius ? Math.round(tempK - 273.15) : Math.round((tempK - 273.15) * 9 / 5 + 32);
}
function unitSymbol() {
    return isCelsius ? "°C" : "°F";
}

// ================== API CALLS ==================
async function fetchWeather(city) {
    showLoading(true);
    showError(false);

    try {
        const [weatherRes, forecastRes] = await Promise.all([
            fetch(`${BASE_URL}weather?q=${city}&appid=${API_KEY}`),
            fetch(`${BASE_URL}forecast?q=${city}&appid=${API_KEY}`)
        ]);

        if (!weatherRes.ok || !forecastRes.ok) throw new Error("City not found");

        const weatherData = await weatherRes.json();
        const forecastData = await forecastRes.json();

        updateCurrentWeather(weatherData);
        updateHourlyForecast(forecastData);
        updateFiveDaysForecast(forecastData);

        addRecentSearch(city);
        showLoading(false);

    } catch (err) {
        console.error(err);
        showLoading(false);
        showError(true, "Failed to fetch weather data.");
    }
}

// ================== ICON MAPPING ==================
function getWeatherIconClass(condition) {
    const map = {
        Clear: "bi bi-brightness-high",       // cerah
        Clouds: "bi bi-clouds",               // berawan
        Rain: "bi bi-cloud-rain",             // hujan
        Drizzle: "bi bi-cloud-drizzle",       // gerimis
        Thunderstorm: "bi bi-cloud-lightning",// badai
        Snow: "bi bi-snow",                   // salju
        Mist: "bi bi-cloud-fog",              // kabut
        Smoke: "bi bi-cloud-haze2",           // asap
        Haze: "bi bi-cloud-haze",             // haze
        Fog: "bi bi-cloud-fog2",              // fog
        Dust: "bi bi-cloud-haze2",            // debu
        Sand: "bi bi-cloud-haze2",            // pasir
        Ash: "bi bi-cloud-haze2",             // abu
        Squall: "bi bi-wind",                 // angin kencang
        Tornado: "bi bi-tornado"              // tornado
    };
    return map[condition] || "bi bi-question-circle"; // default icon
}

// ================== UPDATE UI ==================
function updateCurrentWeather(data) {
    // Update teks
    tempEl.textContent = `${convertTemp(data.main.temp)}${unitSymbol()}`;
    conditionEl.textContent = data.weather[0].description;
    humidityEl.textContent = `${data.main.humidity}%`;
    windEl.textContent = `${data.wind.speed} m/s`;
    feelsLikeEl.textContent = `${convertTemp(data.main.feels_like)}${unitSymbol()}`;

    locationPlaceEl.textContent = `${data.name}, ${data.sys.country}`;
    locationDateEl.textContent = new Date().toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric"
    });

    currentLocationNameEl.textContent = `${data.name}, ${data.sys.country}`;

    // Update icon
    weatherIconContainer.innerHTML = ""; // clear dulu
    const iconClass = getWeatherIconClass(data.weather[0].main);
    const iconEl = document.createElement("i");
    iconEl.className = iconClass;
    iconEl.style.fontSize = "6rem";
    weatherIconContainer.appendChild(iconEl);
}

function updateHourlyForecast(data) {
    hourlyForecastEl.innerHTML = "";

    const nextHours = data.list.slice(0, 16);

    nextHours.forEach(item => {
        const div = document.createElement("div");
        div.className = "hourly-item";
        div.setAttribute("role", "group");
        div.setAttribute("aria-label", `Weather forecast at ${formatDate(item.dt, true)}`);

        div.innerHTML = `
  <i class="${getWeatherIconClass(item.weather[0].main)}"></i>
  <span class="time">${new Date(item.dt * 1000).getHours()}:00</span>
  <span class="temp">${convertTemp(item.main.temp)}${unitSymbol()}</span>
`;
        hourlyForecastEl.appendChild(div);
    });
}

function updateFiveDaysForecast(data) {
    fiveDaysForecastEl.innerHTML = "";
    const dailyMap = {};

    data.list.forEach(item => {
        const date = new Date(item.dt * 1000).toLocaleDateString();
        if (!dailyMap[date]) {
            dailyMap[date] = item;
        }
    });

    Object.values(dailyMap).slice(0, 5).forEach(item => {
        const div = document.createElement("div");
        div.className = "day-card";
        div.setAttribute("role", "group");
        div.setAttribute("aria-label", `Forecast for ${formatDate(item.dt)}`);

        div.innerHTML = `
  <p>${formatDayOnly(item.dt)}</p>
  <i class="${getWeatherIconClass(item.weather[0].main)}"></i>
  <p>${item.weather[0].main}</p>
  <span>${convertTemp(item.main.temp_min)}${unitSymbol()} / ${convertTemp(item.main.temp_max)}${unitSymbol()}</span>
`;
        fiveDaysForecastEl.appendChild(div);
    });
}

function formatDayOnly(timestamp) {
    const d = new Date(timestamp * 1000);
    return d.toLocaleDateString(undefined, { weekday: "long" });
}

// ================== LOCAL STORAGE ==================
function saveLocation(city) {
    let saved = JSON.parse(localStorage.getItem("savedLocations")) || [];
    if (!saved.includes(city)) {
        saved.push(city);
        localStorage.setItem("savedLocations", JSON.stringify(saved));
    }
    renderSavedLocations();
}

function renderSavedLocations() {
    let saved = JSON.parse(localStorage.getItem("savedLocations")) || [];
    savedLocationListEl.innerHTML = "";

    if (saved.length === 0) {
        savedLocationListEl.innerHTML = `<li class="placeholder">No saved locations yet</li>`;
        return;
    }

    saved.forEach(city => {
        const li = document.createElement("li");
        li.setAttribute("data-city", city);
        li.setAttribute("role", "listitem");

        // Bagian teks lokasi (klik = fetch cuaca)
        const span = document.createElement("span");
        span.className = "city-name";
        span.textContent = city;
        span.style.cursor = "pointer";
        span.addEventListener("click", () => fetchWeather(city));

        // Tombol delete
        const delBtn = document.createElement("button");
        delBtn.innerHTML = "&times;"; // tanda X
        delBtn.className = "delete-btn";
        delBtn.addEventListener("click", (e) => {
            e.stopPropagation(); // jangan trigger fetchWeather
            removeSavedLocation(city);
        });

        // Masukkan ke li
        li.innerHTML = `<i class="bi bi-geo-alt"></i>`;
        li.appendChild(span);
        li.appendChild(delBtn);

        savedLocationListEl.appendChild(li);
    });
}

function removeSavedLocation(city) {
    let saved = JSON.parse(localStorage.getItem("savedLocations")) || [];
    saved = saved.filter(c => c !== city);  // hapus city dari list
    localStorage.setItem("savedLocations", JSON.stringify(saved));
    renderSavedLocations();  // refresh tampilan
}

// ================== RECENT SEARCHES ==================
function addRecentSearch(city) {
    let searches = JSON.parse(localStorage.getItem("recentSearches")) || [];
    searches = searches.filter(c => c.toLowerCase() !== city.toLowerCase());
    searches.unshift(city);
    if (searches.length > 5) searches.pop();
    localStorage.setItem("recentSearches", JSON.stringify(searches));
    renderRecentSearches();
}

function renderRecentSearches() {
    let searches = JSON.parse(localStorage.getItem("recentSearches")) || [];
    recentSearchesEl.innerHTML = "";

    if (searches.length === 0) return;

    searches.forEach(city => {
        const btn = document.createElement("button");
        btn.textContent = city;
        btn.addEventListener("click", () => {
            fetchWeather(city);
            recentSearchesEl.style.display = "none";
        });
        recentSearchesEl.appendChild(btn);
    });

    searchInput.addEventListener("focus", () => {
        renderRecentSearches();
        if (recentSearchesEl.children.length > 0) {
            recentSearchesEl.style.display = "block";
        }
    });

    searchInput.addEventListener("blur", () => {
        setTimeout(() => {
            recentSearchesEl.style.display = "none";
        }, 200); // delay sedikit supaya tombol masih bisa diklik
    });

    if (searches.length > 0) {
        const clearBtn = document.createElement("button");
        clearBtn.textContent = "Delete search history";
        clearBtn.style.color = "red";
        clearBtn.addEventListener("click", () => {
            localStorage.removeItem("recentSearches");
            renderRecentSearches();
            recentSearchesEl.style.display = "none";
        });
        recentSearchesEl.appendChild(clearBtn);
    }
}

// ================== EVENTS ==================
searchButton.addEventListener("click", () => {
    const city = searchInput.value.trim();
    if (city) fetchWeather(city);
});
searchInput.addEventListener("focus", renderRecentSearches);

switchCFBtn.addEventListener("click", () => {
    isCelsius = !isCelsius;
    switchCFBtn.textContent = isCelsius ? "°F" : "°C";
    const lastCity = currentLocationNameEl.textContent.split(",")[0];
    if (lastCity) fetchWeather(lastCity);
});

themeToggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    localStorage.setItem("theme", isDark ? "dark" : "light");
});

saveLocationBtn.addEventListener("click", () => {
    const city = currentLocationNameEl.textContent.split(",")[0];
    if (city) saveLocation(city);
});

// ================== INIT ==================
(function init() {
    renderSavedLocations();

    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") document.body.classList.add("dark-mode");

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async pos => {
                const { latitude, longitude } = pos.coords;
                try {
                    const res = await fetch(`${BASE_URL}weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}`);
                    const data = await res.json();
                    fetchWeather(data.name);
                } catch {
                    fetchWeather("Jakarta");
                }
            },
            () => fetchWeather("Jakarta")
        );
    } else {
        fetchWeather("Jakarta");
    }
})();
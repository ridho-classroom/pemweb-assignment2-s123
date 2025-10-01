const API_KEY = '5cea47e32fab25556e32a0d7a7f0dee5';
let units = localStorage.getItem('ws_units') || 'metric'; // 'metric' (°C) / 'imperial' (°F)
let lang = 'id';
let chartInstance = null;

/* Local Storage Keys */
const LS_LASTWEATHER = 'ws_lastWeather';
const LS_UNITS = 'ws_units';
const LS_THEME = 'ws_theme';

/*DOM ELEMENTS*/
const searchBox = document.getElementById("search-box");
const searchBtn = document.getElementById("search-btn");
const cityName = document.getElementById("cityName");
const description = document.getElementById("description");
const temperature = document.getElementById("temperature");
const feelsLike = document.getElementById("feelsLike");
const humidity = document.getElementById("humidity");
const wind = document.getElementById("wind");
const sunInfo = document.getElementById("sun-info");
const alertBox = document.getElementById("alertBox");
const forecastContainer = document.getElementById("forecast");
const hourlyContainer = document.getElementById("hourly");
const maxMinEl = document.getElementById("maxMin");
const suggestionBox = document.getElementById("suggestions");
const loaderEl = document.getElementById("loader");
const unitToggle = document.getElementById("unit-toggle");
const themeToggle = document.getElementById("theme-toggle");
const mapBtn = document.getElementById("map-btn");
const favoritesList = document.getElementById("favoritesList");
const historyList = document.getElementById("historyList");

/*HELPER FUNCTIONS*/
function getCountryName(code) {
    const regionNames = new Intl.DisplayNames(["id"], { type: "region" });
    return regionNames.of(code);
}

function showLoader(show) {
    loaderEl.style.display = show ? 'block' : 'none';
}

function formatTemp(value) {
    if (value === undefined || value === null) return '--';
    return `${Math.round(value)}°${units === 'metric' ? 'C' : 'F'}`;
}

function fmtTime(unix, timezone) {
    const targetTimeInSeconds = unix + timezone;
    const date = new Date(targetTimeInSeconds * 1000);
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

function loadChartJs() {
    return new Promise((resolve) => {
        if (window.Chart) return resolve(window.Chart);
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        s.onload = () => resolve(window.Chart);
        document.head.appendChild(s);
    });
}

/*API CALLS / DATA FETCHING*/
async function fetchWeather(city) {
    if (!city) return;
    showLoader(true);

    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=${units}&lang=${lang}`;
        const res = await fetch(url);

        if (!res.ok) throw new Error('Kota tidak ditemukan');

        const data = await res.json();

        localStorage.setItem(LS_LASTWEATHER, JSON.stringify({ ts: Date.now(), data }));
        updateCurrentWeatherUI(data);
        await fetchForecastByCoords(data.coord.lat, data.coord.lon);
        addToHistory(data.name);

    } catch (err) {
        console.error('Gagal fetch cuaca: ' + err.message);
    } finally {
        showLoader(false);
    }
}

async function fetchWeatherByCoords(lat, lon, placeName) {
    showLoader(true);
    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${units}&lang=${lang}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Gagal ambil cuaca coords');
        const data = await res.json();

        localStorage.setItem(LS_LASTWEATHER, JSON.stringify({ ts: Date.now(), data }));
        updateCurrentWeatherUI(data, placeName || data.name);
        await fetchForecastByCoords(lat, lon);

    } catch (e) {
        console.error('Gagal ambil cuaca lokasi: ' + e.message);
    } finally {
        showLoader(false);
    }
}

async function fetchForecastByCoords(lat, lon) {
    showLoader(true);
    try {
        const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${units}&lang=${lang}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Gagal ambil forecast');
        const data = await res.json();

        updateDailyMinMax(data);
        showForecast(data);
        showHourlyFromForecast(data);

    } catch (e) {
        console.error('Gagal ambil forecast: ' + e.message);
    } finally {
        showLoader(false);
    }
}

async function getCitySuggestions(query) {
    if (!query) return [];
    const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    return await res.json();
}

/*UI RENDERING & DATA DISPLAY*/
function updateCurrentWeatherUI(data, forcedPlaceName) {
    const place = forcedPlaceName || data.name;

    cityName.textContent = `${data.name}, ${getCountryName(data.sys.country)}`;
    description.textContent = data.weather?.[0]?.description || '';
    temperature.textContent = formatTemp(data.main?.temp);
    feelsLike.textContent = `Terasa seperti ${formatTemp(data.main?.feels_like)}`;

    if (maxMinEl) {
        maxMinEl.textContent = `↑ ${Math.round(data.main?.temp_max)}° / ↓ ${Math.round(data.main?.temp_min)}°`;
    }

    humidity.textContent = `Kelembapan: ${data.main?.humidity}%`;
    wind.textContent = units === 'metric'
        ? `Angin: ${(data.wind?.speed * 3.6).toFixed(1)} km/jam`
        : `Angin: ${data.wind?.speed} mph`;

    const sunrise = fmtTime(data.sys.sunrise, data.timezone);
    const sunset = fmtTime(data.sys.sunset, data.timezone);
    sunInfo.textContent = `Matahari Terbit: ${sunrise} / Terbenam: ${sunset}`;

    const iconCode = data.weather?.[0]?.icon;
    document.getElementById("weatherIcon").innerHTML = `
        <img src="https://openweathermap.org/img/wn/${iconCode}@2x.png"
             alt="${data.weather[0].description}"
             title="${data.weather[0].description}" />
    `;

    const condition = data.weather?.[0]?.main || '';
    if (["Thunderstorm", "Rain", "Snow"].includes(condition)) {
        alertBox.style.display = 'block';
        alertBox.textContent = `⚠️ Peringatan: ${condition} di ${place}`;
    } else {
        alertBox.style.display = 'none';
    }
}

function updateDailyMinMax(forecastData) {
    if (!forecastData?.list) return;
    const today = new Date().getDate();
    let min = Infinity, max = -Infinity;

    forecastData.list.forEach(item => {
        const d = new Date(item.dt * 1000);
        if (d.getDate() === today) {
            min = Math.min(min, item.main.temp_min);
            max = Math.max(max, item.main.temp_max);
        }
    });

    if (min !== Infinity && max !== -Infinity && maxMinEl) {
        maxMinEl.textContent = `↑ ${Math.round(max)}° / ↓ ${Math.round(min)}°`;
    }
}

function showForecast(data) {
    forecastContainer.innerHTML = '';
    if (!data?.list) return;

    const dailyData = {};
    data.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dayKey = date.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });

        if (!dailyData[dayKey]) {
            dailyData[dayKey] = { min: item.main.temp_min, max: item.main.temp_max, icon: item.weather[0].icon, desc: item.weather[0].description };
        } else {
            dailyData[dayKey].min = Math.min(dailyData[dayKey].min, item.main.temp_min);
            dailyData[dayKey].max = Math.max(dailyData[dayKey].max, item.main.temp_max);
        }
    });

    Object.keys(dailyData).slice(0, 5).forEach(day => {
        const div = document.createElement("div");
        div.classList.add("forecast-item");
        div.innerHTML = `
            <img src="https://openweathermap.org/img/wn/${dailyData[day].icon}.png" alt="">
            <p>${day}</p>
            <p>Max: ${Math.round(dailyData[day].max)}°</p>
            <p>Min: ${Math.round(dailyData[day].min)}°</p>
        `;
        forecastContainer.appendChild(div);
    });
}

function showHourlyFromForecast(data) {
    hourlyContainer.innerHTML = '';
    if (!data?.list) return;

    data.list.slice(0, 8).forEach(item => {
        const time = new Date(item.dt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        const card = document.createElement("div");
        card.classList.add("hour-card");
        card.innerHTML = `
            <p><b>${time}</b></p>
            <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png" alt="" />
            <p><b>${Math.round(item.main.temp)}°</b></p>
            <p>${item.weather[0].description}</p>
        `;
        hourlyContainer.appendChild(card);
    })

    renderTrendChart(data.list.slice(0, 8));
}


/*CHART/GRAPH LOGIC*/
function renderTrendChart(hourlyData) {
    const ctx = document.getElementById("hourlyChart")?.getContext("2d");
    if (!ctx) return;

    if (chartInstance) chartInstance.destroy();

    const labels = hourlyData.map(item =>
        new Date(item.dt * 1000).getHours() + ":00"
    );
    const temps = hourlyData.map(item => item.main.temp);

    chartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [
                {
                    label: `Suhu (${units === "metric" ? "°C" : "°F"})`,
                    data: temps,
                    borderColor: "rgba(69, 126, 183, 1)",
                    backgroundColor: "rgba(9, 255, 255, 0.2)",
                    fill: true,
                    tension: 0.3,
                },
            ],
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: true },
            },
            scales: {
                y: {
                    beginAtZero: false,
                },
            },
        },
    });
}


/* THEME & UNIT TOGGLE HANDLERS*/
unitToggle.checked = (units === 'imperial');
unitToggle.addEventListener('change', () => {
    units = unitToggle.checked ? 'imperial' : 'metric';
    localStorage.setItem(LS_UNITS, units);

    const last = (cityName.textContent || '').split(',')[0];
    if (last) fetchWeather(last);
});

if (localStorage.getItem(LS_THEME) === 'dark') {
    document.body.classList.add('dark');
    themeToggle.checked = true;
}
themeToggle.addEventListener('change', () => {
    if (themeToggle.checked) {
        document.body.classList.add('dark');
        localStorage.setItem(LS_THEME, 'dark');
    } else {
        document.body.classList.remove('dark');
        localStorage.setItem(LS_THEME, 'light');
    }
});

/* FAVORITES & HISTORY LOGIC*/
let favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
let history = JSON.parse(localStorage.getItem("history") || "[]");

function addToHistory(city) {
    if (!city || history.includes(city)) return;
    history.unshift(city);
    if (history.length > 5) history.pop();
    localStorage.setItem("history", JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    historyList.innerHTML = "";
    history.forEach((city, index) => {
        const li = document.createElement("li");
        li.textContent = city;
        li.onclick = () => fetchWeather(city);

        const removeBtn = document.createElement("button");
        removeBtn.textContent = "✕";
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            history.splice(index, 1);
            localStorage.setItem("history", JSON.stringify(history));
            renderHistory();
        };

        li.appendChild(removeBtn);
        historyList.appendChild(li);
    });
}

function addToFavorites(city) {
    if (!city || favorites.includes(city)) return;
    favorites.push(city);
    localStorage.setItem("favorites", JSON.stringify(favorites));
    renderFavorites();
}

function renderFavorites() {
    favoritesList.innerHTML = "";
    favorites.forEach((city, index) => {
        const li = document.createElement("li");
        li.textContent = city;
        li.onclick = () => fetchWeather(city);

        const removeBtn = document.createElement("button");
        removeBtn.textContent = "✖";
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            favorites.splice(index, 1);
            localStorage.setItem("favorites", JSON.stringify(favorites));
            renderFavorites();
        };

        li.appendChild(removeBtn);
        favoritesList.appendChild(li);
    });
}

document.getElementById("fav-btn").addEventListener("click", () => {
    const city = cityName.textContent.split(",")[0];
    addToFavorites(city);
});

/* SEARCH & AUTOCOMPLETE HANDLERS*/
searchBox.addEventListener("input", async () => {
    const query = searchBox.value.trim();
    suggestionBox.innerHTML = "";
    suggestionBox.style.width = searchBox.offsetWidth + "px";

    if (query.length > 2) {
        const suggestions = await getCitySuggestions(query).catch(() => []);
        suggestionBox.style.display = suggestions.length ? 'block' : 'none';

        suggestions.forEach(city => {
            const div = document.createElement("div");
            div.textContent = `${city.name}${city.state ? ', ' + city.state : ''}, ${city.country}`;
            div.addEventListener("click", () => {
                searchBox.value = city.name;
                suggestionBox.style.display = "none";
                fetchWeather(city.name);
            });
            suggestionBox.appendChild(div);
        });
    } else {
        suggestionBox.style.display = "none";
    }
});

searchBtn.addEventListener("click", () => {
    const city = searchBox.value.trim();
    if (city) fetchWeather(city);
    suggestionBox.style.display = 'none';
});

searchBox.addEventListener("keydown", (e) => {
    if (e.key === 'Enter') {
        const city = searchBox.value.trim();
        if (city) fetchWeather(city);
        suggestionBox.style.display = 'none';
    }
});

/* MAP BUTTON HANDLER*/
if (mapBtn) {
    mapBtn.addEventListener('click', () => {
        window.open("https://openweathermap.org/weathermap?basemap=map&cities=true&layer=temperature&zoom=3", "_blank");
    });
}

/* INITIALIZATION / GEOLOCATION ON LOAD*/
function detectAndLoadLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude, 'Lokasi Anda'),
            () => {
                const last = JSON.parse(localStorage.getItem(LS_LASTWEATHER) || 'null');
                if (last?.data?.name) {
                    updateCurrentWeatherUI(last.data);
                    fetchForecastByCoords(last.data.coord.lat, last.data.coord.lon);
                } else {
                    fetchWeather('Jakarta');
                }
            }
        );
    } else {
        const last = JSON.parse(localStorage.getItem(LS_LASTWEATHER) || 'null');
        if (last?.data?.name) {
            updateCurrentWeatherUI(last.data);
            fetchForecastByCoords(last.data.coord.lat, last.data.coord.lon);
        } else {
            fetchWeather('Jakarta');
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    loadChartJs();
    renderFavorites();
    renderHistory();
    detectAndLoadLocation();
});
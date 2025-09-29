const CONFIG = {
    OWM_KEY: "3fe35160c968dc79370f84a8d84a44bf",
    CURRENT_URL: "https://api.openweathermap.org/data/2.5/weather",
    FORECAST_URL: "https://api.openweathermap.org/data/2.5/forecast",
    GEOCODE_URL: "https://api.openweathermap.org/geo/1.0/direct"
};

class WeatherApp {
    constructor() {
        this.API_KEY = CONFIG.OWM_KEY;
        this.currentLocation = null;
        this.currentWeather = null;
        this.currentUnit = localStorage.getItem("unit") || "C";
        this.currentTheme = localStorage.getItem("theme") || "light";
        this.favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
        this.searchHistory = JSON.parse(localStorage.getItem("searchHistory") || "[]");
        this.forecastData = null;

        this.initializeApp();
    }

    initializeApp() {
        this.setupEventListeners();
        this.applyTheme();
        this.loadFavorites();
        this.getCurrentLocation();
    }

    // --- Event Listeners ---
    setupEventListeners() {
        const searchInput = document.getElementById("searchInput");
        const suggestions = document.getElementById("suggestions");

        searchInput.addEventListener("input", this.debounce(this.handleSearchInput.bind(this), 300));
        searchInput.addEventListener("keydown", this.handleSearchKeydown.bind(this));

        document.getElementById("unitToggle")
            .addEventListener("click", this.toggleUnit.bind(this));
        document.getElementById("themeToggle")
            .addEventListener("click", this.toggleTheme.bind(this));
        document.getElementById("locationBtn")
            .addEventListener("click", this.getCurrentLocation.bind(this));
        document.getElementById("addToFavorites")
            .addEventListener("click", this.addToFavorites.bind(this));

        document.addEventListener("click", (e) => {
            if (!e.target.closest(".search-container")) {
                suggestions.classList.add("hidden");
            }
        });
    }

    // --- Search ---
    async handleSearchInput(e) {
        const query = e.target.value.trim();
        const suggestions = document.getElementById("suggestions");
        suggestions.innerHTML = "";

        if (query.length > 2) {
            try {
                const results = await this.fetchCitySuggestions(query);
                let hasSuggestions = false;

                // 🔹 API Suggestions
                if (results.length) {
                    hasSuggestions = true;
                    const apiHeader = document.createElement("div");
                    apiHeader.textContent = "🌍 Suggestions";
                    apiHeader.style.fontWeight = "600";
                    apiHeader.style.padding = "8px 12px";
                    apiHeader.style.background = "var(--secondary-color)";
                    suggestions.appendChild(apiHeader);

                    results.forEach((city) => {
                        const div = document.createElement("div");
                        div.className = "suggestion-item";
                        div.textContent = `${city.name}, ${city.country}`;
                        div.addEventListener("click", () => {
                            document.getElementById("searchInput").value = city.name;
                            this.fetchWeatherByCoords(city.lat, city.lon);

                            if (!this.searchHistory.find(h => h.name === city.name && h.country === city.country)) {
                                this.searchHistory.unshift({ name: city.name, country: city.country, lat: city.lat, lon: city.lon });
                                if (this.searchHistory.length > 10) this.searchHistory.pop();
                                localStorage.setItem("searchHistory", JSON.stringify(this.searchHistory));
                            }

                            suggestions.classList.add("hidden");
                        });
                        suggestions.appendChild(div);
                    });
                }

                // 🔹 Recent Searches
                const recentMatches = this.searchHistory.filter((item) =>
                    item.name.toLowerCase().startsWith(query.toLowerCase())
                );

                if (recentMatches.length) {
                    hasSuggestions = true;
                    const recentHeader = document.createElement("div");
                    recentHeader.textContent = "🕘 Recent Searches";
                    recentHeader.style.fontWeight = "600";
                    recentHeader.style.padding = "8px 12px";
                    recentHeader.style.background = "var(--secondary-color)";
                    recentHeader.style.marginTop = "5px";
                    suggestions.appendChild(recentHeader);

                    recentMatches.forEach((city) => {
                        const div = document.createElement("div");
                        div.className = "suggestion-item";

                        const nameSpan = document.createElement("span");
                        nameSpan.textContent = `${city.name}, ${city.country}`;
                        nameSpan.style.flex = "1";
                        nameSpan.addEventListener("click", () => {
                            document.getElementById("searchInput").value = city.name;
                            if (city.lat && city.lon) {
                                this.fetchWeatherByCoords(city.lat, city.lon);
                            } else {
                                this.searchWeather(city.name);
                            }
                            suggestions.classList.add("hidden");
                        });

                        div.appendChild(nameSpan);

                        // ❌ hapus item
                        const removeBtn = document.createElement("button");
                        removeBtn.textContent = "✕";
                        removeBtn.style.background = "transparent";
                        removeBtn.style.border = "none";
                        removeBtn.style.color = "red";
                        removeBtn.style.cursor = "pointer";
                        removeBtn.style.marginLeft = "8px";
                        removeBtn.addEventListener("click", (ev) => {
                            ev.stopPropagation();
                            this.searchHistory = this.searchHistory.filter((h) => h.name !== city.name || h.country !== city.country);
                            localStorage.setItem("searchHistory", JSON.stringify(this.searchHistory));
                            this.handleSearchInput({ target: { value: query } });
                        });

                        div.appendChild(removeBtn);
                        suggestions.appendChild(div);
                    });

                    // 🔥 Clear All jika > 1 item
                    if (this.searchHistory.length > 1) {
                        const clearAllDiv = document.createElement("div");
                        clearAllDiv.className = "suggestion-item";
                        clearAllDiv.style.textAlign = "center";
                        clearAllDiv.style.fontWeight = "600";
                        clearAllDiv.style.color = "var(--error-color)";
                        clearAllDiv.style.cursor = "pointer";
                        clearAllDiv.textContent = "🗑️ Clear All History";
                        clearAllDiv.addEventListener("click", () => {
                            this.searchHistory = [];
                            localStorage.removeItem("searchHistory");
                            this.handleSearchInput({ target: { value: query } });
                        });
                        suggestions.appendChild(clearAllDiv);
                    }
                }

                if (hasSuggestions) {
                    suggestions.classList.remove("hidden");
                } else {
                    suggestions.classList.add("hidden");
                }
            } catch (err) {
                console.error("Error fetching suggestions:", err);
                suggestions.classList.add("hidden");
            }
        } else {
            suggestions.classList.add("hidden");
        }
    }

    async fetchCitySuggestions(query) {
        const res = await fetch(
            `${CONFIG.GEOCODE_URL}?q=${encodeURIComponent(query)}&limit=5&appid=${this.API_KEY}`
        );
        return res.json();
    }

    handleSearchKeydown(e) {
        if (e.key === "Enter") {
            const query = e.target.value.trim();
            if (query) this.searchWeather(query);
        }
    }

    // --- Geolocation ---
    getCurrentLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    this.fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
                },
                () => this.showError("Location access denied. Please search manually.")
            );
        } else {
            this.showError("Geolocation not supported.");
        }
    }

    async fetchWeatherByCoords(lat, lon) {
        this.showLoading(true);
        try {
            const weatherRes = await fetch(
                `${CONFIG.CURRENT_URL}?lat=${lat}&lon=${lon}&appid=${this.API_KEY}&units=metric`
            );
            const weatherData = await weatherRes.json();

            const forecastRes = await fetch(
                `${CONFIG.FORECAST_URL}?lat=${lat}&lon=${lon}&appid=${this.API_KEY}&units=metric`
            );
            const forecastData = await forecastRes.json();

            this.forecastData = forecastData.list;

            const data = {
                location: {
                    name: weatherData.name,
                    country: weatherData.sys.country,
                    lat: lat,
                    lon: lon
                },
                current: {
                    temp_c: weatherData.main.temp,
                    temp_f: (weatherData.main.temp * 9) / 5 + 32,
                    condition: {
                        text: weatherData.weather[0].description,
                        icon: `https://openweathermap.org/img/wn/${weatherData.weather[0].icon}@2x.png`
                    },
                    feelslike_c: weatherData.main.feels_like,
                    feelslike_f: (weatherData.main.feels_like * 9) / 5 + 32,
                    humidity: weatherData.main.humidity,
                    wind_kph: weatherData.wind.speed * 3.6,
                    wind_mph: weatherData.wind.speed * 2.23694,
                    uv: "N/A"
                }
            };

            this.currentLocation = data.location;
            this.currentWeather = data;

            this.updateWeatherDisplay(data);
            this.updateForecastDisplay(this.forecastData);
            this.updateHourlyForecast(this.forecastData);
        } catch {
            this.showError("Failed to fetch weather data.");
        } finally {
            this.showLoading(false);
        }
    }

    async searchWeather(city) {
        this.showLoading(true);
        try {
            const geoRes = await fetch(
                `${CONFIG.GEOCODE_URL}?q=${city}&limit=1&appid=${this.API_KEY}`
            );
            const geoData = await geoRes.json();
            if (!geoData.length) {
                this.showError("City not found!");
                return;
            }
            const { lat, lon, name, country } = geoData[0];
            await this.fetchWeatherByCoords(lat, lon);

            if (!this.searchHistory.find(h => h.name === name && h.country === country)) {
                this.searchHistory.unshift({ name, country, lat, lon });
                if (this.searchHistory.length > 10) this.searchHistory.pop();
                localStorage.setItem("searchHistory", JSON.stringify(this.searchHistory));
            }

            this.showMessage(`Weather loaded for ${name}, ${country}`, "success");
        } catch {
            this.showError("Search failed.");
        } finally {
            this.showLoading(false);
        }
    }

    // --- Display ---
    updateWeatherDisplay(data) {
        const tempUnit = this.currentUnit === "C" ? "temp_c" : "temp_f";
        const feelsLikeUnit = this.currentUnit === "C" ? "feelslike_c" : "feelslike_f";
        const windUnit = this.currentUnit === "C" ? "wind_kph" : "wind_mph";
        const windUnitText = this.currentUnit === "C" ? "km/h" : "mph";

        document.getElementById("currentLocation").textContent =
            `${data.location.name}, ${data.location.country}`;
        document.getElementById("currentTemp").textContent =
            `${Math.round(data.current[tempUnit])}°`;
        document.getElementById("weatherDesc").textContent = data.current.condition.text;
        document.getElementById("feelsLike").textContent =
            `${Math.round(data.current[feelsLikeUnit])}°`;
        document.getElementById("humidity").textContent = `${data.current.humidity}%`;
        document.getElementById("windSpeed").textContent =
            `${Math.round(data.current[windUnit])} ${windUnitText}`;
        document.getElementById("uvIndex").textContent = data.current.uv;

        // 🔥 Auto Theme berdasarkan suhu/cuaca
        const condition = data.current.condition.text.toLowerCase();
        const tempC = data.current.temp_c;

        if (condition.includes("rain")) {
            this.setTheme("rainy");
        } else if (condition.includes("snow")) {
            this.setTheme("snow");
        } else if (condition.includes("clear")) {
            if (tempC >= 30) {
                this.setTheme("hot");
            } else {
                this.setTheme("sunny");
            }
        } else {
            if (tempC >= 30) this.setTheme("hot");
            else if (tempC <= 10) this.setTheme("snow");
            else this.setTheme("light");
        }
    }

    updateForecastDisplay(forecastList) {
        const forecastContainer = document.getElementById("forecastContainer");
        forecastContainer.innerHTML = "";

        const dailyData = {};
        forecastList.forEach((item) => {
            const date = item.dt_txt.split(" ")[0];
            if (!dailyData[date]) dailyData[date] = [];
            dailyData[date].push(item);
        });

        const convert = (t) => this.currentUnit === "C" ? t : (t * 9) / 5 + 32;

        Object.keys(dailyData).slice(0, 5).forEach((date) => {
            const dayData = dailyData[date];
            const temps = dayData.map((d) => d.main.temp);
            const minTemp = Math.min(...temps);
            const maxTemp = Math.max(...temps);
            const condition = dayData[0].weather[0];

            let emoji = "🌤️";
            if (condition.description.includes("rain")) emoji = "🌧️";
            else if (condition.description.includes("snow")) emoji = "❄️";
            else if (condition.description.includes("clear") && maxTemp >= 30) emoji = "🔥";
            else if (condition.description.includes("clear")) emoji = "☀️";

            const forecastItem = document.createElement("div");
            forecastItem.className = "forecast-item";
            forecastItem.innerHTML = `
                <div class="forecast-date">${new Date(date).toDateString()}</div>
                <img src="https://openweathermap.org/img/wn/${condition.icon}@2x.png" alt="${condition.description}">
                <div>${condition.description} ${emoji}</div>
                <div class="forecast-temps">
                    <span class="temp-high">${Math.round(convert(maxTemp))}°</span>
                    <span class="temp-low">${Math.round(convert(minTemp))}°</span>
                </div>
            `;
            forecastContainer.appendChild(forecastItem);
        });
    }

    updateHourlyForecast(hourlyList) {
        const hourlyForecast = document.getElementById("hourlyForecast");
        hourlyForecast.innerHTML = "";

        const convert = (t) => this.currentUnit === "C" ? t : (t * 9) / 5 + 32;

        hourlyList.slice(0, 8).forEach((item) => {
            const time = new Date(item.dt * 1000).toLocaleTimeString([], {
                hour: "2-digit", minute: "2-digit"
            });
            const temp = Math.round(convert(item.main.temp));
            const condition = item.weather[0];

            let emoji = "🌤️";
            if (condition.description.includes("rain")) emoji = "🌧️";
            else if (condition.description.includes("snow")) emoji = "❄️";
            else if (condition.description.includes("clear") && item.main.temp >= 30) emoji = "🔥";
            else if (condition.description.includes("clear")) emoji = "☀️";

            const hourlyItem = document.createElement("div");
            hourlyItem.className = "hourly-item";
            hourlyItem.innerHTML = `
            <div class="hourly-time">${time}</div>
            <img src="https://openweathermap.org/img/wn/${condition.icon}@2x.png" alt="${condition.description}">
            <div class="hourly-temp">${temp}°</div>
            <div class="hourly-emoji">${emoji}</div>
        `;

            hourlyForecast.appendChild(hourlyItem);
        });
    }

    // --- Favorites ---
    addToFavorites() {
        if (
            this.currentLocation &&
            !this.favorites.find(f => f.name === this.currentLocation.name && f.country === this.currentLocation.country)
        ) {
            this.favorites.push(this.currentLocation);
            localStorage.setItem("favorites", JSON.stringify(this.favorites));
            this.loadFavorites();
            this.showMessage("Added to favorites", "success");
        }
    }

    loadFavorites() {
        const favGrid = document.getElementById("favoritesGrid");
        favGrid.innerHTML = "";
        this.favorites.forEach((loc, idx) => {
            const div = document.createElement("div");
            div.className = "favorite-item";
            div.innerHTML = `
                <strong>${loc.name}, ${loc.country}</strong>
                <button class="remove-favorite">x</button>
            `;

            // 🔹 klik favorite
            div.addEventListener("click", () => {
                if (loc.lat && loc.lon) {
                    this.fetchWeatherByCoords(loc.lat, loc.lon);
                } else {
                    this.searchWeather(loc.name);
                }
            });

            // ❌ hapus favorite
            div.querySelector(".remove-favorite").addEventListener("click", (e) => {
                e.stopPropagation();
                this.favorites.splice(idx, 1);
                localStorage.setItem("favorites", JSON.stringify(this.favorites));
                this.loadFavorites();
            });

            favGrid.appendChild(div);
        });
    }

    // --- Toggles ---
    toggleUnit() {
        this.currentUnit = this.currentUnit === "C" ? "F" : "C";
        localStorage.setItem("unit", this.currentUnit);
        document.getElementById("unitToggle").textContent = `°${this.currentUnit}`;

        if (this.currentWeather) {
            this.updateWeatherDisplay(this.currentWeather);
        }

        if (this.forecastData) {
            this.updateForecastDisplay(this.forecastData);
            this.updateHourlyForecast(this.forecastData);
        }
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === "light" ? "dark" : "light";
        localStorage.setItem("theme", this.currentTheme);
        this.applyTheme();
    }

    setTheme(theme) {
        this.currentTheme = theme;
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("theme", theme);

        const themeBtn = document.getElementById("themeToggle");
        themeBtn.textContent =
            theme === "dark" ? "🌙" :
            theme === "sunny" ? "☀️" :
            theme === "rainy" ? "🌧️" :
            theme === "hot" ? "🔥" :
            theme === "snow" ? "❄️" : "🌤️";
    }

    applyTheme() {
        document.documentElement.setAttribute("data-theme", this.currentTheme);
        const themeBtn = document.getElementById("themeToggle");
        themeBtn.textContent =
            this.currentTheme === "dark" ? "🌙" :
            this.currentTheme === "sunny" ? "☀️" :
            this.currentTheme === "rainy" ? "🌧️" :
            this.currentTheme === "hot" ? "🔥" :
            this.currentTheme === "snow" ? "❄️" : "🌤️";
    }
    

    // --- Helpers ---
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    }

    showLoading(show) {
        document.getElementById("loadingMain").classList.toggle("hidden", !show);
    }

    showError(msg) {
        this.showMessage(msg, "error");
    }

    showMessage(message, type = "success") {
        const existingMessage = document.querySelector(
            ".error-message, .success-message, .warning-message"
        );
        if (existingMessage) existingMessage.remove();

        const messageEl = document.createElement("div");
        messageEl.className = `${type}-message`;
        messageEl.textContent = message;
        document.body.appendChild(messageEl);
        setTimeout(() => messageEl.remove(), 4000);
    }
}

// Init
let weatherApp;
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        weatherApp = new WeatherApp();
    });
} else {
    weatherApp = new WeatherApp();
}
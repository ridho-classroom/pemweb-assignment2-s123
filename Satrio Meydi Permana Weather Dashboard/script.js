const API_KEY = '80fa038233d133bd725201e499632b0d'; 
        const API_BASE = 'https://api.openweathermap.org/data/2.5';
        
        // State management
        const state = {
            currentWeather: null,
            forecast: null,
            unit: 'metric',
            theme: 'light',
            favorites: [],
            recentSearches: [],
            currentLocation: null
        };

        // DOM Elements
        const els = {
            searchInput: document.getElementById('searchInput'),
            searchBtn: document.getElementById('searchBtn'),
            suggestions: document.getElementById('suggestions'),
            recentSearches: document.getElementById('recentSearches'),
            themeToggle: document.getElementById('themeToggle'),
            unitToggle: document.getElementById('unitToggle'),
            locationBtn: document.getElementById('locationBtn'),
            errorMessage: document.getElementById('errorMessage'),
            loading: document.getElementById('loading'),
            weatherContent: document.getElementById('weatherContent'),
            locationName: document.getElementById('locationName'),
            weatherIcon: document.getElementById('weatherIcon'),
            temperature: document.getElementById('temperature'),
            description: document.getElementById('description'),
            feelsLike: document.getElementById('feelsLike'),
            humidity: document.getElementById('humidity'),
            windSpeed: document.getElementById('windSpeed'),
            pressure: document.getElementById('pressure'),
            forecastGrid: document.getElementById('forecastGrid'),
            favoritesGrid: document.getElementById('favoritesGrid'),
            addFavoriteBtn: document.getElementById('addFavoriteBtn')
        };

        // Initialize app
        function init() {
            loadFromLocalStorage();
            setupEventListeners();
            renderRecentSearches();
            renderFavorites();
            
            // Try to get user location on first load
            if (navigator.geolocation && !state.currentLocation) {
                getUserLocation();
            }
        }

        // Event Listeners
        function setupEventListeners() {
            els.searchBtn.addEventListener('click', handleSearch);
            els.searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSearch();
});
            els.searchInput.addEventListener('input', handleSearchInput);
            els.themeToggle.addEventListener('click', toggleTheme);
            els.unitToggle.addEventListener('click', toggleUnit);
            els.locationBtn.addEventListener('click', getUserLocation);
            els.addFavoriteBtn.addEventListener('click', addToFavorites);
        }

        // Local Storage
        function loadFromLocalStorage() {
            const saved = localStorage.getItem('weatherDashboard');
            if (saved) {
                const data = JSON.parse(saved);
                state.unit = data.unit || 'metric';
                state.theme = data.theme || 'light';
                state.favorites = data.favorites || [];
                state.recentSearches = data.recentSearches || [];
                
                document.documentElement.setAttribute('data-theme', state.theme);
                updateThemeButton();
                updateUnitButton();
            }
        }

        function saveToLocalStorage() {
            localStorage.setItem('weatherDashboard', JSON.stringify({
                unit: state.unit,
                theme: state.theme,
                favorites: state.favorites,
                recentSearches: state.recentSearches
            }));
        }

        // Theme Toggle
        function toggleTheme() {
            state.theme = state.theme === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', state.theme);
            updateThemeButton();
            saveToLocalStorage();
        }

        function updateThemeButton() {
            els.themeToggle.textContent = state.theme === 'light' ? '🌙 Dark' : '☀️ Light';
        }

        // Unit Toggle
        function toggleUnit() {
            state.unit = state.unit === 'metric' ? 'imperial' : 'metric';
            updateUnitButton();
            saveToLocalStorage();
            
            if (state.currentWeather) {
                updateWeatherDisplay();
            }
        }

        function updateUnitButton() {
            els.unitToggle.textContent = state.unit === 'metric' ? '°F' : '°C';
        }

        // Geolocation
        function getUserLocation() {
            if (!navigator.geolocation) {
                showError('Geolocation is not supported by your browser');
                return;
            }

            showLoading(true);
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    fetchWeatherByCoords(latitude, longitude);
                },
                (error) => {
                    showLoading(false);
                    showError('Unable to get your location. Please search manually.');
                }
            );
        }

        // Search Functionality
        function handleSearch() {
            console.log('handleSearch called');
            const query = els.searchInput.value.trim();
            if (!query) return;

            addToRecentSearches(query);
            fetchWeatherByCity(query);
            els.suggestions.style.display = 'none';
        }

        function handleSearchInput(e) {
            const query = e.target.value.trim();
            if (query.length < 2) {
                els.suggestions.style.display = 'none';
                return;
            }

            // Simple autocomplete using recent searches
            const matches = state.recentSearches.filter(city => 
                city.toLowerCase().includes(query.toLowerCase())
            );

            if (matches.length > 0) {
                els.suggestions.innerHTML = matches.map(city => 
                    `<div class="suggestion-item" onclick="selectSuggestion('${city}')">${city}</div>`
                ).join('');
                els.suggestions.style.display = 'block';
            } else {
                els.suggestions.style.display = 'none';
            }
        }

        function selectSuggestion(city) {
            els.searchInput.value = city;
            handleSearch();
        }

        function addToRecentSearches(city) {
            if (!state.recentSearches.includes(city)) {
                state.recentSearches.unshift(city);
                state.recentSearches = state.recentSearches.slice(0, 5);
                saveToLocalStorage();
                renderRecentSearches();
            }
        }

        function renderRecentSearches() {
            if (state.recentSearches.length === 0) {
                els.recentSearches.innerHTML = '';
                return;
            }

            els.recentSearches.innerHTML = '<small style="color: var(--text-secondary); margin-right: 0.5rem;">Recent:</small>' +
                state.recentSearches.map(city => 
                    `<span class="recent-tag" onclick="selectSuggestion('${city}')">${city}</span>`
                ).join('');
        }

        // API Calls
        async function fetchWeatherByCity(city) {
            console.log('fetchWeatherByCity called with:', city);
            showLoading(true);
            hideError();

            try {
                const currentResponse = await fetch(
                    `${API_BASE}/weather?q=${city}&appid=${API_KEY}&units=${state.unit}`
                );

                if (!currentResponse.ok) {
                    throw new Error('City not found');
                }

                const currentData = await currentResponse.json();
                state.currentWeather = currentData;
                state.currentLocation = {
                    name: currentData.name,
                    country: currentData.sys.country,
                    lat: currentData.coord.lat,
                    lon: currentData.coord.lon
                };

                await fetchForecast(currentData.coord.lat, currentData.coord.lon);
                updateWeatherDisplay();
                showLoading(false);
                els.weatherContent.style.display = 'block';
                els.addFavoriteBtn.style.display = 'block';
            } catch (error) {
                showLoading(false);
                showError('City not found. Please try again.');
            }
        }

        async function fetchWeatherByCoords(lat, lon) {
            showLoading(true);
            hideError();

            try {
                const currentResponse = await fetch(
                    `${API_BASE}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${state.unit}`
                );

                const currentData = await currentResponse.json();
                state.currentWeather = currentData;
                state.currentLocation = {
                    name: currentData.name,
                    country: currentData.sys.country,
                    lat: currentData.coord.lat,
                    lon: currentData.coord.lon
                };

                await fetchForecast(lat, lon);
                updateWeatherDisplay();
                showLoading(false);
                els.weatherContent.style.display = 'block';
                els.addFavoriteBtn.style.display = 'block';
            } catch (error) {
                showLoading(false);
                showError('Unable to fetch weather data.');
            }
        }

        async function fetchForecast(lat, lon) {
            try {
                const response = await fetch(
                    `${API_BASE}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${state.unit}`
                );
                const data = await response.json();
                
                // Get one forecast per day (12:00 PM)
                const dailyForecasts = data.list.filter(item => 
                    item.dt_txt.includes('12:00:00')
                ).slice(0, 5);
                
                state.forecast = dailyForecasts;
                renderForecast();
            } catch (error) {
                console.error('Forecast fetch error:', error);
            }
        }

        // Display Updates
        function updateWeatherDisplay() {
            const weather = state.currentWeather;
            const tempUnit = state.unit === 'metric' ? '°C' : '°F';
            const windUnit = state.unit === 'metric' ? 'm/s' : 'mph';

            els.locationName.textContent = `${weather.name}, ${weather.sys.country}`;
            els.weatherIcon.src = `https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`;
            els.weatherIcon.alt = weather.weather[0].description;
            els.temperature.textContent = `${Math.round(weather.main.temp)}${tempUnit}`;
            els.description.textContent = weather.weather[0].description;
            els.feelsLike.textContent = `${Math.round(weather.main.feels_like)}${tempUnit}`;
            els.humidity.textContent = `${weather.main.humidity}%`;
            els.windSpeed.textContent = `${Math.round(weather.wind.speed)} ${windUnit}`;
            els.pressure.textContent = `${weather.main.pressure} hPa`;
        }

        function renderForecast() {
            if (!state.forecast) return;

            const tempUnit = state.unit === 'metric' ? '°C' : '°F';
            
            els.forecastGrid.innerHTML = state.forecast.map(day => {
                const date = new Date(day.dt * 1000);
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                
                return `
                    <div class="forecast-card" role="article" aria-label="Forecast for ${dayName}">
                        <div class="forecast-date">${dayName}</div>
                        <img src="https://openweathermap.org/img/wn/${day.weather[0].icon}.png" 
                             alt="${day.weather[0].description}" 
                             class="forecast-icon" />
                        <div class="forecast-temp">${Math.round(day.main.temp)}${tempUnit}</div>
                        <div class="forecast-desc">${day.weather[0].description}</div>
                    </div>
                `;
            }).join('');
        }

        // Favorites
        function addToFavorites() {
            if (!state.currentLocation) return;

            const location = {
                name: state.currentLocation.name,
                country: state.currentLocation.country,
                lat: state.currentLocation.lat,
                lon: state.currentLocation.lon
            };

            const exists = state.favorites.some(fav => 
                fav.name === location.name && fav.country === location.country
            );

            if (!exists) {
                state.favorites.push(location);
                saveToLocalStorage();
                renderFavorites();
                showError('Added to favorites!', 'success');
                setTimeout(hideError, 2000);
            } else {
                showError('Already in favorites!', 'info');
                setTimeout(hideError, 2000);
            }
        }

        function removeFavorite(index) {
            state.favorites.splice(index, 1);
            saveToLocalStorage();
            renderFavorites();
        }

        function renderFavorites() {
            if (state.favorites.length === 0) {
                els.favoritesGrid.innerHTML = '<p style="color: var(--text-secondary);">No favorite locations yet. Add some!</p>';
                return;
            }

            els.favoritesGrid.innerHTML = state.favorites.map((fav, index) => `
                <div class="favorite-card" onclick="fetchWeatherByCoords(${fav.lat}, ${fav.lon})" 
                     role="button" tabindex="0" aria-label="Load weather for ${fav.name}">
                    <button class="remove-favorite" onclick="event.stopPropagation(); removeFavorite(${index})" 
                            aria-label="Remove ${fav.name} from favorites">×</button>
                    <div style="font-weight: 600; color: var(--text-primary);">${fav.name}</div>
                    <div style="font-size: 0.875rem; color: var(--text-secondary);">${fav.country}</div>
                </div>
            `).join('');
        }

        function showLoading(show = true) {
    els.loading.style.display = show ? 'block' : 'none';
    els.weatherContent.style.display = show ? 'none' : 'block';
}

function showError(message, type = 'error') {
    els.errorMessage.textContent = message;
    els.errorMessage.className = 'error-message show';
    if (type === 'success') {
        els.errorMessage.style.background = 'var(--success)';
    } else if (type === 'info') {
        els.errorMessage.style.background = 'var(--accent)';
    } else {
        els.errorMessage.style.background = 'var(--error)';
    }
}

function hideError() {
    els.errorMessage.className = 'error-message';
    els.errorMessage.textContent = '';
}

// Make selectSuggestion globally accessible for inline onclick
        window.selectSuggestion = selectSuggestion;

        // Make removeFavorite globally accessible for inline onclick
        window.removeFavorite = removeFavorite;

        // Make fetchWeatherByCoords globally accessible for inline onclick
        window.fetchWeatherByCoords = fetchWeatherByCoords;

        // Initialize
        init();
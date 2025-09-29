// Weather Dashboard Application
class WeatherDashboard {
    constructor() {
        this.apiKey = '6821f1923fd58ceb558f9c8b8ce94ce3'; 
        this.baseUrl = 'https://api.openweathermap.org/data/2.5';
        this.geoApiUrl = 'https://api.openweathermap.org/geo/1.0';
        this.units = this.getStoredData('units') || 'metric';
        this.theme = this.getStoredData('theme') || 'light';
        this.favorites = this.getStoredData('favorites') || [];
        this.searchHistory = this.getStoredData('searchHistory') || [];
        this.currentWeatherData = null;
        this.currentForecastData = null;
        this.searchCache = new Map(); // Cache for search suggestions
        
        this.initializeApp();
    }

    // Initialize the application
    initializeApp() {
        this.setupEventListeners();
        this.applyTheme(this.theme);
        this.updateUnitsDisplay();
        this.renderFavorites();
        this.setupNetworkMonitoring();
        this.setupKeyboardNavigation();
        this.renderSearchHistory();
        
        // Try to get user's location on first load, fallback to demo if denied
        this.getCurrentLocationWeather();
    }

    // Setup all event listeners
    setupEventListeners() {
        // Theme toggle
        document.getElementById('theme-toggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Units toggle
        document.getElementById('units-toggle').addEventListener('click', () => {
            this.toggleUnits();
        });

        // Location button
        document.getElementById('location-btn').addEventListener('click', () => {
            this.getCurrentLocationWeather();
        });

        // Search input
        const searchInput = document.getElementById('search-input');
        searchInput.addEventListener('input', this.debounce((e) => {
            this.handleSearchInput(e.target.value);
        }, 300));

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const value = e.target.value.trim();
                if (value) {
                    this.searchWeather(value);
                }
            }
        });

        // Add keyboard navigation for suggestions
        searchInput.addEventListener('keydown', (e) => {
            this.handleSearchKeyNavigation(e);
        });

        // Add to favorites
        document.getElementById('add-favorite').addEventListener('click', () => {
            this.addToFavorites();
        });

        // Close suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                this.hideSuggestions();
            }
        });
    }

    // Enhanced search input handling with real-time autocomplete
    async handleSearchInput(value) {
        if (value.length < 2) {
            this.hideSuggestions();
            return;
        }

        // Check cache first
        if (this.searchCache.has(value.toLowerCase())) {
            this.showSuggestions(this.searchCache.get(value.toLowerCase()));
            return;
        }

        try {
            // Get real city suggestions from OpenWeatherMap Geocoding API
            const response = await fetch(
                `${this.geoApiUrl}/direct?q=${encodeURIComponent(value)}&limit=5&appid=${this.apiKey}`
            );

            if (response.ok) {
                const cities = await response.json();
                const suggestions = cities.map(city => ({
                    name: city.name,
                    country: city.country,
                    state: city.state,
                    lat: city.lat,
                    lon: city.lon,
                    displayName: `${city.name}${city.state ? ', ' + city.state : ''}, ${city.country}`
                }));

                // Cache the results
                this.searchCache.set(value.toLowerCase(), suggestions);
                this.showSuggestions(suggestions);
            } else {
                // Fallback to local suggestions
                this.showLocalSuggestions(value);
            }
        } catch (error) {
            console.warn('Geocoding API error:', error);
            this.showLocalSuggestions(value);
        }
    }

    // Fallback local suggestions
    showLocalSuggestions(value) {
        const commonCities = [
            { name: 'New York', country: 'US', displayName: 'New York, US' },
            { name: 'London', country: 'GB', displayName: 'London, GB' },
            { name: 'Paris', country: 'FR', displayName: 'Paris, FR' },
            { name: 'Tokyo', country: 'JP', displayName: 'Tokyo, JP' },
            { name: 'Sydney', country: 'AU', displayName: 'Sydney, AU' },
            { name: 'Berlin', country: 'DE', displayName: 'Berlin, DE' },
            { name: 'Moscow', country: 'RU', displayName: 'Moscow, RU' },
            { name: 'Beijing', country: 'CN', displayName: 'Beijing, CN' },
            { name: 'Jakarta', country: 'ID', displayName: 'Jakarta, ID' },
            { name: 'Singapore', country: 'SG', displayName: 'Singapore, SG' }
        ];

        const historySuggestions = this.searchHistory
            .filter(city => city.toLowerCase().includes(value.toLowerCase()))
            .map(city => ({ name: city, displayName: city, isHistory: true }));

        const citySuggestions = commonCities
            .filter(city => city.name.toLowerCase().includes(value.toLowerCase()));

        const allSuggestions = [...historySuggestions, ...citySuggestions]
            .filter((item, index, arr) => 
                arr.findIndex(i => i.displayName === item.displayName) === index
            )
            .slice(0, 5);

        this.showSuggestions(allSuggestions);
    }

    // Enhanced show suggestions with better UI
    showSuggestions(suggestions) {
        const suggestionsEl = document.getElementById('search-suggestions');
        
        if (suggestions.length === 0) {
            this.hideSuggestions();
            return;
        }

        suggestionsEl.innerHTML = suggestions.map((suggestion, index) => `
            <div class="suggestion-item" role="option" tabindex="0" data-index="${index}">
                <div class="suggestion-main">${suggestion.displayName}</div>
                ${suggestion.isHistory ? '<small class="suggestion-label">Recent</small>' : ''}
                ${suggestion.lat ? `<small class="suggestion-coords">${suggestion.lat.toFixed(2)}, ${suggestion.lon.toFixed(2)}</small>` : ''}
            </div>
        `).join('');

        suggestionsEl.style.display = 'block';

        // Add click and keyboard listeners
        suggestionsEl.querySelectorAll('.suggestion-item').forEach((item, index) => {
            const suggestion = suggestions[index];
            
            item.addEventListener('click', () => {
                document.getElementById('search-input').value = suggestion.name;
                if (suggestion.lat && suggestion.lon) {
                    this.getWeatherByCoords(suggestion.lat, suggestion.lon, suggestion.name);
                } else {
                    this.searchWeather(suggestion.name);
                }
            });

            item.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    document.getElementById('search-input').value = suggestion.name;
                    if (suggestion.lat && suggestion.lon) {
                        this.getWeatherByCoords(suggestion.lat, suggestion.lon, suggestion.name);
                    } else {
                        this.searchWeather(suggestion.name);
                    }
                }
            });
        });
    }

    // Keyboard navigation for search suggestions
    handleSearchKeyNavigation(e) {
        const suggestions = document.querySelectorAll('.suggestion-item');
        if (suggestions.length === 0) return;

        const currentFocused = document.querySelector('.suggestion-item:focus');
        let nextIndex = -1;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!currentFocused) {
                nextIndex = 0;
            } else {
                const currentIndex = parseInt(currentFocused.dataset.index);
                nextIndex = (currentIndex + 1) % suggestions.length;
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!currentFocused) {
                nextIndex = suggestions.length - 1;
            } else {
                const currentIndex = parseInt(currentFocused.dataset.index);
                nextIndex = currentIndex === 0 ? suggestions.length - 1 : currentIndex - 1;
            }
        }

        if (nextIndex >= 0) {
            suggestions[nextIndex].focus();
        }
    }

    // Hide search suggestions
    hideSuggestions() {
        document.getElementById('search-suggestions').style.display = 'none';
    }

    // Get user's current location and weather
    async getCurrentLocationWeather() {
        if (!navigator.geolocation) {
            this.showError('Geolocation is not supported by this browser');
            this.showDemoData();
            return;
        }

        this.showLoading();

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    await this.getWeatherByCoords(latitude, longitude, 'Your Location');
                } catch (error) {
                    console.error('Location weather error:', error);
                    this.showError('Failed to get weather data for your location');
                    this.showDemoData();
                }
            },
            (error) => {
                console.warn('Geolocation error:', error);
                this.hideLoading();
                this.showError('Unable to get your location. Please search for a city instead.');
                this.showDemoData();
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000 // 5 minutes
            }
        );
    }

    // Get weather by coordinates using real API
    async getWeatherByCoords(lat, lon, locationName = null) {
        try {
            console.log(`Fetching weather for coordinates: ${lat}, ${lon}`);
            
            const weatherResponse = await fetch(
                `${this.baseUrl}/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=${this.units}`
            );
            
            if (!weatherResponse.ok) {
                throw new Error(`Weather API error: ${weatherResponse.status} ${weatherResponse.statusText}`);
            }
            
            const weatherData = await weatherResponse.json();
            console.log('Weather data received:', weatherData);
            
            // Override name if provided
            if (locationName) {
                weatherData.locationDisplayName = locationName;
            }
            
            this.currentWeatherData = weatherData;
            this.displayCurrentWeather(weatherData);
            
            // Get forecast data
            const forecastResponse = await fetch(
                `${this.baseUrl}/forecast?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=${this.units}`
            );
            
            if (forecastResponse.ok) {
                const forecastData = await forecastResponse.json();
                console.log('Forecast data received:', forecastData);
                this.currentForecastData = forecastData;
                this.displayForecast(forecastData);
            } else {
                console.warn('Failed to fetch forecast data');
                this.displayDemoForecast();
            }
            
            this.hideLoading();
        } catch (error) {
            console.error('API Error:', error);
            this.hideLoading();
            this.showError('Failed to fetch weather data: ' + error.message);
            this.showDemoData();
        }
    }

    // Search for weather by city name using real API
    async searchWeather(city) {
        if (!city.trim()) return;

        this.showLoading();
        this.hideSuggestions();

        try {
            console.log(`Searching weather for city: ${city}`);
            
            const weatherResponse = await fetch(
                `${this.baseUrl}/weather?q=${encodeURIComponent(city)}&appid=${this.apiKey}&units=${this.units}`
            );
            
            if (!weatherResponse.ok) {
                if (weatherResponse.status === 404) {
                    throw new Error('City not found. Please check the spelling and try again.');
                }
                throw new Error(`Weather API error: ${weatherResponse.status} ${weatherResponse.statusText}`);
            }
            
            const weatherData = await weatherResponse.json();
            console.log('Search weather data received:', weatherData);
            
            this.currentWeatherData = weatherData;
            this.displayCurrentWeather(weatherData);
            
            // Add to search history
            this.addToSearchHistory(city);
            
            // Get forecast data
            const forecastResponse = await fetch(
                `${this.baseUrl}/forecast?q=${encodeURIComponent(city)}&appid=${this.apiKey}&units=${this.units}`
            );
            
            if (forecastResponse.ok) {
                const forecastData = await forecastResponse.json();
                this.currentForecastData = forecastData;
                this.displayForecast(forecastData);
            } else {
                console.warn('Failed to fetch forecast data for search');
                this.displayDemoForecast();
            }
            
            this.hideLoading();
        } catch (error) {
            console.error('Search API Error:', error);
            this.hideLoading();
            this.showError(error.message);
        }
    }

    // Enhanced display forecast with detailed daily data and clickable items
    displayForecast(data) {
        const forecastEl = document.getElementById('forecast-grid');
        
        // Group forecast data by day and calculate daily high/low
        const dailyForecasts = this.groupForecastByDay(data.list);
        
        const forecastHTML = dailyForecasts.map((dayData, index) => {
            const date = new Date(dayData.dt * 1000);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            
            return `
                <article class="forecast-card" tabindex="0" role="button" 
                         aria-label="Weather forecast for ${dayName}, ${monthDay}. Click for details"
                         data-forecast-index="${index}"
                         onclick="weatherApp.showForecastDetails(${index})">
                    <div class="forecast-date">${dayName}</div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.5rem;">${monthDay}</div>
                    <img class="weather-icon" 
                         src="https://openweathermap.org/img/wn/${dayData.weather[0].icon}.png"
                         alt="${dayData.weather[0].main}">
                    <div class="forecast-temps">
                        <span class="temp-high" title="High temperature">${Math.round(dayData.tempMax)}°</span>
                        <span class="temp-low" title="Low temperature">${Math.round(dayData.tempMin)}°</span>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.5rem; text-align: center;">
                        ${dayData.weather[0].main}
                    </div>
                    <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 0.25rem; text-align: center;">
                        💧 ${dayData.avgHumidity}% • 💨 ${dayData.avgWind.toFixed(1)} ${this.units === 'metric' ? 'm/s' : 'mph'}
                    </div>
                </article>
            `;
        }).join('');

        forecastEl.innerHTML = forecastHTML;
        document.getElementById('forecast-section').style.display = 'block';
        
        // Store daily forecasts for detail view
        this.dailyForecasts = dailyForecasts;
    }

    // Group forecast data by day and calculate daily stats
    groupForecastByDay(forecastList) {
        const dailyData = new Map();
        
        forecastList.forEach(item => {
            const date = new Date(item.dt * 1000);
            const dayKey = date.toDateString();
            
            if (!dailyData.has(dayKey)) {
                dailyData.set(dayKey, {
                    dt: item.dt,
                    date: date,
                    temps: [],
                    conditions: [],
                    humidity: [],
                    wind: [],
                    pressure: [],
                    items: []
                });
            }
            
            const dayData = dailyData.get(dayKey);
            dayData.temps.push(item.main.temp);
            dayData.conditions.push(item.weather[0]);
            dayData.humidity.push(item.main.humidity);
            dayData.wind.push(item.wind.speed);
            dayData.pressure.push(item.main.pressure);
            dayData.items.push(item);
        });
        
        // Convert to array and calculate stats
        return Array.from(dailyData.values()).slice(0, 5).map(dayData => {
            const temps = dayData.temps;
            const mostFrequentCondition = this.getMostFrequentCondition(dayData.conditions);
            
            return {
                dt: dayData.dt,
                date: dayData.date,
                tempMax: Math.max(...temps),
                tempMin: Math.min(...temps),
                avgTemp: temps.reduce((a, b) => a + b, 0) / temps.length,
                weather: [mostFrequentCondition],
                avgHumidity: Math.round(dayData.humidity.reduce((a, b) => a + b, 0) / dayData.humidity.length),
                avgWind: dayData.wind.reduce((a, b) => a + b, 0) / dayData.wind.length,
                avgPressure: Math.round(dayData.pressure.reduce((a, b) => a + b, 0) / dayData.pressure.length),
                hourlyItems: dayData.items
            };
        });
    }

    // Get most frequent weather condition for the day
    getMostFrequentCondition(conditions) {
        const conditionCounts = conditions.reduce((acc, condition) => {
            const key = condition.main;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
        
        const mostFrequent = Object.keys(conditionCounts).reduce((a, b) => 
            conditionCounts[a] > conditionCounts[b] ? a : b
        );
        
        return conditions.find(c => c.main === mostFrequent);
    }

    // Show detailed forecast information in modal/expanded view
    showForecastDetails(dayIndex) {
        if (!this.dailyForecasts || !this.dailyForecasts[dayIndex]) return;
        
        const dayData = this.dailyForecasts[dayIndex];
        const date = dayData.date;
        
        // Create modal content
        const modalContent = `
            <div class="forecast-modal-overlay" onclick="weatherApp.closeForecastDetails()">
                <div class="forecast-modal" onclick="event.stopPropagation()">
                    <div class="forecast-modal-header">
                        <h3>${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
                        <button class="modal-close" onclick="weatherApp.closeForecastDetails()">×</button>
                    </div>
                    <div class="forecast-modal-body">
                        <div class="forecast-summary">
                            <img class="weather-icon" src="https://openweathermap.org/img/wn/${dayData.weather[0].icon}@2x.png" alt="${dayData.weather[0].main}">
                            <div class="temp-range">
                                <span class="temp-high-large">${Math.round(dayData.tempMax)}°</span>
                                <span class="temp-divider">/</span>
                                <span class="temp-low-large">${Math.round(dayData.tempMin)}°</span>
                            </div>
                            <div class="condition-desc">${dayData.weather[0].description.charAt(0).toUpperCase() + dayData.weather[0].description.slice(1)}</div>
                        </div>
                        
                        <div class="forecast-details-grid">
                            <div class="detail-item">
                                <div class="detail-label">Average Temperature</div>
                                <div class="detail-value">${Math.round(dayData.avgTemp)}°${this.units === 'metric' ? 'C' : 'F'}</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Humidity</div>
                                <div class="detail-value">${dayData.avgHumidity}%</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Wind Speed</div>
                                <div class="detail-value">${dayData.avgWind.toFixed(1)} ${this.units === 'metric' ? 'm/s' : 'mph'}</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Pressure</div>
                                <div class="detail-value">${dayData.avgPressure} hPa</div>
                            </div>
                        </div>
                        
                        <div class="hourly-forecast">
                            <h4>Hourly Forecast</h4>
                            <div class="hourly-grid">
                                ${dayData.hourlyItems.map(item => {
                                    const time = new Date(item.dt * 1000);
                                    return `
                                        <div class="hourly-item">
                                            <div class="hourly-time">${time.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })}</div>
                                            <img class="hourly-icon" src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png" alt="${item.weather[0].main}">
                                            <div class="hourly-temp">${Math.round(item.main.temp)}°</div>
                                            <div class="hourly-desc">${item.weather[0].main}</div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add to body
        document.body.insertAdjacentHTML('beforeend', modalContent);
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    // Close forecast details modal
    closeForecastDetails() {
        const modal = document.querySelector('.forecast-modal-overlay');
        if (modal) {
            modal.remove();
            document.body.style.overflow = '';
        }
    }

    // Show demo data for demonstration (fallback when API fails)
    showDemoData() {
        console.log('Showing demo data as fallback');
        
        const demoData = {
            name: "Demo City",
            sys: { country: "XX" },
            main: {
                temp: 22,
                feels_like: 24,
                humidity: 65,
                pressure: 1013
            },
            weather: [{
                main: "Clouds",
                description: "scattered clouds",
                icon: "03d"
            }],
            wind: { speed: 3.2 },
            visibility: 10000
        };

        this.currentWeatherData = demoData;
        this.displayCurrentWeather(demoData);
        this.displayDemoForecast();
        
        // Add some demo favorites if none exist
        if (this.favorites.length === 0) {
            this.favorites = [
                { name: "London", country: "GB", temp: 18, condition: "Rain" },
                { name: "Tokyo", country: "JP", temp: 26, condition: "Clear" },
                { name: "Sydney", country: "AU", temp: 20, condition: "Clouds" }
            ];
            this.storeData('favorites', this.favorites);
            this.renderFavorites();
        }
        
        this.showError('Using demo data. Check your internet connection or API key.');
    }

    // Display demo forecast data
    displayDemoForecast() {
        const now = Date.now() / 1000;
        const demoForecast = [];
        
        for (let i = 1; i <= 5; i++) {
            demoForecast.push({
                dt: now + (86400 * i),
                weather: [{ main: ["Rain", "Clear", "Clouds", "Snow"][Math.floor(Math.random() * 4)], icon: "03d" }],
                main: { 
                    temp_max: Math.floor(Math.random() * 15) + 20,
                    temp_min: Math.floor(Math.random() * 10) + 10
                }
            });
        }

        this.displayForecast({ list: demoForecast });
    }

    // Display current weather data
    displayCurrentWeather(data) {
        this.hideLoading();
        this.hideError();

        console.log('Displaying weather data:', data);

        const locationName = data.locationDisplayName || `${data.name}, ${data.sys.country}`;
        document.getElementById('current-location').textContent = locationName;
        
        document.getElementById('current-temp').textContent = 
            `${Math.round(data.main.temp)}°${this.units === 'metric' ? 'C' : 'F'}`;
        
        document.getElementById('current-condition').textContent = 
            data.weather[0].description.charAt(0).toUpperCase() + 
            data.weather[0].description.slice(1);

        const iconEl = document.getElementById('current-icon');
        iconEl.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
        iconEl.alt = data.weather[0].description;

        // Weather details
        const detailsEl = document.getElementById('weather-details');
        detailsEl.innerHTML = `
            <div class="detail-item">
                <div class="detail-label">Feels like</div>
                <div class="detail-value">${Math.round(data.main.feels_like)}°</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Humidity</div>
                <div class="detail-value">${data.main.humidity}%</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Wind</div>
                <div class="detail-value">${data.wind.speed.toFixed(1)} ${this.units === 'metric' ? 'm/s' : 'mph'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Pressure</div>
                <div class="detail-value">${data.main.pressure} hPa</div>
            </div>
        `;

        document.getElementById('current-weather-section').style.display = 'block';
    }

    // Enhanced search history management
    addToSearchHistory(city) {
        const normalizedCity = city.trim();
        
        // Remove if already exists (to move to top)
        this.searchHistory = this.searchHistory.filter(item => 
            item.toLowerCase() !== normalizedCity.toLowerCase()
        );
        
        // Add to beginning
        this.searchHistory.unshift(normalizedCity);
        
        // Keep only last 10 searches
        this.searchHistory = this.searchHistory.slice(0, 10);
        
        this.storeData('searchHistory', this.searchHistory);
        this.renderSearchHistory();
    }

    // Render search history (can be shown in a dropdown or sidebar)
    renderSearchHistory() {
        // This could be used to display recent searches in the UI
        console.log('Search history updated:', this.searchHistory);
    }

    // Clear search history
    clearSearchHistory() {
        this.searchHistory = [];
        this.storeData('searchHistory', this.searchHistory);
        this.renderSearchHistory();
        this.showSuccess('Search history cleared');
    }

    // Add current location to favorites
    addToFavorites() {
        if (!this.currentWeatherData) {
            this.showError('No weather data available to add to favorites');
            return;
        }

        const favorite = {
            name: this.currentWeatherData.name,
            country: this.currentWeatherData.sys.country,
            temp: Math.round(this.currentWeatherData.main.temp),
            condition: this.currentWeatherData.weather[0].main
        };

        // Check if already in favorites
        if (this.favorites.some(fav => fav.name.toLowerCase() === favorite.name.toLowerCase())) {
            this.showError('Location is already in favorites');
            return;
        }

        this.favorites.push(favorite);
        this.storeData('favorites', this.favorites);
        this.renderFavorites();
        
        // Show success message
        this.showSuccess('Location added to favorites!');
    }

    // Remove from favorites
    removeFromFavorites(index) {
        if (index >= 0 && index < this.favorites.length) {
            this.favorites.splice(index, 1);
            this.storeData('favorites', this.favorites);
            this.renderFavorites();
        }
    }

    // Render favorites
    renderFavorites() {
        const favoritesEl = document.getElementById('favorites-grid');
        
        if (this.favorites.length === 0) {
            favoritesEl.innerHTML = '<p class="empty-favorites">No favorite locations yet. Add some cities to see them here!</p>';
            return;
        }

        const favoritesHTML = this.favorites.map((favorite, index) => `
            <article class="favorite-card" tabindex="0" role="button" 
                     aria-label="Weather for ${favorite.name}, ${favorite.country}"
                     onclick="weatherApp.searchWeather('${favorite.name}')">
                <button class="favorite-remove" 
                        onclick="event.stopPropagation(); weatherApp.removeFromFavorites(${index})"
                        aria-label="Remove ${favorite.name} from favorites">×</button>
                <div class="favorite-name">${favorite.name}, ${favorite.country}</div>
                <div class="favorite-temp">${favorite.temp}°${this.units === 'metric' ? 'C' : 'F'}</div>
                <div class="favorite-condition">${favorite.condition}</div>
            </article>
        `).join('');

        favoritesEl.innerHTML = favoritesHTML;
    }

    // Toggle theme
    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        this.applyTheme(this.theme);
        this.storeData('theme', this.theme);
    }

    // Apply theme
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        
        const themeIcon = document.getElementById('theme-icon');
        const themeText = document.getElementById('theme-text');
        
        if (theme === 'dark') {
            themeIcon.textContent = '☀️';
            themeText.textContent = 'Light';
        } else {
            themeIcon.textContent = '🌙';
            themeText.textContent = 'Dark';
        }
    }

    // Toggle temperature units
    toggleUnits() {
        const oldUnits = this.units;
        this.units = this.units === 'metric' ? 'imperial' : 'metric';
        this.updateUnitsDisplay();
        this.storeData('units', this.units);
        
        // If we have real weather data and just changed units, refetch with new units
        if (this.currentWeatherData && this.currentWeatherData.name !== 'Demo City') {
            if (this.currentWeatherData.coord) {
                // Refetch by coordinates
                this.getWeatherByCoords(this.currentWeatherData.coord.lat, this.currentWeatherData.coord.lon);
            } else {
                // Refetch by city name
                this.searchWeather(this.currentWeatherData.name);
            }
        } else if (this.currentWeatherData) {
            // For demo data, just convert the display
            if (this.units === 'imperial' && oldUnits === 'metric') {
                this.currentWeatherData.main.temp = this.celsiusToFahrenheit(this.currentWeatherData.main.temp);
                this.currentWeatherData.main.feels_like = this.celsiusToFahrenheit(this.currentWeatherData.main.feels_like);
            } else if (this.units === 'metric' && oldUnits === 'imperial') {
                this.currentWeatherData.main.temp = this.fahrenheitToCelsius(this.currentWeatherData.main.temp);
                this.currentWeatherData.main.feels_like = this.fahrenheitToCelsius(this.currentWeatherData.main.feels_like);
            }
            
            this.displayCurrentWeather(this.currentWeatherData);
        }
    }

    // Update units display
    updateUnitsDisplay() {
        const unitsText = document.getElementById('units-text');
        unitsText.textContent = this.units === 'metric' ? '°F' : '°C';
    }

    // Temperature conversion utilities
    celsiusToFahrenheit(celsius) {
        return (celsius * 9/5) + 32;
    }

    fahrenheitToCelsius(fahrenheit) {
        return (fahrenheit - 32) * 5/9;
    }

    // Show loading state
    showLoading() {
        document.getElementById('loading').style.display = 'block';
        this.hideError();
    }

    // Hide loading state
    hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }

    // Show error message
    showError(message) {
        const errorEl = document.getElementById('error-message');
        errorEl.textContent = message;
        errorEl.style.display = 'block';
        this.hideLoading();

        // Auto-hide error after 8 seconds
        setTimeout(() => {
            this.hideError();
        }, 8000);
    }

    // Hide error message
    hideError() {
        document.getElementById('error-message').style.display = 'none';
    }

    // Show success message
    showSuccess(message) {
        // Create temporary success message
        const successEl = document.createElement('div');
        successEl.className = 'error'; // Reuse error styling but with success colors
        successEl.style.background = '#d1fae5';
        successEl.style.color = '#065f46';
        successEl.style.borderColor = '#a7f3d0';
        successEl.textContent = message;
        
        // Insert after search section
        const searchSection = document.querySelector('.search-section');
        if (searchSection) {
            searchSection.insertAdjacentElement('afterend', successEl);
        }
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            if (successEl.parentNode) {
                successEl.remove();
            }
        }, 3000);
    }

    // Local storage utilities with proper error handling
    storeData(key, data) {
        try {
            localStorage.setItem(`weather_${key}`, JSON.stringify(data));
        } catch (error) {
            console.warn('Failed to store data in localStorage:', error);
            // Fallback to memory storage
            if (!this.storage) this.storage = {};
            this.storage[key] = data;
        }
    }

    getStoredData(key) {
        try {
            const data = localStorage.getItem(`weather_${key}`);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.warn('Failed to retrieve data from localStorage:', error);
            // Fallback to memory storage
            return this.storage ? this.storage[key] : null;
        }
    }

    // Utility function for debouncing
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Handle online/offline status
    setupNetworkMonitoring() {
        window.addEventListener('online', () => {
            console.log('Back online');
            this.hideError();
        });

        window.addEventListener('offline', () => {
            console.log('Gone offline');
            this.showError('You are offline. Weather data may not be current.');
        });
    }

    // Enhanced keyboard navigation support
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // ESC to close suggestions and modals
            if (e.key === 'Escape') {
                this.hideSuggestions();
                this.closeForecastDetails();
            }
            
            // Arrow keys for forecast navigation
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                const focusedElement = document.activeElement;
                if (focusedElement && focusedElement.classList.contains('forecast-card')) {
                    const cards = document.querySelectorAll('.forecast-card');
                    const currentIndex = Array.from(cards).indexOf(focusedElement);
                    let nextIndex;
                    
                    if (e.key === 'ArrowLeft') {
                        nextIndex = currentIndex > 0 ? currentIndex - 1 : cards.length - 1;
                    } else {
                        nextIndex = currentIndex < cards.length - 1 ? currentIndex + 1 : 0;
                    }
                    
                    if (cards[nextIndex]) {
                        cards[nextIndex].focus();
                        e.preventDefault();
                    }
                }
            }

            // Enter key to trigger forecast details
            if (e.key === 'Enter') {
                const focusedElement = document.activeElement;
                if (focusedElement && focusedElement.classList.contains('forecast-card')) {
                    const index = parseInt(focusedElement.dataset.forecastIndex);
                    if (!isNaN(index)) {
                        this.showForecastDetails(index);
                    }
                }
            }
        });
    }

    // Export weather data (bonus feature)
    exportWeatherData() {
        if (!this.currentWeatherData) {
            this.showError('No weather data to export');
            return;
        }

        const exportData = {
            location: `${this.currentWeatherData.name}, ${this.currentWeatherData.sys.country}`,
            timestamp: new Date().toISOString(),
            current: this.currentWeatherData,
            forecast: this.currentForecastData,
            favorites: this.favorites,
            searchHistory: this.searchHistory
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `weather-data-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        this.showSuccess('Weather data exported successfully!');
    }

    // Share weather data (bonus feature)
    async shareWeather() {
        if (!this.currentWeatherData) {
            this.showError('No weather data to share');
            return;
        }

        const shareText = `Weather in ${this.currentWeatherData.name}: ${Math.round(this.currentWeatherData.main.temp)}°${this.units === 'metric' ? 'C' : 'F'}, ${this.currentWeatherData.weather[0].description}`;
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Weather Update',
                    text: shareText,
                    url: window.location.href
                });
            } catch (error) {
                console.log('Error sharing:', error);
                this.copyToClipboard(shareText);
            }
        } else {
            this.copyToClipboard(shareText);
        }
    }

    // Copy text to clipboard
    copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                this.showSuccess('Weather info copied to clipboard!');
            });
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showSuccess('Weather info copied to clipboard!');
        }
    }
}

// Initialize the weather application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Weather Dashboard...');
    window.weatherApp = new WeatherDashboard();
});

// Export for module use (if using modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WeatherDashboard;
}
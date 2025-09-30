// Weather Dashboard JavaScript
class WeatherDashboard {
    constructor() {
        // API Configuration
        this.API_KEY = '80765d155391986ec6d4eba475e96e4d';
        this.BASE_URL = 'https://api.openweathermap.org/data/2.5';
        this.GEO_URL = 'https://api.openweathermap.org/geo/1.0';
        
        // State management
        this.currentWeatherData = null;
        this.forecastData = null;
        this.currentLocation = null;
        this.isLoading = false;
        this.searchTimeout = null;
        
        // Settings
        this.settings = {
            units: 'metric', // metric, imperial
            theme: 'light',  // light, dark
            language: 'en'
        };
        
        // DOM elements
        this.elements = {};
        
        // Initialize the application
        this.init();
    }
    
    async init() {
        try {
            this.initElements();
            this.loadSettings();
            this.bindEvents();
            this.loadFavorites();
            this.loadRecentSearches();
            this.initTestGauge();
            
            // Try to get user's location
            await this.getCurrentLocationWeather();
        } catch (error) {
            console.error('Error initializing weather dashboard:', error);
            this.showError('Failed to initialize weather dashboard');
        }
    }
    
    initElements() {
        // Weather background elements
        this.elements.weatherBackground = document.getElementById('weather-background');
        this.elements.rainContainer = document.getElementById('rain-container');
        this.elements.snowContainer = document.getElementById('snow-container');
        this.elements.cloudsContainer = document.getElementById('clouds-container');
        this.elements.shimmerContainer = document.getElementById('shimmer-container');
        this.elements.thunderContainer = document.getElementById('thunder-container');
        this.elements.mountainLandscape = document.getElementById('mountain-landscape');
        
        // Weather card background elements
        this.elements.weatherCardBackground = document.getElementById('weather-card-background');
        this.elements.cardRainContainer = document.getElementById('card-rain-container');
        this.elements.cardCloudsContainer = document.getElementById('card-clouds-container');
        this.elements.cardSnowContainer = document.getElementById('card-snow-container');
        this.elements.cardSunContainer = document.getElementById('card-sun-container');
        
        // Search elements
        this.elements.searchInput = document.getElementById('search-input');
        this.elements.searchBtn = document.getElementById('search-btn');
        this.elements.searchSuggestions = document.getElementById('search-suggestions');
        this.elements.getLocationBtn = document.getElementById('get-location');
        
        // Weather alert elements
        this.elements.weatherAlertCard = document.getElementById('weather-alert-card');
        this.elements.alertToggle = document.getElementById('alert-toggle');
        this.elements.recentSearches = document.getElementById('recent-searches');
        this.elements.recentList = document.getElementById('recent-list');
        
        // UI controls
        this.elements.themeToggle = document.getElementById('theme-toggle');
        this.elements.unitToggle = document.getElementById('unit-toggle');
        
        // Weather display elements
        this.elements.loadingSpinner = document.getElementById('loading-spinner');
        this.elements.errorMessage = document.getElementById('error-message');
        this.elements.errorText = document.getElementById('error-text');
        this.elements.retryBtn = document.getElementById('retry-btn');
        this.elements.currentWeatherCard = document.getElementById('current-weather-card');
        
        // Current weather details
        this.elements.cityName = document.getElementById('city-name');
        this.elements.countryName = document.getElementById('country-name');
        this.elements.dateTime = document.getElementById('date-time');
        this.elements.addFavorite = document.getElementById('add-favorite');
        this.elements.weatherIconMain = document.getElementById('weather-icon-main');
        this.elements.temperatureMain = document.getElementById('temperature-main');
        this.elements.feelsLike = document.getElementById('feels-like');
        this.elements.weatherDescription = document.getElementById('weather-description');
        this.elements.humidity = document.getElementById('humidity');
        this.elements.windSpeed = document.getElementById('wind-speed');
        this.elements.visibility = document.getElementById('visibility');
        this.elements.pressure = document.getElementById('pressure');
        this.elements.sunrise = document.getElementById('sunrise');
        this.elements.sunset = document.getElementById('sunset');
        
        // Forecast elements
        this.elements.hourlyContainer = document.getElementById('hourly-container');
        this.elements.forecastContainer = document.getElementById('forecast-container');
        
        // Weather Chart elements
        this.elements.hourlyChart = document.getElementById('hourly-weather-chart');
        this.elements.chartOverlay = document.getElementById('chart-overlay');
        
        // Favorites
        this.elements.favoritesContainer = document.getElementById('favorites-container');
        this.elements.noFavorites = document.getElementById('no-favorites');
        
        // Additional info
        this.elements.aqiValue = document.getElementById('aqi-value');
        this.elements.aqiStatus = document.getElementById('aqi-status');
        this.elements.uvValue = document.getElementById('uv-value');
        this.elements.uvStatus = document.getElementById('uv-status');
        
        // Modal
        this.elements.modal = document.getElementById('weather-alert-modal');
        this.elements.modalClose = document.getElementById('modal-close');
        this.elements.alertTitle = document.getElementById('alert-title');
        this.elements.alertMessage = document.getElementById('alert-message');
    }
    
    bindEvents() {
        // Search functionality
        this.elements.searchInput.addEventListener('input', this.handleSearchInput.bind(this));
        this.elements.searchInput.addEventListener('keydown', this.handleSearchKeydown.bind(this));
        this.elements.searchBtn.addEventListener('click', this.handleSearch.bind(this));
        this.elements.getLocationBtn.addEventListener('click', this.getCurrentLocationWeather.bind(this));
        
        // UI controls
        this.elements.themeToggle.addEventListener('click', this.toggleTheme.bind(this));
        this.elements.unitToggle.addEventListener('click', this.toggleUnits.bind(this));
        
        // Weather alert events
        if (this.elements.alertToggle) {
            this.elements.alertToggle.addEventListener('click', this.toggleWeatherAlert.bind(this));
        }
        
        // Other buttons
        this.elements.retryBtn.addEventListener('click', this.handleRetry.bind(this));
        this.elements.addFavorite.addEventListener('click', this.toggleFavorite.bind(this));
        
        // Modal
        this.elements.modalClose.addEventListener('click', this.closeModal.bind(this));
        this.elements.modal.addEventListener('click', (e) => {
            if (e.target === this.elements.modal) {
                this.closeModal();
            }
        });
        
        // Document events
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                this.hideSuggestions();
            }
        });
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideSuggestions();
                this.closeModal();
            }
        });
        
        // Update time every minute
        setInterval(() => {
            this.updateDateTime();
        }, 60000);
        
        // Handle window resize for weather animations
        window.addEventListener('resize', this.debounce(() => {
            this.handleWindowResize();
        }, 300));
    }
    
    // API Methods
    async fetchWeatherData(lat, lon) {
        const url = `${this.BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${this.API_KEY}&units=${this.settings.units}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Weather API error: ${response.status}`);
        }
        
        return response.json();
    }
    
    async fetchForecastData(lat, lon) {
        const url = `${this.BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${this.API_KEY}&units=${this.settings.units}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Forecast API error: ${response.status}`);
        }
        
        return response.json();
    }
    
    async fetchCityCoordinates(cityName) {
        const url = `${this.GEO_URL}/direct?q=${encodeURIComponent(cityName)}&limit=5&appid=${this.API_KEY}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Geocoding API error: ${response.status}`);
        }
        
        return response.json();
    }
    
    async fetchAirQuality(lat, lon) {
        try {
            const url = `${this.BASE_URL}/air_pollution?lat=${lat}&lon=${lon}&appid=${this.API_KEY}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Air quality API error: ${response.status}`);
            }
            
            return response.json();
        } catch (error) {
            console.warn('Air quality data unavailable:', error);
            return null;
        }
    }
    
    async fetchUVIndex(lat, lon) {
        try {
            // Using the onecall API for UV index (requires subscription for current version)
            // Fallback to mock data for demo purposes
            return {
                value: Math.floor(Math.random() * 11),
                status: ['Low', 'Low', 'Low', 'Moderate', 'Moderate', 'High', 'High', 'Very High', 'Very High', 'Extreme', 'Extreme']
            };
        } catch (error) {
            console.warn('UV index data unavailable:', error);
            return null;
        }
    }
    
    // Search functionality
    handleSearchInput(e) {
        const query = e.target.value.trim();
        
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        if (query.length < 2) {
            this.hideSuggestions();
            return;
        }
        
        this.searchTimeout = setTimeout(() => {
            this.showSearchSuggestions(query);
        }, 300);
    }
    
    handleSearchKeydown(e) {
        const suggestions = this.elements.searchSuggestions.querySelectorAll('.suggestion-item');
        const activeIndex = Array.from(suggestions).findIndex(item => item.classList.contains('active'));
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                const nextIndex = activeIndex < suggestions.length - 1 ? activeIndex + 1 : 0;
                this.setActiveSuggestion(suggestions, nextIndex);
                break;
            case 'ArrowUp':
                e.preventDefault();
                const prevIndex = activeIndex > 0 ? activeIndex - 1 : suggestions.length - 1;
                this.setActiveSuggestion(suggestions, prevIndex);
                break;
            case 'Enter':
                e.preventDefault();
                if (activeIndex >= 0) {
                    suggestions[activeIndex].click();
                } else {
                    this.handleSearch();
                }
                break;
            case 'Escape':
                this.hideSuggestions();
                break;
        }
    }
    
    setActiveSuggestion(suggestions, index) {
        suggestions.forEach((item, i) => {
            item.classList.toggle('active', i === index);
        });
        
        if (suggestions[index]) {
            this.elements.searchInput.value = suggestions[index].textContent;
        }
    }
    
    async showSearchSuggestions(query) {
        try {
            const cities = await this.fetchCityCoordinates(query);
            
            if (cities.length === 0) {
                this.hideSuggestions();
                return;
            }
            
            const suggestionsHTML = cities.map(city => {
                const displayName = `${city.name}, ${city.state || ''} ${city.country}`.replace(/, ,/, ',');
                return `<div class="suggestion-item" data-lat="${city.lat}" data-lon="${city.lon}" data-name="${displayName}">${displayName}</div>`;
            }).join('');
            
            this.elements.searchSuggestions.innerHTML = suggestionsHTML;
            this.elements.searchSuggestions.classList.add('show');
            
            // Add click handlers to suggestions
            this.elements.searchSuggestions.querySelectorAll('.suggestion-item').forEach(item => {
                item.addEventListener('click', () => {
                    const lat = parseFloat(item.dataset.lat);
                    const lon = parseFloat(item.dataset.lon);
                    const name = item.dataset.name;
                    
                    this.elements.searchInput.value = name;
                    this.hideSuggestions();
                    this.fetchAndDisplayWeather(lat, lon, name);
                });
            });
        } catch (error) {
            console.error('Error fetching search suggestions:', error);
            this.hideSuggestions();
        }
    }
    
    hideSuggestions() {
        this.elements.searchSuggestions.classList.remove('show');
        this.elements.searchSuggestions.innerHTML = '';
    }
    
    async handleSearch() {
        const query = this.elements.searchInput.value.trim();
        
        if (!query) {
            this.showError('Please enter a city name');
            return;
        }
        
        try {
            this.showLoading();
            const cities = await this.fetchCityCoordinates(query);
            
            if (cities.length === 0) {
                throw new Error('City not found. Please check the spelling and try again.');
            }
            
            const city = cities[0];
            const displayName = `${city.name}, ${city.state || ''} ${city.country}`.replace(/, ,/, ',');
            
            await this.fetchAndDisplayWeather(city.lat, city.lon, displayName);
            this.addToRecentSearches(displayName, city.lat, city.lon);
            
        } catch (error) {
            this.showError(error.message);
        }
    }
    
    // Location and Weather Data
    async getCurrentLocationWeather() {
        if (!navigator.geolocation) {
            this.showError('Geolocation is not supported by your browser');
            return;
        }
        
        this.showLoading();
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude: lat, longitude: lon } = position.coords;
                    await this.fetchAndDisplayWeather(lat, lon);
                } catch (error) {
                    this.showError('Failed to fetch weather data for your location');
                }
            },
            (error) => {
                let message = 'Unable to get your location. ';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        message += 'Please allow location access.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        message += 'Location information is unavailable.';
                        break;
                    case error.TIMEOUT:
                        message += 'Location request timed out.';
                        break;
                    default:
                        message += 'An unknown error occurred.';
                        break;
                }
                this.showError(message);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000 // 5 minutes
            }
        );
    }
    
    async fetchAndDisplayWeather(lat, lon, locationName = null) {
        try {
            this.showLoading();
            
            // Fetch all weather data concurrently
            const [weatherData, forecastData, aqiData, uvData] = await Promise.all([
                this.fetchWeatherData(lat, lon),
                this.fetchForecastData(lat, lon),
                this.fetchAirQuality(lat, lon),
                this.fetchUVIndex(lat, lon)
            ]);
            
            this.currentWeatherData = weatherData;
            this.forecastData = forecastData;
            this.currentLocation = { lat, lon, name: locationName };
            
            // Display all weather information
            this.displayCurrentWeather(weatherData);
            this.displayWeatherDetails(weatherData);
            this.displayWeatherAlert(weatherData);
            this.displayHourlyForecast(forecastData);
            this.displayWeatherChart(forecastData);
            this.displayDailyForecast(forecastData);
            this.displayAirQuality(aqiData);
            this.displayUVIndex(uvData);
            
            // Cache the data
            this.cacheWeatherData(weatherData, forecastData);
            
            this.hideLoading();
            
        } catch (error) {
            console.error('Error fetching weather data:', error);
            this.showError('Failed to fetch weather data. Please try again.');
        }
    }
    
    displayCurrentWeather(data) {
        // Location information
        this.elements.cityName.textContent = data.name;
        this.elements.countryName.textContent = data.sys.country;
        this.updateDateTime();
        
        // Weather icon
        this.elements.weatherIconMain.textContent = this.getWeatherEmoji(data.weather[0].id, data.weather[0].icon);
        
        // Temperature
        this.elements.temperatureMain.textContent = `${Math.round(data.main.temp)}°${this.settings.units === 'metric' ? 'C' : 'F'}`;
        this.elements.feelsLike.textContent = `Feels like ${Math.round(data.main.feels_like)}°${this.settings.units === 'metric' ? 'C' : 'F'}`;
        this.elements.weatherDescription.textContent = data.weather[0].description;
        
        // Weather details
        this.elements.humidity.textContent = `${data.main.humidity}%`;
        this.elements.windSpeed.textContent = `${Math.round(data.wind.speed)} ${this.settings.units === 'metric' ? 'km/h' : 'mph'}`;
        this.elements.visibility.textContent = `${(data.visibility / 1000).toFixed(1)} km`;
        this.elements.pressure.textContent = `${data.main.pressure} hPa`;
        
        // Sunrise and sunset
        const sunrise = new Date(data.sys.sunrise * 1000);
        const sunset = new Date(data.sys.sunset * 1000);
        this.elements.sunrise.textContent = sunrise.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        this.elements.sunset.textContent = sunset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Update favorite button state
        this.updateFavoriteButton();
        
        // Update weather background animation
        this.updateWeatherBackground(data.weather[0].id, data.weather[0].main.toLowerCase());
        this.updateWeatherCardBackground(data.weather[0].main.toLowerCase());
        
        // Show the weather card
        this.elements.currentWeatherCard.style.display = 'block';
    }
    
    updateWeatherCardBackground(weatherMain) {
        // Hide all card background animations
        const cardContainers = [
            this.elements.cardRainContainer,
            this.elements.cardCloudsContainer,
            this.elements.cardSnowContainer,
            this.elements.cardSunContainer
        ];
        
        cardContainers.forEach(container => {
            if (container) {
                container.classList.remove('active');
            }
        });
        
        // Show appropriate card background animation
        switch (weatherMain) {
            case 'rain':
            case 'drizzle':
            case 'thunderstorm':
                if (this.elements.cardRainContainer) {
                    this.elements.cardRainContainer.classList.add('active');
                }
                break;
                
            case 'snow':
                if (this.elements.cardSnowContainer) {
                    this.elements.cardSnowContainer.classList.add('active');
                }
                break;
                
            case 'clear':
                if (this.elements.cardSunContainer) {
                    this.elements.cardSunContainer.classList.add('active');
                }
                break;
                
            case 'clouds':
            case 'mist':
            case 'fog':
            case 'haze':
                if (this.elements.cardCloudsContainer) {
                    this.elements.cardCloudsContainer.classList.add('active');
                }
                break;
                
            default:
                // Default to clouds for unknown weather
                if (this.elements.cardCloudsContainer) {
                    this.elements.cardCloudsContainer.classList.add('active');
                }
                break;
        }
    }
    
    displayWeatherDetails(data) {
        // Visibility
        const visibility = (data.visibility / 1000).toFixed(1);
        document.getElementById('visibility-value').textContent = `${visibility} km`;
        
        let visibilityStatus = 'Poor';
        if (visibility >= 10) visibilityStatus = 'Excellent';
        else if (visibility >= 7) visibilityStatus = 'Good';
        else if (visibility >= 4) visibilityStatus = 'Moderate';
        
        document.getElementById('visibility-status').textContent = visibilityStatus;
        
        // Update visibility bars
        const visibilityLevel = Math.min(5, Math.ceil(visibility / 2));
        const visBars = document.querySelectorAll('.vis-bar');
        visBars.forEach((bar, index) => {
            bar.classList.toggle('active', index < visibilityLevel);
        });
        
        // Wind
        const windSpeed = Math.round(data.wind.speed * 3.6); // Convert m/s to km/h
        const windGust = data.wind.gust ? Math.round(data.wind.gust * 3.6) : windSpeed;
        const windDirection = data.wind.deg || 0;
        
        document.getElementById('wind-speed-value').textContent = windSpeed;
        document.getElementById('wind-gust-value').textContent = windGust;
        
        // Wind direction arrow
        const windArrow = document.getElementById('wind-direction-arrow');
        if (windArrow) {
            windArrow.style.transform = `translate(-50%, -50%) rotate(${windDirection}deg)`;
        }
        
        // Wind force calculation (Beaufort scale)
        let windForce = 0;
        let windDesc = 'Calm';
        if (windSpeed >= 1) { windForce = 1; windDesc = 'Light Air'; }
        if (windSpeed >= 6) { windForce = 2; windDesc = 'Light Breeze'; }
        if (windSpeed >= 12) { windForce = 3; windDesc = 'Gentle Breeze'; }
        if (windSpeed >= 20) { windForce = 4; windDesc = 'Moderate Breeze'; }
        if (windSpeed >= 29) { windForce = 5; windDesc = 'Fresh Breeze'; }
        if (windSpeed >= 39) { windForce = 6; windDesc = 'Strong Breeze'; }
        
        document.getElementById('wind-force').textContent = `Force: ${windForce} (${windDesc})`;
        
        // Pressure
        const pressure = data.main.pressure;
        document.getElementById('pressure-value').textContent = pressure;
        
        let pressureStatus = 'Steady';
        if (pressure > 1020) pressureStatus = 'Rising';
        else if (pressure < 1000) pressureStatus = 'Falling';
        
        document.getElementById('pressure-status').textContent = pressureStatus;
        
        // Pressure gauge (normalize between 950-1050 mb)
        const pressurePercent = Math.max(0, Math.min(100, ((pressure - 950) / 100) * 100));
        const pressureFill = document.getElementById('pressure-gauge-fill');
        const pressureThumb = document.getElementById('pressure-gauge-thumb');
        
        if (pressureFill) pressureFill.style.width = `${pressurePercent}%`;
        if (pressureThumb) pressureThumb.style.left = `${pressurePercent}%`;
        
        // Humidity
        const humidity = data.main.humidity;
        document.getElementById('humidity-display-value').textContent = humidity;
        
        let humidityStatus = 'Comfortable';
        if (humidity >= 80) humidityStatus = 'Extremely humid';
        else if (humidity >= 60) humidityStatus = 'Humid';
        else if (humidity >= 40) humidityStatus = 'Comfortable';
        else if (humidity >= 20) humidityStatus = 'Dry';
        else humidityStatus = 'Very dry';
        
        document.getElementById('humidity-display-status').textContent = humidityStatus;
        
        // Humidity bars (8 bars, activate based on percentage)
        const humidityBars = document.querySelectorAll('.humidity-bar');
        const activeBars = Math.ceil((humidity / 100) * 8);
        humidityBars.forEach((bar, index) => {
            bar.classList.toggle('active', index < activeBars);
        });
        
        // Dew point calculation (simplified)
        const temp = data.main.temp;
        const dewPoint = Math.round(temp - ((100 - humidity) / 5));
        document.getElementById('dew-point-value').textContent = dewPoint;
        
        // AQI (simulated data since not available in free tier)
        const simulatedAQI = Math.floor(Math.random() * 5) + 1; // 1-5 scale
        const aqiValues = ['Good', 'Moderate', 'Unhealthy for Sensitive', 'Unhealthy', 'Very Unhealthy'];
        const aqiColors = ['#10b981', '#f59e0b', '#f97316', '#ef4444', '#7c2d12'];
        
        document.getElementById('aqi-value').textContent = simulatedAQI;
        document.getElementById('aqi-status').textContent = aqiValues[simulatedAQI - 1];
        
        // Update AQI gauge elements
        document.getElementById('aqi-gauge-value').textContent = simulatedAQI;
        document.getElementById('aqi-gauge-status').textContent = aqiValues[simulatedAQI - 1];
        
        // Update circular gauge
        const aqiPercent = (simulatedAQI / 5) * 100;
        const aqiCircle = document.getElementById('aqi-progress-circle');
        if (aqiCircle) {
            const circumference = 2 * Math.PI * 45; // r = 45
            const offset = circumference - (aqiPercent / 100) * circumference;
            aqiCircle.style.strokeDashoffset = offset;
            aqiCircle.style.stroke = aqiColors[simulatedAQI - 1];
        }
        
        // UV Index (simulated based on weather conditions)
        let uvIndex;
        const weatherMain = data.weather[0].main.toLowerCase();
        const currentHour = new Date().getHours();
        
        // Simulate UV based on weather and time
        if (currentHour < 6 || currentHour > 18) {
            uvIndex = 0;
        } else if (weatherMain.includes('cloud')) {
            uvIndex = Math.floor(Math.random() * 4) + 1; // 1-4
        } else if (weatherMain.includes('rain') || weatherMain.includes('storm')) {
            uvIndex = Math.floor(Math.random() * 2) + 1; // 1-2
        } else {
            uvIndex = Math.floor(Math.random() * 6) + 3; // 3-8
        }
        
        uvIndex = Math.min(11, uvIndex); // Max UV index is 11
        
        const uvCategories = ['Low', 'Low', 'Low', 'Moderate', 'Moderate', 'Moderate', 'High', 'High', 'Very High', 'Very High', 'Extreme', 'Extreme'];
        const uvColors = ['#10b981', '#10b981', '#84cc16', '#f59e0b', '#f59e0b', '#f97316', '#f97316', '#ef4444', '#ef4444', '#7c2d12', '#7c2d12'];
        
        document.getElementById('uv-value').textContent = uvIndex;
        document.getElementById('uv-status').textContent = uvCategories[uvIndex] || 'Low';
        
        // Update UV gauge elements
        document.getElementById('uv-gauge-value').textContent = uvIndex;
        document.getElementById('uv-gauge-status').textContent = uvCategories[uvIndex] || 'Low';
        
        // Update circular gauge
        const uvPercent = (uvIndex / 11) * 100;
        const uvCircle = document.getElementById('uv-progress-circle');
        if (uvCircle) {
            const circumference = 2 * Math.PI * 45; // r = 45
            const offset = circumference - (uvPercent / 100) * circumference;
            uvCircle.style.strokeDashoffset = offset;
            uvCircle.style.stroke = uvColors[uvIndex] || '#10b981';
        }
        
        // Create SVG gradients for gauges if not exists
        this.createSVGGradients();
    }
    
    createSVGGradients() {
        // Check if gradients already exist
        if (document.getElementById('aqiGradient')) return;
        
        // Create SVG defs element
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.position = 'absolute';
        svg.style.width = '0';
        svg.style.height = '0';
        
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        
        // AQI Gradient (Green to Red)
        const aqiGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        aqiGradient.id = 'aqiGradient';
        aqiGradient.innerHTML = `
            <stop offset="0%" style="stop-color:#10b981"/>
            <stop offset="25%" style="stop-color:#f59e0b"/>
            <stop offset="50%" style="stop-color:#ef4444"/>
            <stop offset="75%" style="stop-color:#8b5cf6"/>
            <stop offset="100%" style="stop-color:#7c2d12"/>
        `;
        
        // UV Gradient (Green to Red via Yellow/Orange)
        const uvGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        uvGradient.id = 'uvGradient';
        uvGradient.innerHTML = `
            <stop offset="0%" style="stop-color:#10b981"/>
            <stop offset="20%" style="stop-color:#84cc16"/>
            <stop offset="40%" style="stop-color:#f59e0b"/>
            <stop offset="60%" style="stop-color:#f97316"/>
            <stop offset="80%" style="stop-color:#ef4444"/>
            <stop offset="100%" style="stop-color:#7c2d12"/>
        `;
        
        defs.appendChild(aqiGradient);
        defs.appendChild(uvGradient);
        svg.appendChild(defs);
        document.body.appendChild(svg);
    }
    
    displayAirQuality(data) {
        // This is handled in displayWeatherDetails
        // Since we're simulating AQI data
    }
    
    displayUVIndex(data) {
        // This is handled in displayWeatherDetails
        // Since we're simulating UV data
    }
    
    displayHourlyForecast(data) {
        const hourlyData = data.list.slice(0, 24); // Next 24 hours
        
        const hourlyHTML = hourlyData.map(item => {
            const time = new Date(item.dt * 1000);
            const hour = time.getHours();
            const displayTime = hour === 0 ? '12 AM' : hour <= 12 ? `${hour} AM` : `${hour - 12} PM`;
            const temp = Math.round(item.main.temp);
            const icon = this.getWeatherEmoji(item.weather[0].id, item.weather[0].icon);
            
            return `
                <div class="hourly-item">
                    <div class="hourly-time">${displayTime}</div>
                    <div class="hourly-icon">${icon}</div>
                    <div class="hourly-temp">${temp}°${this.settings.units === 'metric' ? 'C' : 'F'}</div>
                </div>
            `;
        }).join('');
        
        this.elements.hourlyContainer.innerHTML = hourlyHTML;
    }
    
    displayWeatherChart(data) {
        if (!this.elements.hourlyChart || !this.elements.chartOverlay) return;
        
        const canvas = this.elements.hourlyChart;
        const ctx = canvas.getContext('2d');
        const overlay = this.elements.chartOverlay;
        
        // Clear previous chart
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        overlay.innerHTML = '';
        
        // Get hourly data (next 24 hours)
        const hourlyData = data.list.slice(0, 8); // Show 8 data points (24 hours / 3-hour intervals)
        
        if (hourlyData.length === 0) return;
        
        // Chart dimensions
        const chartWidth = canvas.width;
        const chartHeight = canvas.height;
        const padding = 60;
        const plotWidth = chartWidth - (padding * 2);
        const plotHeight = chartHeight - (padding * 2);
        
        // Get temperature and rain data
        const temps = hourlyData.map(item => Math.round(item.main.temp));
        const rainProbs = hourlyData.map(item => Math.round((item.pop || 0) * 100));
        const times = hourlyData.map(item => {
            const date = new Date(item.dt * 1000);
            return date.getHours() === 0 ? '12 AM' : 
                   date.getHours() <= 12 ? `${date.getHours()} AM` : 
                   `${date.getHours() - 12} PM`;
        });
        
        // Find min/max for scaling
        const minTemp = Math.min(...temps) - 2;
        const maxTemp = Math.max(...temps) + 2;
        const tempRange = maxTemp - minTemp;
        
        // Draw temperature curve
        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Create gradient for temperature line
        const gradient = ctx.createLinearGradient(0, padding, 0, chartHeight - padding);
        gradient.addColorStop(0, 'rgba(255, 107, 107, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 142, 142, 0.3)');
        
        ctx.beginPath();
        hourlyData.forEach((item, index) => {
            const x = padding + (index * (plotWidth / (hourlyData.length - 1)));
            const temp = Math.round(item.main.temp);
            const y = padding + ((maxTemp - temp) / tempRange) * plotHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
        
        // Fill area under curve
        ctx.fillStyle = gradient;
        ctx.lineTo(padding + plotWidth, chartHeight - padding);
        ctx.lineTo(padding, chartHeight - padding);
        ctx.closePath();
        ctx.fill();
        
        // Add temperature points and labels
        hourlyData.forEach((item, index) => {
            const x = padding + (index * (plotWidth / (hourlyData.length - 1)));
            const temp = Math.round(item.main.temp);
            const y = padding + ((maxTemp - temp) / tempRange) * plotHeight;
            const rainProb = Math.round((item.pop || 0) * 100);
            
            // Temperature point
            const tempPoint = document.createElement('div');
            tempPoint.className = 'temp-point';
            tempPoint.style.left = `${(x / chartWidth) * 100}%`;
            tempPoint.style.top = `${(y / chartHeight) * 100}%`;
            overlay.appendChild(tempPoint);
            
            // Temperature label
            const tempLabel = document.createElement('div');
            tempLabel.className = 'chart-temp-label';
            tempLabel.textContent = `${temp}°`;
            tempLabel.style.left = `${(x / chartWidth) * 100}%`;
            tempLabel.style.top = `${(y / chartHeight) * 100}%`;
            overlay.appendChild(tempLabel);
            
            // Rain probability bar
            if (rainProb > 0) {
                const rainBar = document.createElement('div');
                rainBar.className = 'rain-bar';
                const barHeight = (rainProb / 100) * (plotHeight * 0.3);
                rainBar.style.left = `${(x / chartWidth) * 100}%`;
                rainBar.style.width = '20px';
                rainBar.style.height = `${barHeight}px`;
                rainBar.style.transform = 'translateX(-50%)';
                overlay.appendChild(rainBar);
                
                // Rain probability label
                const rainLabel = document.createElement('div');
                rainLabel.className = 'chart-rain-label';
                rainLabel.textContent = `${rainProb}%`;
                rainLabel.style.left = `${(x / chartWidth) * 100}%`;
                rainLabel.style.bottom = `${40 + barHeight}px`;
                overlay.appendChild(rainLabel);
            }
            
            // Time label
            const timeLabel = document.createElement('div');
            timeLabel.className = 'chart-time-label';
            timeLabel.textContent = times[index];
            timeLabel.style.left = `${(x / chartWidth) * 100}%`;
            overlay.appendChild(timeLabel);
        });
        
        // Draw grid lines
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;
        
        // Horizontal grid lines (temperature)
        for (let i = 0; i <= 4; i++) {
            const y = padding + (i * (plotHeight / 4));
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(chartWidth - padding, y);
            ctx.stroke();
        }
        
        // Vertical grid lines (time)
        hourlyData.forEach((item, index) => {
            const x = padding + (index * (plotWidth / (hourlyData.length - 1)));
            ctx.beginPath();
            ctx.moveTo(x, padding);
            ctx.lineTo(x, chartHeight - padding);
            ctx.stroke();
        });
    }
    
    displayDailyForecast(data) {
        // Group forecast data by day
        const dailyData = {};
        
        data.list.forEach(item => {
            const date = new Date(item.dt * 1000);
            const dayKey = date.toDateString();
            
            if (!dailyData[dayKey]) {
                dailyData[dayKey] = {
                    date,
                    temps: [],
                    weather: item.weather[0],
                    items: []
                };
            }
            
            dailyData[dayKey].temps.push(item.main.temp);
            dailyData[dayKey].items.push(item);
        });
        
        // Get first 5 days
        const days = Object.values(dailyData).slice(0, 5);
        
        const forecastHTML = days.map((day, index) => {
            const dayName = index === 0 ? 'Today' : day.date.toLocaleDateString([], { weekday: 'long' });
            const high = Math.round(Math.max(...day.temps));
            const low = Math.round(Math.min(...day.temps));
            const icon = this.getWeatherEmoji(day.weather.id, day.weather.icon);
            
            return `
                <div class="forecast-item" data-day="${index}">
                    <div class="forecast-day">${dayName}</div>
                    <div class="forecast-icon">${icon}</div>
                    <div class="forecast-desc">${day.weather.description}</div>
                    <div class="forecast-temps">
                        <span class="forecast-high">${high}°</span>
                        <span class="forecast-low">${low}°</span>
                    </div>
                </div>
            `;
        }).join('');
        
        this.elements.forecastContainer.innerHTML = forecastHTML;
        
        // Add click handlers for detailed forecast
        this.elements.forecastContainer.querySelectorAll('.forecast-item').forEach(item => {
            item.addEventListener('click', () => {
                const dayIndex = parseInt(item.dataset.day);
                this.showDayDetails(days[dayIndex]);
            });
        });
    }
    
    displayAirQuality(data) {
        if (!data || !data.list || data.list.length === 0) {
            this.elements.aqiValue.textContent = '-';
            this.elements.aqiStatus.textContent = 'Unavailable';
            return;
        }
        
        const aqi = data.list[0].main.aqi;
        const aqiLabels = ['', 'Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];
        
        this.elements.aqiValue.textContent = aqi;
        this.elements.aqiStatus.textContent = aqiLabels[aqi] || 'Unknown';
        
        // Add color coding
        const aqiColors = ['', '#00e400', '#ffff00', '#ff7e00', '#ff0000', '#8f3f97'];
        this.elements.aqiValue.style.color = aqiColors[aqi] || 'var(--text-secondary)';
    }
    
    displayUVIndex(data) {
        if (!data) {
            this.elements.uvValue.textContent = '-';
            this.elements.uvStatus.textContent = 'Unavailable';
            return;
        }
        
        const uvIndex = data.value;
        const uvStatus = data.status[uvIndex] || 'Unknown';
        
        this.elements.uvValue.textContent = uvIndex;
        this.elements.uvStatus.textContent = uvStatus;
        
        // Add color coding
        const uvColors = {
            'Low': '#00e400',
            'Moderate': '#ffff00',
            'High': '#ff7e00',
            'Very High': '#ff0000',
            'Extreme': '#8f3f97'
        };
        
        this.elements.uvValue.style.color = uvColors[uvStatus] || 'var(--text-secondary)';
    }
    
    // Utility Methods
    getWeatherEmoji(weatherId, icon) {
        // Weather condition mapping to emojis
        const weatherEmojis = {
            // Thunderstorm
            200: '⛈️', 201: '⛈️', 202: '⛈️', 210: '🌩️', 211: '🌩️', 212: '🌩️', 221: '🌩️', 230: '⛈️', 231: '⛈️', 232: '⛈️',
            // Drizzle
            300: '🌦️', 301: '🌦️', 302: '🌦️', 310: '🌦️', 311: '🌦️', 312: '🌦️', 313: '🌦️', 314: '🌦️', 321: '🌦️',
            // Rain
            500: '🌧️', 501: '🌧️', 502: '🌧️', 503: '🌧️', 504: '🌧️', 511: '🌨️', 520: '🌦️', 521: '🌦️', 522: '🌧️', 531: '🌦️',
            // Snow
            600: '🌨️', 601: '🌨️', 602: '❄️', 611: '🌨️', 612: '🌨️', 613: '🌨️', 615: '🌨️', 616: '🌨️', 620: '🌨️', 621: '🌨️', 622: '❄️',
            // Atmosphere
            701: '🌫️', 711: '🌫️', 721: '🌫️', 731: '🌪️', 741: '🌫️', 751: '🌪️', 761: '🌫️', 762: '🌫️', 771: '💨', 781: '🌪️',
            // Clear
            800: icon && icon.includes('n') ? '🌙' : '☀️',
            // Clouds
            801: icon && icon.includes('n') ? '☁️' : '🌤️',
            802: '⛅', 803: '☁️', 804: '☁️'
        };
        
        return weatherEmojis[weatherId] || (icon && icon.includes('n') ? '🌙' : '☀️');
    }
    
    updateDateTime() {
        const now = new Date();
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        
        this.elements.dateTime.textContent = now.toLocaleDateString([], options);
    }
    
    // UI State Management
    showLoading() {
        this.isLoading = true;
        this.elements.loadingSpinner.classList.add('show');
        this.elements.errorMessage.classList.remove('show');
        this.elements.currentWeatherCard.style.display = 'none';
    }
    
    hideLoading() {
        this.isLoading = false;
        this.elements.loadingSpinner.classList.remove('show');
    }
    
    showError(message) {
        this.hideLoading();
        this.elements.errorText.textContent = message;
        this.elements.errorMessage.classList.add('show');
        this.elements.currentWeatherCard.style.display = 'none';
    }
    
    hideError() {
        this.elements.errorMessage.classList.remove('show');
    }
    
    handleRetry() {
        this.hideError();
        if (this.currentLocation) {
            this.fetchAndDisplayWeather(this.currentLocation.lat, this.currentLocation.lon, this.currentLocation.name);
        } else {
            this.getCurrentLocationWeather();
        }
    }
    
    // Weather Background Animation Control
    updateWeatherBackground(weatherId, weatherMain) {
        // Hide all animations first
        this.hideAllWeatherAnimations();
        
        // Determine which animation to show based on weather condition
        if (this.isThunderstorm(weatherId)) {
            this.showThunderAnimation();
        } else if (this.isRain(weatherId)) {
            this.showRainAnimation();
        } else if (this.isSnow(weatherId)) {
            this.showSnowAnimation();
        } else if (this.isCloudy(weatherId)) {
            this.showCloudyAnimation();
        } else if (this.isClear(weatherId)) {
            this.showSunnyAnimation();
        }
    }
    
    hideAllWeatherAnimations() {
        const containers = [
            this.elements.rainContainer,
            this.elements.snowContainer,
            this.elements.cloudsContainer,
            this.elements.shimmerContainer,
            this.elements.thunderContainer,
            this.elements.mountainLandscape
        ];
        
        containers.forEach(container => {
            if (container) {
                container.classList.remove('active');
            }
        });
        
        // Clear any generated particles
        this.clearRainDrops();
        this.clearSnowFlakes();
    }
    
    showRainAnimation() {
        if (!this.elements.rainContainer) return;
        
        this.elements.rainContainer.classList.add('active');
        this.generateRainDrops();
    }
    
    showSnowAnimation() {
        if (!this.elements.snowContainer) return;
        
        this.elements.snowContainer.classList.add('active');
        this.generateSnowFlakes();
    }
    
    showCloudyAnimation() {
        if (!this.elements.cloudsContainer) return;
        
        this.elements.cloudsContainer.classList.add('active');
        
        // Also show mountain landscape in light mode for cloudy weather
        if (this.settings.theme === 'light' && this.elements.mountainLandscape) {
            this.elements.mountainLandscape.classList.add('active');
        }
    }
    
    showSunnyAnimation() {
        // Show mountain landscape if in light mode, shimmer if in dark mode
        if (this.settings.theme === 'light' && this.elements.mountainLandscape) {
            this.elements.mountainLandscape.classList.add('active');
        } else if (this.elements.shimmerContainer) {
            this.elements.shimmerContainer.classList.add('active');
        }
    }
    
    showThunderAnimation() {
        if (!this.elements.thunderContainer) return;
        
        this.elements.thunderContainer.classList.add('active');
        // Also show rain with thunder
        this.showRainAnimation();
    }
    
    generateRainDrops() {
        this.clearRainDrops();
        
        const container = this.elements.rainContainer;
        const dropCount = Math.floor(window.innerWidth / 10); // Responsive drop count
        
        for (let i = 0; i < dropCount; i++) {
            const drop = document.createElement('div');
            drop.classList.add('rain-drop');
            
            // Random horizontal position
            drop.style.left = Math.random() * 100 + '%';
            
            // Random animation duration (speed)
            const duration = Math.random() * 1 + 0.5; // 0.5s - 1.5s
            drop.style.animationDuration = duration + 's';
            
            // Random delay for natural effect
            drop.style.animationDelay = Math.random() * 2 + 's';
            
            // Random height for variety
            drop.style.height = (Math.random() * 15 + 10) + 'px';
            
            container.appendChild(drop);
        }
    }
    
    generateSnowFlakes() {
        this.clearSnowFlakes();
        
        const container = this.elements.snowContainer;
        const flakeCount = Math.floor(window.innerWidth / 20); // Responsive flake count
        const snowflakeSymbols = ['❄', '❅', '❆', '✻', '✼', '❋'];
        
        for (let i = 0; i < flakeCount; i++) {
            const flake = document.createElement('div');
            flake.classList.add('snow-flake');
            
            // Random snowflake symbol
            flake.textContent = snowflakeSymbols[Math.floor(Math.random() * snowflakeSymbols.length)];
            
            // Random horizontal position
            flake.style.left = Math.random() * 100 + '%';
            
            // Random size
            const size = Math.random() * 0.8 + 0.8; // 0.8rem - 1.6rem
            flake.style.fontSize = size + 'rem';
            
            // Random animation duration (speed)
            const duration = Math.random() * 5 + 5; // 5s - 10s
            flake.style.animationDuration = duration + 's';
            
            // Random delay for natural effect
            flake.style.animationDelay = Math.random() * 5 + 's';
            
            container.appendChild(flake);
        }
    }
    
    clearRainDrops() {
        if (this.elements.rainContainer) {
            const drops = this.elements.rainContainer.querySelectorAll('.rain-drop');
            drops.forEach(drop => drop.remove());
        }
    }
    
    clearSnowFlakes() {
        if (this.elements.snowContainer) {
            const flakes = this.elements.snowContainer.querySelectorAll('.snow-flake');
            flakes.forEach(flake => flake.remove());
        }
    }
    
    // Weather condition helpers
    isThunderstorm(weatherId) {
        return weatherId >= 200 && weatherId < 300;
    }
    
    isRain(weatherId) {
        return (weatherId >= 300 && weatherId < 600) || weatherId === 511;
    }
    
    isSnow(weatherId) {
        return weatherId >= 600 && weatherId < 700;
    }
    
    isCloudy(weatherId) {
        return weatherId >= 801 && weatherId <= 804;
    }
    
    isClear(weatherId) {
        return weatherId === 800;
    }
    
    // Settings Management
    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('weather-settings');
            if (savedSettings) {
                this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
            }
        } catch (error) {
            console.warn('Failed to load settings:', error);
        }
        
        // Apply saved theme
        if (this.settings.theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            this.elements.themeToggle.querySelector('.theme-icon').textContent = '☀️';
        }
        
        // Apply saved units
        this.elements.unitToggle.querySelector('.unit-text').textContent = 
            this.settings.units === 'metric' ? '°F' : '°C';
    }
    
    saveSettings() {
        try {
            localStorage.setItem('weather-settings', JSON.stringify(this.settings));
        } catch (error) {
            console.warn('Failed to save settings:', error);
        }
    }
    
    toggleTheme() {
        this.settings.theme = this.settings.theme === 'light' ? 'dark' : 'light';
        
        if (this.settings.theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            this.elements.themeToggle.querySelector('.theme-icon').textContent = '☀️';
        } else {
            document.documentElement.removeAttribute('data-theme');
            this.elements.themeToggle.querySelector('.theme-icon').textContent = '🌙';
        }
        
        this.saveSettings();
        
        // Refresh weather animation based on new theme
        if (this.currentWeatherData) {
            this.updateWeatherBackground(this.currentWeatherData.weather[0].id, this.currentWeatherData.weather[0].main.toLowerCase());
        }
    }
    
    async toggleUnits() {
        const oldUnits = this.settings.units;
        this.settings.units = this.settings.units === 'metric' ? 'imperial' : 'metric';
        
        this.elements.unitToggle.querySelector('.unit-text').textContent = 
            this.settings.units === 'metric' ? '°F' : '°C';
        
        this.saveSettings();
        
        // Refresh weather data with new units if available
        if (this.currentLocation) {
            await this.fetchAndDisplayWeather(
                this.currentLocation.lat, 
                this.currentLocation.lon, 
                this.currentLocation.name
            );
        }
    }
    
    // Continue in next part...
    // Favorites Management
    loadFavorites() {
        try {
            const favorites = JSON.parse(localStorage.getItem('weather-favorites') || '[]');
            this.displayFavorites(favorites);
        } catch (error) {
            console.warn('Failed to load favorites:', error);
            this.displayFavorites([]);
        }
    }
    
    displayFavorites(favorites) {
        if (favorites.length === 0) {
            this.elements.noFavorites.style.display = 'block';
            this.elements.favoritesContainer.innerHTML = '<div class="no-favorites" id="no-favorites"><p>No favorite locations yet. Add some by clicking the ♡ icon!</p></div>';
            return;
        }
        
        this.elements.noFavorites.style.display = 'none';
        
        const favoritesHTML = favorites.map((fav, index) => `
            <div class="favorite-item" data-index="${index}">
                <div class="favorite-header">
                    <div class="favorite-location">
                        <div class="favorite-city">${fav.name}</div>
                        <div class="favorite-country">${fav.country || ''}</div>
                    </div>
                    <button class="favorite-remove" data-index="${index}" aria-label="Remove from favorites">×</button>
                </div>
                <div class="favorite-weather">
                    <div class="favorite-temp">${fav.temp || '--'}°</div>
                    <div class="favorite-icon">${fav.icon || '☀️'}</div>
                </div>
            </div>
        `).join('');
        
        this.elements.favoritesContainer.innerHTML = favoritesHTML;
        
        // Add event listeners
        this.elements.favoritesContainer.querySelectorAll('.favorite-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.favorite-remove')) {
                    const index = parseInt(item.dataset.index);
                    const favorite = favorites[index];
                    this.fetchAndDisplayWeather(favorite.lat, favorite.lon, favorite.name);
                }
            });
        });
        
        this.elements.favoritesContainer.querySelectorAll('.favorite-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.index);
                this.removeFavorite(index);
            });
        });
        
        // Update favorite weather data
        this.updateFavoritesWeather(favorites);
    }
    
    async updateFavoritesWeather(favorites) {
        for (let i = 0; i < favorites.length; i++) {
            try {
                const weatherData = await this.fetchWeatherData(favorites[i].lat, favorites[i].lon);
                favorites[i].temp = Math.round(weatherData.main.temp);
                favorites[i].icon = this.getWeatherEmoji(weatherData.weather[0].id, weatherData.weather[0].icon);
                
                // Update the display
                const favoriteElement = this.elements.favoritesContainer.querySelector(`[data-index="${i}"]`);
                if (favoriteElement) {
                    favoriteElement.querySelector('.favorite-temp').textContent = `${favorites[i].temp}°`;
                    favoriteElement.querySelector('.favorite-icon').textContent = favorites[i].icon;
                }
            } catch (error) {
                console.warn(`Failed to update weather for favorite ${i}:`, error);
            }
        }
        
        // Save updated favorites
        localStorage.setItem('weather-favorites', JSON.stringify(favorites));
    }
    
    updateFavoriteButton() {
        if (!this.currentWeatherData) return;
        
        const favorites = JSON.parse(localStorage.getItem('weather-favorites') || '[]');
        const currentLocation = `${this.currentWeatherData.name}, ${this.currentWeatherData.sys.country}`;
        
        const isFavorite = favorites.some(fav => 
            fav.name === currentLocation || 
            (Math.abs(fav.lat - this.currentLocation.lat) < 0.01 && Math.abs(fav.lon - this.currentLocation.lon) < 0.01)
        );
        
        this.elements.addFavorite.classList.toggle('active', isFavorite);
        this.elements.addFavorite.querySelector('.heart-icon').textContent = isFavorite ? '♥' : '♡';
        this.elements.addFavorite.setAttribute('aria-label', isFavorite ? 'Remove from favorites' : 'Add to favorites');
    }
    
    toggleFavorite() {
        if (!this.currentWeatherData || !this.currentLocation) return;
        
        const favorites = JSON.parse(localStorage.getItem('weather-favorites') || '[]');
        const currentLocation = `${this.currentWeatherData.name}, ${this.currentWeatherData.sys.country}`;
        
        const existingIndex = favorites.findIndex(fav => 
            fav.name === currentLocation || 
            (Math.abs(fav.lat - this.currentLocation.lat) < 0.01 && Math.abs(fav.lon - this.currentLocation.lon) < 0.01)
        );
        
        if (existingIndex >= 0) {
            // Remove from favorites
            favorites.splice(existingIndex, 1);
            this.showAlert('Removed from favorites', `${currentLocation} has been removed from your favorites.`);
        } else {
            // Add to favorites
            const newFavorite = {
                name: currentLocation,
                lat: this.currentLocation.lat,
                lon: this.currentLocation.lon,
                country: this.currentWeatherData.sys.country,
                temp: Math.round(this.currentWeatherData.main.temp),
                icon: this.getWeatherEmoji(this.currentWeatherData.weather[0].id, this.currentWeatherData.weather[0].icon),
                addedAt: Date.now()
            };
            
            favorites.push(newFavorite);
            this.showAlert('Added to favorites', `${currentLocation} has been added to your favorites.`);
        }
        
        localStorage.setItem('weather-favorites', JSON.stringify(favorites));
        this.loadFavorites();
        this.updateFavoriteButton();
    }
    
    removeFavorite(index) {
        const favorites = JSON.parse(localStorage.getItem('weather-favorites') || '[]');
        
        if (index >= 0 && index < favorites.length) {
            const removed = favorites.splice(index, 1)[0];
            localStorage.setItem('weather-favorites', JSON.stringify(favorites));
            this.loadFavorites();
            this.updateFavoriteButton();
            
            this.showAlert('Favorite removed', `${removed.name} has been removed from your favorites.`);
        }
    }
    
    // Recent Searches Management
    loadRecentSearches() {
        try {
            const recentSearches = JSON.parse(localStorage.getItem('weather-recent-searches') || '[]');
            this.displayRecentSearches(recentSearches);
        } catch (error) {
            console.warn('Failed to load recent searches:', error);
        }
    }
    
    displayRecentSearches(searches) {
        if (searches.length === 0) {
            this.elements.recentSearches.style.display = 'none';
            return;
        }
        
        this.elements.recentSearches.style.display = 'block';
        
        const recentHTML = searches.slice(0, 5).map(search => `
            <div class="recent-item" data-lat="${search.lat}" data-lon="${search.lon}" data-name="${search.name}">
                ${search.name}
            </div>
        `).join('');
        
        this.elements.recentList.innerHTML = recentHTML;
        
        // Add click handlers
        this.elements.recentList.querySelectorAll('.recent-item').forEach(item => {
            item.addEventListener('click', () => {
                const lat = parseFloat(item.dataset.lat);
                const lon = parseFloat(item.dataset.lon);
                const name = item.dataset.name;
                
                this.elements.searchInput.value = name;
                this.fetchAndDisplayWeather(lat, lon, name);
            });
        });
    }
    
    addToRecentSearches(name, lat, lon) {
        try {
            let recentSearches = JSON.parse(localStorage.getItem('weather-recent-searches') || '[]');
            
            // Remove existing entry if it exists
            recentSearches = recentSearches.filter(search => search.name !== name);
            
            // Add new entry to the beginning
            recentSearches.unshift({ name, lat, lon, timestamp: Date.now() });
            
            // Keep only the last 10 searches
            recentSearches = recentSearches.slice(0, 10);
            
            localStorage.setItem('weather-recent-searches', JSON.stringify(recentSearches));
            this.displayRecentSearches(recentSearches);
        } catch (error) {
            console.warn('Failed to save recent search:', error);
        }
    }
    
    // Data Caching
    cacheWeatherData(weatherData, forecastData) {
        try {
            const cacheData = {
                weather: weatherData,
                forecast: forecastData,
                timestamp: Date.now(),
                location: this.currentLocation
            };
            
            localStorage.setItem('weather-cache', JSON.stringify(cacheData));
        } catch (error) {
            console.warn('Failed to cache weather data:', error);
        }
    }
    
    loadCachedWeatherData() {
        try {
            const cached = localStorage.getItem('weather-cache');
            if (!cached) return null;
            
            const cacheData = JSON.parse(cached);
            const now = Date.now();
            const maxAge = 10 * 60 * 1000; // 10 minutes
            
            if (now - cacheData.timestamp > maxAge) {
                localStorage.removeItem('weather-cache');
                return null;
            }
            
            return cacheData;
        } catch (error) {
            console.warn('Failed to load cached data:', error);
            return null;
        }
    }
    
    // Modal and Alerts
    showAlert(title, message) {
        this.elements.alertTitle.textContent = title;
        this.elements.alertMessage.textContent = message;
        this.elements.modal.classList.add('show');
        this.elements.modal.setAttribute('aria-hidden', 'false');
    }
    
    closeModal() {
        this.elements.modal.classList.remove('show');
        this.elements.modal.setAttribute('aria-hidden', 'true');
    }
    
    showDayDetails(dayData) {
        const dayName = dayData.date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
        const hourlyDetails = dayData.items.map(item => {
            const time = new Date(item.dt * 1000);
            const hour = time.getHours();
            const displayTime = hour === 0 ? '12 AM' : hour <= 12 ? `${hour} AM` : `${hour - 12} PM`;
            const temp = Math.round(item.main.temp);
            const desc = item.weather[0].description;
            
            return `${displayTime}: ${temp}°${this.settings.units === 'metric' ? 'C' : 'F'}, ${desc}`;
        }).join('<br>');
        
        this.showAlert(
            `Weather Details - ${dayName}`,
            hourlyDetails
        );
    }
    
    handleWindowResize() {
        // Regenerate weather animations based on current weather if active
        if (this.currentWeatherData) {
            const weatherId = this.currentWeatherData.weather[0].id;
            
            if (this.elements.rainContainer.classList.contains('active')) {
                this.generateRainDrops();
            }
            
            if (this.elements.snowContainer.classList.contains('active')) {
                this.generateSnowFlakes();
            }
            
            // Refresh weather chart if displayed
            if (this.forecastData) {
                this.displayWeatherChart(this.forecastData);
            }
        }
    }
    
    // Performance and Error Handling
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

    // Test Gauge Functions
    initTestGauge() {
        const toggleBtn = document.getElementById('toggle-test-gauge');
        const testSection = document.getElementById('test-gauge-section');
        
        if (toggleBtn && testSection) {
            // Initially hide test section
            testSection.style.display = 'none';
            
            toggleBtn.addEventListener('click', () => {
                const isVisible = testSection.style.display !== 'none';
                testSection.style.display = isVisible ? 'none' : 'block';
                
                // Update button appearance
                const icon = toggleBtn.querySelector('.gauge-icon');
                if (icon) {
                    icon.textContent = isVisible ? '📊' : '❌';
                }
                
                // Start or stop demo
                if (!isVisible) {
                    this.startTestGaugeDemo();
                } else {
                    this.stopTestGaugeDemo();
                }
            });
        }
    }
    
    updateTestAQIGauge(value) {
        const aqiValues = ['Good', 'Moderate', 'Unhealthy for Sensitive', 'Unhealthy', 'Very Unhealthy'];
        const aqiColors = ['#10b981', '#f59e0b', '#f97316', '#ef4444', '#7c2d12'];
        
        const display = document.getElementById('test-aqi-display');
        const label = document.getElementById('test-aqi-label');
        const circle = document.getElementById('test-aqi-progress');
        
        if (display && label && circle) {
            display.textContent = value;
            label.textContent = aqiValues[value - 1];
            
            const percent = (value / 5) * 100;
            const circumference = 2 * Math.PI * 45;
            const offset = circumference - (percent / 100) * circumference;
            
            circle.style.strokeDashoffset = offset;
            circle.style.stroke = aqiColors[value - 1];
        }
    }
    
    updateTestUVGauge(value) {
        const uvCategories = ['Low', 'Low', 'Low', 'Moderate', 'Moderate', 'Moderate', 'High', 'High', 'Very High', 'Very High', 'Extreme', 'Extreme'];
        const uvColors = ['#10b981', '#10b981', '#84cc16', '#f59e0b', '#f59e0b', '#f97316', '#f97316', '#ef4444', '#ef4444', '#7c2d12', '#7c2d12'];
        
        const display = document.getElementById('test-uv-display');
        const label = document.getElementById('test-uv-label');
        const circle = document.getElementById('test-uv-progress');
        
        if (display && label && circle) {
            display.textContent = value;
            label.textContent = uvCategories[value] || 'Low';
            
            const percent = (value / 11) * 100;
            const circumference = 2 * Math.PI * 45;
            const offset = circumference - (percent / 100) * circumference;
            
            circle.style.strokeDashoffset = offset;
            circle.style.stroke = uvColors[value] || '#10b981';
        }
    }
    
    startTestGaugeDemo() {
        let aqiValue = 1;
        let uvValue = 1;
        
        // Initial demo values
        setTimeout(() => {
            this.updateTestAQIGauge(3);
            this.updateTestUVGauge(5);
        }, 500);
        
        // Demo animation
        const aqiInterval = setInterval(() => {
            aqiValue = (aqiValue % 5) + 1;
            this.updateTestAQIGauge(aqiValue);
        }, 3000);
        
        const uvInterval = setInterval(() => {
            uvValue = (uvValue % 11) + 1;
            this.updateTestUVGauge(uvValue);
        }, 2500);
        
        // Store intervals for cleanup
        this.testGaugeIntervals = [aqiInterval, uvInterval];
    }
    
    stopTestGaugeDemo() {
        if (this.testGaugeIntervals) {
            this.testGaugeIntervals.forEach(interval => clearInterval(interval));
            this.testGaugeIntervals = [];
        }
    }
    
    // Weather Alert Functions
    toggleWeatherAlert() {
        const alertCard = this.elements.weatherAlertCard;
        const toggleIcon = this.elements.alertToggle?.querySelector('.toggle-icon');
        
        if (alertCard) {
            const isCollapsed = alertCard.classList.contains('collapsed');
            
            if (isCollapsed) {
                alertCard.classList.remove('collapsed');
                if (toggleIcon) toggleIcon.textContent = '▲';
            } else {
                alertCard.classList.add('collapsed');
                if (toggleIcon) toggleIcon.textContent = '▼';
            }
        }
    }
    
    displayWeatherAlert(data) {
        // Simulate weather alert data (could be from API in real implementation)
        const alerts = [
            {
                location: 'Papua Tengah',
                startTime: '30 Sep 2025, 00.30 WIT',
                endTime: '30 Sep 2025, 03.00 WIT',
                description: 'Hujan sedang-lebat, petir, angin kencang',
                severity: 'warning'
            },
            {
                location: 'Jakarta Pusat',
                startTime: '29 Sep 2025, 15.00 WIB',
                endTime: '29 Sep 2025, 18.00 WIB',
                description: 'Hujan lebat disertai angin kencang',
                severity: 'warning'
            }
        ];
        
        // Get current location or use first alert
        const currentLocation = this.currentLocation?.name || 'Jakarta';
        const relevantAlert = alerts.find(alert => 
            alert.location.toLowerCase().includes(currentLocation.toLowerCase())
        ) || alerts[0];
        
        // Update alert card
        const alertLocation = document.getElementById('alert-location');
        const alertStartTime = document.getElementById('alert-start-time');
        const alertEndTime = document.getElementById('alert-end-time');
        const alertDescription = document.getElementById('alert-description');
        
        if (alertLocation) alertLocation.textContent = relevantAlert.location;
        if (alertStartTime) alertStartTime.textContent = relevantAlert.startTime;
        if (alertEndTime) alertEndTime.textContent = relevantAlert.endTime;
        if (alertDescription) alertDescription.textContent = relevantAlert.description;
        
        // Show alert card
        if (this.elements.weatherAlertCard) {
            this.elements.weatherAlertCard.style.display = 'block';
        }
    }
    
    // Initialize when DOM is ready
    static init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => new WeatherDashboard());
        } else {
            new WeatherDashboard();
        }
    }
}

// Initialize the weather dashboard
WeatherDashboard.init();c   
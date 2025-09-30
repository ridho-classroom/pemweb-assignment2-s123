// ========================================
// CONFIGURATION & CONSTANTS
// ========================================
const API_KEY = '13ee1697b390a4dd198e9c2aeda7a390';
const API_BASE = 'https://api.openweathermap.org/data/2.5';

// Application State
let currentUnit = 'metric';
let currentWeatherData = null;

// Weather icon mapping (OpenWeatherMap icons to emojis)
const weatherIcons = {
    '01d': '☀️',   // clear sky day
    '01n': '🌙',   // clear sky night
    '02d': '⛅',   // few clouds day
    '02n': '☁️',   // few clouds night
    '03d': '☁️',   // scattered clouds
    '03n': '☁️',
    '04d': '☁️',   // broken clouds
    '04n': '☁️',
    '09d': '🌧️',  // shower rain
    '09n': '🌧️',
    '10d': '🌦️',  // rain day
    '10n': '🌧️',  // rain night
    '11d': '⛈️',   // thunderstorm
    '11n': '⛈️',
    '13d': '❄️',   // snow
    '13n': '❄️',
    '50d': '🌫️',  // mist
    '50n': '🌫️'
};

// Weather condition backgrounds
const weatherBackgrounds = {
    'Clear': 'var(--clear-sky)',
    'Clouds': 'var(--cloudy)',
    'Rain': 'var(--rain)',
    'Drizzle': 'var(--rain)',
    'Thunderstorm': 'var(--thunderstorm)',
    'Snow': 'var(--snow)',
    'Mist': 'var(--mist)',
    'Fog': 'var(--mist)',
    'Haze': 'var(--mist)',
    'Smoke': 'var(--mist)',
    'Dust': 'var(--mist)',
    'Sand': 'var(--mist)'
};

// Indonesian day names
const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

// ========================================
// DOM ELEMENTS
// ========================================
const elements = {
    themeToggle: document.getElementById('themeToggle'),
    unitToggle: document.getElementById('unitToggle'),
    locationBtn: document.getElementById('locationBtn'),
    searchBtn: document.getElementById('searchBtn'),
    searchInput: document.getElementById('searchInput'),
    loadingIndicator: document.getElementById('loadingIndicator'),
    errorMessage: document.getElementById('errorMessage'),
    mainWeather: document.getElementById('mainWeather'),
    forecastSection: document.getElementById('forecastSection'),
    addFavoriteBtn: document.getElementById('addFavorite'),
    cityName: document.getElementById('cityName'),
    weatherIcon: document.getElementById('weatherIcon'),
    temperature: document.getElementById('temperature'),
    weatherDescription: document.getElementById('weatherDescription'),
    feelsLike: document.getElementById('feelsLike'),
    humidity: document.getElementById('humidity'),
    windSpeed: document.getElementById('windSpeed'),
    pressure: document.getElementById('pressure'),
    sunrise: document.getElementById('sunrise'),
    sunset: document.getElementById('sunset'),
    forecastGrid: document.getElementById('forecastGrid'),
    recentSearches: document.getElementById('recentSearches'),
    favoritesGrid: document.getElementById('favoritesGrid')
};

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌤️ Dashboard Cuaca Indonesia - Initialized');
    loadPreferences();
    loadRecentSearches();
    loadFavorites();
    setupEventListeners();
    
    // Auto-load weather for user's location
    getUserLocation();
});

// ========================================
// EVENT LISTENERS
// ========================================
function setupEventListeners() {
    // Theme toggle
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    // Unit toggle
    elements.unitToggle.addEventListener('click', toggleUnit);
    
    // Location button
    elements.locationBtn.addEventListener('click', getUserLocation);
    
    // Search functionality
    elements.searchBtn.addEventListener('click', () => searchWeather());
    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchWeather();
        }
    });
    
    // Add to favorites
    elements.addFavoriteBtn.addEventListener('click', () => {
        if (currentWeatherData) {
            addToFavorites(currentWeatherData);
        }
    });
}

// ========================================
// THEME MANAGEMENT
// ========================================
function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', newTheme);
    elements.themeToggle.textContent = newTheme === 'light' ? '🌙 Mode Gelap' : '☀️ Mode Terang';
    localStorage.setItem('theme', newTheme);
    console.log(`🎨 Theme changed to: ${newTheme}`);
}

function loadPreferences() {
    // Load theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    elements.themeToggle.textContent = savedTheme === 'light' ? '🌙 Mode Gelap' : '☀️ Mode Terang';
    
    // Load unit preference
    const savedUnit = localStorage.getItem('unit') || 'metric';
    currentUnit = savedUnit;
    
    console.log(`⚙️ Preferences loaded: Theme=${savedTheme}, Unit=${savedUnit}`);
}

// ========================================
// UNIT MANAGEMENT
// ========================================
function toggleUnit() {
    currentUnit = currentUnit === 'metric' ? 'imperial' : 'metric';
    localStorage.setItem('unit', currentUnit);
    console.log(`🌡️ Unit changed to: ${currentUnit}`);
    
    // Refresh display if weather data exists
    if (currentWeatherData) {
        displayWeather(currentWeatherData);
    }
}

// ========================================
// GEOLOCATION
// ========================================
function getUserLocation() {
    if ('geolocation' in navigator) {
        showLoading();
        console.log('📍 Requesting user location...');
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.log(`✅ Location obtained: ${position.coords.latitude}, ${position.coords.longitude}`);
                fetchWeatherByCoords(position.coords.latitude, position.coords.longitude);
            },
            (error) => {
                console.error('❌ Geolocation error:', error);
                hideLoading();
                showError('Tidak dapat mengakses lokasi. Mohon izinkan akses lokasi atau cari kota secara manual.');
                // Default to Jakarta if location denied
                setTimeout(() => {
                    searchWeather('Jakarta');
                }, 2000);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    } else {
        showError('Geolocation tidak didukung oleh browser Anda.');
        searchWeather('Jakarta');
    }
}

// ========================================
// API CALLS
// ========================================
async function fetchWeatherByCoords(lat, lon) {
    try {
        console.log(`🌐 Fetching weather for coordinates: ${lat}, ${lon}`);
        
        const weatherResponse = await fetch(
            `${API_BASE}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${currentUnit}&lang=id`
        );
        
        if (!weatherResponse.ok) {
            throw new Error(`HTTP error! status: ${weatherResponse.status}`);
        }
        
        const weatherData = await weatherResponse.json();
        console.log('✅ Weather data received:', weatherData);
        
        currentWeatherData = weatherData;
        displayWeather(weatherData);
        fetchForecast(weatherData.name);
        addToRecentSearches(weatherData.name);
        
        // Cache weather data
        cacheWeatherData(weatherData);
        
    } catch (error) {
        console.error('❌ Error fetching weather:', error);
        hideLoading();
        showError('Gagal mengambil data cuaca: ' + error.message);
    }
}

async function searchWeather(cityName = null) {
    const city = cityName || elements.searchInput.value.trim();
    
    if (!city) {
        showError('Mohon masukkan nama kota');
        return;
    }

    showLoading();
    hideError();
    console.log(`🔍 Searching weather for: ${city}`);

    try {
        const weatherResponse = await fetch(
            `${API_BASE}/weather?q=${city}&appid=${API_KEY}&units=${currentUnit}&lang=id`
        );
        
        if (!weatherResponse.ok) {
            if (weatherResponse.status === 404) {
                throw new Error('Kota tidak ditemukan. Periksa ejaan dan coba lagi.');
            }
            throw new Error(`HTTP error! status: ${weatherResponse.status}`);
        }
        
        const weatherData = await weatherResponse.json();
        console.log('✅ Weather data received:', weatherData);
        
        currentWeatherData = weatherData;
        displayWeather(weatherData);
        fetchForecast(city);
        addToRecentSearches(city);
        elements.searchInput.value = '';
        
        // Cache weather data
        cacheWeatherData(weatherData);
        
    } catch (error) {
        console.error('❌ Search error:', error);
        hideLoading();
        showError('Gagal mencari cuaca: ' + error.message);
    }
}

async function fetchForecast(city) {
    try {
        console.log(`📅 Fetching forecast for: ${city}`);
        
        const forecastResponse = await fetch(
            `${API_BASE}/forecast?q=${city}&appid=${API_KEY}&units=${currentUnit}&lang=id`
        );
        
        if (!forecastResponse.ok) {
            throw new Error(`HTTP error! status: ${forecastResponse.status}`);
        }
        
        const forecastData = await forecastResponse.json();
        console.log('✅ Forecast data received');
        displayForecast(forecastData);
        
    } catch (error) {
        console.error('❌ Forecast error:', error);
        // Don't show error to user, just log it
    }
}

// ========================================
// DISPLAY FUNCTIONS
// ========================================
function displayWeather(data) {
    hideLoading();
    hideError();
    elements.mainWeather.classList.remove('hidden');

    console.log('📊 Displaying weather data');

    // Update background based on weather condition
    const weatherMain = data.weather[0].main;
    if (weatherBackgrounds[weatherMain]) {
        document.body.style.background = weatherBackgrounds[weatherMain];
    }

    // Display location
    elements.cityName.textContent = `${data.name}, ${data.sys.country}`;
    
    // Display weather icon
    const iconCode = data.weather[0].icon;
    elements.weatherIcon.textContent = weatherIcons[iconCode] || '🌡️';
    
    // Display temperature
    const temp = Math.round(data.main.temp);
    const unit = currentUnit === 'metric' ? '°C' : '°F';
    elements.temperature.textContent = `${temp}${unit}`;
    
    // Display description
    elements.weatherDescription.textContent = data.weather[0].description;
    
    // Display details
    elements.feelsLike.textContent = `${Math.round(data.main.feels_like)}${unit}`;
    elements.humidity.textContent = `${data.main.humidity}%`;
    
    const windSpeed = currentUnit === 'metric' 
        ? `${Math.round(data.wind.speed)} m/s` 
        : `${Math.round(data.wind.speed)} mph`;
    elements.windSpeed.textContent = windSpeed;
    
    elements.pressure.textContent = `${data.main.pressure} hPa`;
    
    // Display sunrise and sunset
    if (data.sys.sunrise && data.sys.sunset) {
        elements.sunrise.textContent = formatTime(data.sys.sunrise);
        elements.sunset.textContent = formatTime(data.sys.sunset);
    }
}

function displayForecast(data) {
    elements.forecastSection.classList.remove('hidden');
    elements.forecastGrid.innerHTML = '';

    console.log('📅 Displaying forecast');

    // Group forecasts by day
    const dailyForecasts = {};
    data.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const day = date.toDateString();
        
        // Get midday forecast (around 12:00) for each day
        if (!dailyForecasts[day] || date.getHours() >= 12) {
            dailyForecasts[day] = item;
        }
    });

    // Display first 5 days
    Object.values(dailyForecasts).slice(0, 5).forEach(forecast => {
        const date = new Date(forecast.dt * 1000);
        const dayName = dayNames[date.getDay()];
        const temp = Math.round(forecast.main.temp);
        const unit = currentUnit === 'metric' ? '°C' : '°F';
        const icon = weatherIcons[forecast.weather[0].icon] || '🌡️';
        const description = forecast.weather[0].description;
        const humidity = forecast.main.humidity;

        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.innerHTML = `
            <div class="forecast-day">${dayName}</div>
            <div class="forecast-icon">${icon}</div>
            <div style="font-size: 0.9rem; color: var(--text-secondary); margin: 5px 0; text-transform: capitalize;">
                ${description}
            </div>
            <div class="forecast-temp">${temp}${unit}</div>
            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 8px;">
                💧 Kelembaban: ${humidity}%
            </div>
        `;
        
        // Add click event for more details
        card.addEventListener('click', () => {
            showForecastDetails(forecast);
        });
        
        elements.forecastGrid.appendChild(card);
    });
}

function showForecastDetails(forecast) {
    const date = new Date(forecast.dt * 1000);
    const unit = currentUnit === 'metric' ? '°C' : '°F';
    
    const details = `
📅 ${dayNames[date.getDay()]}, ${date.toLocaleDateString('id-ID')}
🌡️ Suhu: ${Math.round(forecast.main.temp)}${unit}
🤔 Terasa seperti: ${Math.round(forecast.main.feels_like)}${unit}
☁️ Kondisi: ${forecast.weather[0].description}
💧 Kelembaban: ${forecast.main.humidity}%
💨 Angin: ${Math.round(forecast.wind.speed)} ${currentUnit === 'metric' ? 'm/s' : 'mph'}
🔽 Tekanan: ${forecast.main.pressure} hPa
    `;
    
    alert(details);
}

// ========================================
// RECENT SEARCHES
// ========================================
function addToRecentSearches(city) {
    let searches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    
    // Remove duplicates (case-insensitive)
    searches = searches.filter(s => s.toLowerCase() !== city.toLowerCase());
    
    // Add to beginning
    searches.unshift(city);
    
    // Keep only last 5 searches
    searches = searches.slice(0, 5);
    
    localStorage.setItem('recentSearches', JSON.stringify(searches));
    loadRecentSearches();
    
    console.log('💾 Recent searches updated:', searches);
}

function loadRecentSearches() {
    const searches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    elements.recentSearches.innerHTML = '';

    if (searches.length > 0) {
        const label = document.createElement('div');
        label.style.cssText = 'color: var(--text-secondary); margin-bottom: 10px; font-size: 0.9rem; font-weight: 600;';
        label.textContent = '🕒 Pencarian Terakhir:';
        elements.recentSearches.appendChild(label);

        searches.forEach(city => {
            const tag = document.createElement('span');
            tag.className = 'recent-tag';
            tag.textContent = city;
            tag.setAttribute('role', 'button');
            tag.setAttribute('tabindex', '0');
            tag.onclick = () => searchWeather(city);
            tag.onkeypress = (e) => {
                if (e.key === 'Enter') searchWeather(city);
            };
            elements.recentSearches.appendChild(tag);
        });
    }
}

// ========================================
// FAVORITES MANAGEMENT
// ========================================
function addToFavorites(data) {
    let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    const cityName = `${data.name}, ${data.sys.country}`;
    
    // Check if already in favorites
    if (favorites.find(f => f.name === cityName)) {
        showError('⚠️ Kota sudah ada di favorit!');
        setTimeout(hideError, 2000);
        return;
    }

    const unit = currentUnit === 'metric' ? '°C' : '°F';
    const favoriteItem = {
        name: cityName,
        temp: Math.round(data.main.temp),
        unit: unit,
        icon: weatherIcons[data.weather[0].icon] || '🌡️',
        description: data.weather[0].description,
        timestamp: Date.now()
    };

    favorites.push(favoriteItem);
    localStorage.setItem('favorites', JSON.stringify(favorites));
    loadFavorites();
    
    // Show success message
    showError('✅ Berhasil ditambahkan ke favorit!');
    setTimeout(hideError, 2000);
    
    console.log('⭐ Added to favorites:', cityName);
}

function loadFavorites() {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    elements.favoritesGrid.innerHTML = '';

    if (favorites.length === 0) {
        elements.favoritesGrid.innerHTML = '<p style="color: var(--text-secondary); grid-column: 1/-1;">Belum ada lokasi favorit. Tambahkan lokasi favorit Anda!</p>';
        return;
    }

    favorites.forEach((fav, index) => {
        const card = document.createElement('div');
        card.className = 'favorite-card';
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        
        card.innerHTML = `
            <button class="remove-favorite" onclick="removeFavorite(${index})" aria-label="Hapus dari favorit">×</button>
            <div style="font-size: 3rem; margin-bottom: 10px;">${fav.icon}</div>
            <div style="font-weight: 700; font-size: 1.1rem; margin-bottom: 5px; color: var(--text-primary);">${fav.name}</div>
            <div style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin: 10px 0;">${fav.temp}${fav.unit}</div>
            <div style="font-size: 0.9rem; color: var(--text-secondary); text-transform: capitalize;">${fav.description}</div>
        `;
        
        card.onclick = (e) => {
            if (!e.target.classList.contains('remove-favorite')) {
                const cityName = fav.name.split(',')[0].trim();
                searchWeather(cityName);
            }
        };
        
        elements.favoritesGrid.appendChild(card);
    });
    
    console.log(`⭐ Loaded ${favorites.length} favorites`);
}

function removeFavorite(index) {
    let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    const removed = favorites.splice(index, 1);
    localStorage.setItem('favorites', JSON.stringify(favorites));
    loadFavorites();
    console.log('🗑️ Removed from favorites:', removed[0].name);
}

// ========================================
// CACHING
// ========================================
function cacheWeatherData(data) {
    const cacheKey = `weather_${data.name}`;
    const cacheData = {
        data: data,
        timestamp: Date.now()
    };
    
    try {
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        console.log(`💾 Cached weather data for: ${data.name}`);
    } catch (e) {
        console.warn('⚠️ Cache storage failed:', e);
    }
}

// ========================================
// UI HELPER FUNCTIONS
// ========================================
function showLoading() {
    elements.loadingIndicator.classList.remove('hidden');
    elements.mainWeather.classList.add('hidden');
    elements.forecastSection.classList.add('hidden');
}

function hideLoading() {
    elements.loadingIndicator.classList.add('hidden');
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
    console.error('⚠️', message);
}

function hideError() {
    elements.errorMessage.classList.add('hidden');
}

// ========================================
// UTILITY FUNCTIONS
// ========================================
function formatTime(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
    });
}

// ========================================
// KEYBOARD NAVIGATION
// ========================================
document.addEventListener('keydown', (e) => {
    // Press 'S' to focus search input
    if (e.key === 's' && !e.ctrlKey && !e.metaKey && document.activeElement !== elements.searchInput) {
        e.preventDefault();
        elements.searchInput.focus();
    }
    
    // Press 'L' to get user location
    if (e.key === 'l' && !e.ctrlKey && !e.metaKey && document.activeElement !== elements.searchInput) {
        e.preventDefault();
        getUserLocation();
    }
    
    // Press 'T' to toggle theme
    if (e.key === 't' && !e.ctrlKey && !e.metaKey && document.activeElement !== elements.searchInput) {
        e.preventDefault();
        toggleTheme();
    }
});

// ========================================
// PERFORMANCE OPTIMIZATION
// ========================================
// Debounce function for search input
function debounce(func, wait) {
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

// Optional: Add auto-complete for search
elements.searchInput.addEventListener('input', debounce((e) => {
    const value = e.target.value.trim();
    if (value.length >= 3) {
        console.log('🔍 Search suggestion for:', value);
        // You can implement autocomplete API call here if needed
    }
}, 300));

// ========================================
// OFFLINE SUPPORT
// ========================================
window.addEventListener('online', () => {
    console.log('🌐 Connection restored');
    showError('✅ Koneksi internet tersambung kembali!');
    setTimeout(hideError, 2000);
});

window.addEventListener('offline', () => {
    console.log('📴 Connection lost');
    showError('⚠️ Tidak ada koneksi internet. Menampilkan data cache.');
});

// ========================================
// ERROR HANDLING
// ========================================
window.addEventListener('error', (e) => {
    console.error('❌ Global error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('❌ Unhandled promise rejection:', e.reason);
});

console.log('✅ Script loaded successfully!');
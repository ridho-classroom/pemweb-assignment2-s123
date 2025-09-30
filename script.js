// =================================
// API Configuration & State
// =================================
const API_KEY = 'd5e5ba80c52a897fc274c681a6f01b29'; // API Key gratis v2.5 Anda
const API_BASE = 'https://api.openweathermap.org/data/2.5';

let state = {
    currentUnit: 'metric',
    theme: 'light',
    favorites: [],
    recentSearches: [],
    currentLocation: null,
};

// Variabel untuk menyimpan timer debounce
let debounceTimer;

// =================================
// DOM Elements
// =================================
const elements = {
    html: document.documentElement,
    searchForm: document.getElementById('searchForm'),
    searchInput: document.getElementById('searchInput'),
    searchSuggestions: document.getElementById('searchSuggestions'),
    locationBtn: document.getElementById('locationBtn'),
    unitToggle: document.getElementById('unitToggle'),
    themeToggle: document.getElementById('themeToggle'),
    themeIcon: document.getElementById('themeIcon'),
    loadingState: document.getElementById('loadingState'),
    errorState: document.getElementById('errorState'),
    errorMessage: document.getElementById('errorMessage'),
    retryBtn: document.getElementById('retryBtn'),
    currentWeather: document.getElementById('currentWeather'),
    hourlyForecastSection: document.getElementById('hourlyForecastSection'),
    hourlyForecast: document.getElementById('hourlyForecast'),
    forecastSection: document.querySelector('.forecast-section'),
    favoritesSection: document.querySelector('.favorites-section'),
    recentSection: document.querySelector('.recent-section'),
    favoriteBtn: document.getElementById('favoriteBtn')
};

function init() {
    loadState();
    setupEventListeners();
    applyTheme();
    updateUnitLabel();
    renderFavorites();
    renderRecentSearches();
    if (navigator.geolocation) {
        getUserLocation();
    } else {
        searchCity('Jakarta');
    }
}

function setupEventListeners() {
    elements.searchForm.addEventListener('submit', handleSearch);
    elements.searchInput.addEventListener('input', handleSearchInput);
    elements.locationBtn.addEventListener('click', getUserLocation);
    elements.unitToggle.addEventListener('click', toggleUnit);
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.retryBtn.addEventListener('click', () => {
        if (state.currentLocation) {
            getWeatherByCoords(state.currentLocation.lat, state.currentLocation.lon);
        }
    });
    elements.favoriteBtn.addEventListener('click', toggleFavorite);
    document.addEventListener('click', (e) => {
        if (!elements.searchForm.contains(e.target)) {
            elements.searchSuggestions.classList.remove('active');
        }
    });
}

function loadState() {
    const saved = localStorage.getItem('weatherAppState');
    if (saved) {
        state = { ...state, ...JSON.parse(saved) };
    }
}

function saveState() {
    localStorage.setItem('weatherAppState', JSON.stringify(state));
}

function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    applyTheme();
    saveState();
}

function applyTheme() {
    elements.html.setAttribute('data-theme', state.theme);
    const sunIcon = '<path d="M12 1v2"/><path d="M12 21v2"/><path d="m4.2 4.2 1.4 1.4"/><path d="m18.4 18.4 1.4 1.4"/><path d="M1 12h2"/><path d="M21 12h2"/><path d="m4.2 19.8 1.4-1.4"/><path d="m18.4 5.6 1.4-1.4"/><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
    const moonIcon = '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
    elements.themeIcon.innerHTML = state.theme === 'dark' ? sunIcon : moonIcon;
}

function toggleUnit() {
    state.currentUnit = state.currentUnit === 'metric' ? 'imperial' : 'metric';
    updateUnitLabel();
    saveState();
    if (state.currentLocation) {
        getWeatherByCoords(state.currentLocation.lat, state.currentLocation.lon);
    }
}

function updateUnitLabel() {
    elements.unitToggle.querySelector('.unit-label').textContent = state.currentUnit === 'metric' ? '°C' : '°F';
}

function getUserLocation() {
    if (!navigator.geolocation) {
        showError('Geolocation tidak didukung oleh browser Anda');
        return;
    }
    showLoading();
    navigator.geolocation.getCurrentPosition(
        (position) => getWeatherByCoords(position.coords.latitude, position.coords.longitude),
        () => {
            hideLoading();
            showError('Tidak dapat mengakses lokasi Anda.');
        }
    );
}

function handleSearch(e) {
    e.preventDefault();
    const city = elements.searchInput.value.trim();
    if (city) {
        searchCity(city);
        elements.searchInput.value = '';
        elements.searchSuggestions.classList.remove('active');
    }
}

function handleSearchInput(e) {
    clearTimeout(debounceTimer);
    const query = e.target.value.trim();

    if (query.length >= 3) {
        debounceTimer = setTimeout(async () => {
            try {
                const response = await fetch(`https://wft-geo-db.p.rapidapi.com/v1/geo/cities?minPopulation=100000&namePrefix=${query}&languageCode=id`, {
                    "method": "GET"
                });
                const data = await response.json();
                if (elements.searchInput.value.trim() === query) {
                    if (data.data) {
                        showSearchSuggestions(data.data);
                    }
                }
            } catch (error) {
                console.error("Gagal mengambil saran kota:", error);
                elements.searchSuggestions.classList.remove('active');
            }
        }, 400);
    } else {
        elements.searchSuggestions.classList.remove('active');
    }
}

function showSearchSuggestions(suggestions) {
    if (suggestions.length > 0) {
        const html = suggestions.map(city => 
            `<div class="suggestion-item" onclick="selectCity('${city.name}')">
                ${city.name}, ${city.country}
            </div>`
        ).join('');
        
        elements.searchSuggestions.innerHTML = html;
        elements.searchSuggestions.classList.add('active');
    } else {
        elements.searchSuggestions.classList.remove('active');
    }
}

window.selectCity = function(city) {
    elements.searchInput.value = city;
    elements.searchSuggestions.classList.remove('active');
    searchCity(city);
}

async function searchCity(city) {
    showLoading();
    hideError();
    try {
        const response = await fetch(`${API_BASE}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=${state.currentUnit}&lang=id`);
        if (!response.ok) {
            if (response.status === 401) throw new Error('API key tidak valid atau belum aktif.');
            if (response.status === 404) throw new Error(`Kota "${city}" tidak ditemukan.`);
            throw new Error('Terjadi kesalahan server.');
        }
        const data = await response.json();
        addToRecentSearches(city);
        await getWeatherByCoords(data.coord.lat, data.coord.lon, data.name);
    } catch (error) {
        hideLoading();
        showError(error.message);
    }
}

async function getWeatherByCoords(lat, lon, cityName = null) {
    showLoading();
    hideError();
    try {
        const [currentResponse, forecastResponse] = await Promise.all([
            fetch(`${API_BASE}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${state.currentUnit}&lang=id`),
            // --- INI BAGIAN YANG DIPERBAIKI ---
            fetch(`${API_BASE}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${state.currentUnit}&lang=id`)
        ]);

        if (!currentResponse.ok || !forecastResponse.ok) {
            if (currentResponse.status === 401) throw new Error('API key tidak valid atau belum aktif.');
            throw new Error('Gagal mengambil data cuaca.');
        }
        
        const currentData = await currentResponse.json();
        const forecastData = await forecastResponse.json();
        
        state.currentLocation = { lat, lon, name: cityName || currentData.name, country: currentData.sys.country };
        
        displayCurrentWeather(currentData);
        displayHourlyForecast(forecastData);
        displayForecast(forecastData);
        
        saveState();
        hideLoading();
    } catch (error) {
        hideLoading();
        showError(error.message);
    }
}

function displayCurrentWeather(data) {
    const unit = state.currentUnit === 'metric' ? '°C' : '°F';
    document.getElementById('locationName').textContent = `${data.name}, ${data.sys.country}`;
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('temperature').textContent = `${Math.round(data.main.temp)}${unit}`;
    document.getElementById('weatherDescription').textContent = data.weather[0].description;
    document.getElementById('weatherIcon').src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@4x.png`;
    document.getElementById('weatherIcon').alt = data.weather[0].description;
    document.getElementById('feelsLike').textContent = `${Math.round(data.main.feels_like)}${unit}`;
    document.getElementById('humidity').textContent = `${data.main.humidity}%`;
    document.getElementById('windSpeed').textContent = `${Math.round(data.wind.speed)} ${state.currentUnit === 'metric' ? 'm/s' : 'mph'}`;
    document.getElementById('pressure').textContent = `${data.main.pressure} hPa`;
    elements.currentWeather.classList.add('active');
    updateFavoriteButton();
}

function displayHourlyForecast(data) {
    const hourlyData = data.list.slice(0, 8);
    const unit = state.currentUnit === 'metric' ? '°C' : '°F';
    const html = hourlyData.map(item => `
        <div class="hourly-item card">
            <div class="hourly-time">${new Date(item.dt * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
            <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}@2x.png" alt="${item.weather[0].description}" class="hourly-icon">
            <div class="hourly-temp">${Math.round(item.main.temp)}${unit}</div>
        </div>
    `).join('');
    elements.hourlyForecast.innerHTML = html;
    elements.hourlyForecastSection.classList.add('active');
}

function displayForecast(data) {
    const dailyData = {};
    data.list.forEach(item => {
        const date = new Date(item.dt * 1000).toLocaleDateString('id-ID');
        if (!dailyData[date]) {
            dailyData[date] = { temps: [], weathers: [], date: new Date(item.dt * 1000) };
        }
        dailyData[date].temps.push(item.main.temp);
        dailyData[date].weathers.push(item.weather[0]);
    });

    const unit = state.currentUnit === 'metric' ? '°C' : '°F';
    const days = Object.values(dailyData).slice(0, 5);
    const html = days.map(day => {
        const weather = day.weathers[Math.floor(day.weathers.length / 2)];
        return `
        <div class="forecast-card card">
            <div class="forecast-date">${day.date.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' })}</div>
            <img src="https://openweathermap.org/img/wn/${weather.icon}@2x.png" alt="${weather.description}" class="forecast-icon">
            <div class="forecast-temps">
                <span class="temp-high">${Math.round(Math.max(...day.temps))}${unit}</span>
                <span class="temp-low">${Math.round(Math.min(...day.temps))}${unit}</span>
            </div>
        </div>`;
    }).join('');
    document.getElementById('forecastCards').innerHTML = html;
    elements.forecastSection.classList.add('active');
}

function toggleFavorite() { if (!state.currentLocation) return; const locationKey = `${state.currentLocation.name}, ${state.currentLocation.country}`; const index = state.favorites.findIndex(fav => fav.name === locationKey); if (index > -1) { state.favorites.splice(index, 1); } else { state.favorites.push({ name: locationKey, lat: state.currentLocation.lat, lon: state.currentLocation.lon }); } saveState(); updateFavoriteButton(); renderFavorites(); }
function updateFavoriteButton() { if (!state.currentLocation) return; const locationKey = `${state.currentLocation.name}, ${state.currentLocation.country}`; const isFavorite = state.favorites.some(fav => fav.name === locationKey); elements.favoriteBtn.classList.toggle('active', isFavorite); }
function renderFavorites() { if (state.favorites.length === 0) { elements.favoritesSection.classList.remove('active'); return; } elements.favoritesSection.classList.add('active'); const html = state.favorites.map((fav, index) => ` <div class="favorite-item card" onclick="getWeatherByCoords(${fav.lat}, ${fav.lon})"> <div class="favorite-name">${fav.name}</div> <button class="btn-remove-fav" onclick="event.stopPropagation(); removeFavorite(${index})" aria-label="Hapus favorit"> <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> </button> </div> `).join(''); document.getElementById('favoritesList').innerHTML = html; }
window.removeFavorite = function(index) { state.favorites.splice(index, 1); saveState(); renderFavorites(); updateFavoriteButton(); }
function addToRecentSearches(city) { const normalizedCity = city.split(',')[0].trim(); state.recentSearches = state.recentSearches.filter(c => c.toLowerCase() !== normalizedCity.toLowerCase()); state.recentSearches.unshift(normalizedCity); state.recentSearches = state.recentSearches.slice(0, 5); saveState(); renderRecentSearches(); }
function renderRecentSearches() { if (state.recentSearches.length === 0) { elements.recentSection.classList.remove('active'); return; } elements.recentSection.classList.add('active'); const html = state.recentSearches.map(city => `<button class="recent-item" onclick="searchCity('${city}')">${city}</button>`).join(''); document.getElementById('recentSearches').innerHTML = html; }
function showLoading() { elements.loadingState.classList.add('active'); elements.currentWeather.classList.remove('active'); elements.errorState.classList.remove('active'); }
function hideLoading() { elements.loadingState.classList.remove('active'); }
function showError(message) { elements.errorMessage.textContent = message; elements.errorState.classList.add('active'); elements.currentWeather.classList.remove('active'); }
function hideError() { elements.errorState.classList.remove('active'); }

init();
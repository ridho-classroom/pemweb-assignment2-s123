const API_KEY = '6adde0f60056666788c2c4f63301a053'; 
const BASE_URL = 'https://api.openweathermap.org/data/2.5/';

const elements = {
    locationName: document.getElementById('current-location'),
    currentTemp: document.getElementById('current-temp'),
    currentCondition: document.getElementById('current-condition'),
    currentIcon: document.getElementById('current-icon'),
    humidity: document.getElementById('humidity-val'),
    windSpeed: document.getElementById('wind-speed-val'),
    feelsLike: document.getElementById('feels-like-temp'),
    sunrise: document.getElementById('sunrise-time'),
    sunset: document.getElementById('sunset-time'),
    searchField: document.getElementById('city-search'),
    searchButton: document.getElementById('search-button'),
    searchSuggestions: document.getElementById('search-suggestions'),
    searchError: document.getElementById('search-error'),
    searchHistoryList: document.getElementById('search-history-list'),
    forecastContainer: document.getElementById('forecast-container'),
    favoriteList: document.getElementById('favorite-locations'),
    addFavoriteBtn: document.getElementById('add-favorite-btn'),
    unitToggle: document.getElementById('unit-toggle'),
    themeToggle: document.getElementById('theme-toggle'),
    loadingIndicator: document.getElementById('loading-indicator'),
    globalError: document.getElementById('global-error'),
    lastUpdated: document.getElementById('last-updated'),
};

let state = {
    units: 'celsius',
    theme: 'light',
    favorites: [],
    searchHistory: [],
    currentLocationData: null, 
};

let debounceTimeout;

// UTILITY FUNCTIONS

const convertTemp = (kelvin, unit) => {
    if (kelvin === undefined || kelvin === null) return '--';
    const celsius = kelvin - 273.15;
    return unit === 'fahrenheit' ? `${Math.round(celsius * 9/5 + 32)}°F` : `${Math.round(celsius)}°C`;
};

const setLoading = (isLoading) => {
    if (!elements.loadingIndicator) return;
    elements.loadingIndicator.style.display = isLoading ? 'block' : 'none';
    elements.loadingIndicator.setAttribute('aria-hidden', !isLoading);
};

const displayError = (message, targetEl = elements.globalError) => {
    if (!targetEl) return;
    targetEl.textContent = message;
    targetEl.style.display = 'block';
    setTimeout(() => { targetEl.style.display = 'none'; }, 5000);
};

const renderSuggestions = (suggestions) => {
    if (!elements.searchSuggestions) return;
    
    elements.searchSuggestions.innerHTML = ''; 
    
    if (suggestions.length === 0) { 
        elements.searchSuggestions.style.display = 'none'; 
        return; 
    }
    
    suggestions.forEach((city) => {
        const li = document.createElement('li');
        li.textContent = city;
        li.tabIndex = 0;
        li.setAttribute('role', 'option');
        
        const selectCity = () => {
            const cityNameOnly = city.split(',')[0].trim();
            window.searchCity(cityNameOnly);
            elements.searchSuggestions.style.display = 'none';
            elements.searchField.value = '';
        };
        
        li.addEventListener('click', selectCity);
        li.addEventListener('keypress', (e) => { 
            if (e.key === 'Enter') selectCity(); 
        });
        
        elements.searchSuggestions.appendChild(li);
    });
    
    elements.searchSuggestions.style.display = 'block';
};

// MODAL FUNCTIONS

const createForecastModal = () => {
    if (document.getElementById('forecast-modal')) return;
    
    const modal = document.createElement('div');
    modal.id = 'forecast-modal';
    modal.className = 'forecast-modal';
    modal.innerHTML = `
        <div class="forecast-modal-content">
            <button class="forecast-modal-close" aria-label="Tutup modal">&times;</button>
            <h3 id="forecast-modal-title">Detail Prakiraan</h3>
            <div class="forecast-modal-details" id="forecast-modal-details"></div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Close modal on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeForecastModal();
    });
    
    // Close button
    modal.querySelector('.forecast-modal-close').addEventListener('click', closeForecastModal);
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeForecastModal();
        }
    });
};

const showForecastModal = (details) => {
    const modal = document.getElementById('forecast-modal');
    const title = document.getElementById('forecast-modal-title');
    const detailsContainer = document.getElementById('forecast-modal-details');
    
    if (!modal || !details.main || !details.weather) return;
    
    const detailTime = new Date(details.dt * 1000);
    const dayName = detailTime.toLocaleDateString('id-ID', { weekday: 'long' });
    const dateStr = detailTime.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = detailTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    
    title.textContent = `${dayName}, ${dateStr}`;
    
    const detailTemp = convertTemp(details.main.temp, state.units);
    const detailFeelsLike = convertTemp(details.main.feels_like, state.units);
    const detailTempMax = convertTemp(details.main.temp_max, state.units);
    const detailTempMin = convertTemp(details.main.temp_min, state.units);
    const detailCondition = details.weather[0].description.toUpperCase();
    const detailHumidity = details.main.humidity;
    const detailPressure = details.main.pressure;
    const detailWindSpeed = state.units === 'fahrenheit' 
        ? `${(details.wind.speed * 2.237).toFixed(1)} mph`
        : `${details.wind.speed.toFixed(1)} m/s`;
    const detailClouds = details.clouds.all;
    
    detailsContainer.innerHTML = `
        <div class="forecast-modal-detail">
            <span class="forecast-modal-label">Waktu:</span>
            <span class="forecast-modal-value">${timeStr}</span>
        </div>
        <div class="forecast-modal-detail">
            <span class="forecast-modal-label">Kondisi:</span>
            <span class="forecast-modal-value">${detailCondition}</span>
        </div>
        <div class="forecast-modal-detail">
            <span class="forecast-modal-label">Suhu:</span>
            <span class="forecast-modal-value">${detailTemp}</span>
        </div>
        <div class="forecast-modal-detail">
            <span class="forecast-modal-label">Terasa Seperti:</span>
            <span class="forecast-modal-value">${detailFeelsLike}</span>
        </div>
        <div class="forecast-modal-detail">
            <span class="forecast-modal-label">Suhu Tertinggi:</span>
            <span class="forecast-modal-value">${detailTempMax}</span>
        </div>
        <div class="forecast-modal-detail">
            <span class="forecast-modal-label">Suhu Terendah:</span>
            <span class="forecast-modal-value">${detailTempMin}</span>
        </div>
        <div class="forecast-modal-detail">
            <span class="forecast-modal-label">Kelembaban:</span>
            <span class="forecast-modal-value">${detailHumidity}%</span>
        </div>
        <div class="forecast-modal-detail">
            <span class="forecast-modal-label">Kecepatan Angin:</span>
            <span class="forecast-modal-value">${detailWindSpeed}</span>
        </div>
        <div class="forecast-modal-detail">
            <span class="forecast-modal-label">Tekanan:</span>
            <span class="forecast-modal-value">${detailPressure} hPa</span>
        </div>
        <div class="forecast-modal-detail">
            <span class="forecast-modal-label">Awan:</span>
            <span class="forecast-modal-value">${detailClouds}%</span>
        </div>
    `;
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
};

const closeForecastModal = () => {
    const modal = document.getElementById('forecast-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
};

// API FUNCTIONS

const fetchCitySuggestions = async (query) => {
    if (!query || query.trim().length < 2) return [];
    
    const cleanQuery = query.trim();
    const GEO_URL = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(cleanQuery)}&limit=5&appid=${API_KEY}`;
    
    try {
        const response = await fetch(GEO_URL);
        if (!response.ok) return [];
        
        const data = await response.json();
        if (!data || data.length === 0) return [];
        
        const uniqueSuggestions = new Set();
        
        data.forEach(item => {
            if (!item.name) return;
            let locationName = item.name;
            if (item.state) locationName += `, ${item.state}`;
            if (item.country) locationName += `, ${item.country}`;
            uniqueSuggestions.add(locationName);
        });
        
        return Array.from(uniqueSuggestions);
    } catch (error) {
        console.error("Error fetching suggestions:", error);
        return [];
    }
};

const fetchWeather = async (queryType, queryValue) => {
    setLoading(true);
    if (elements.globalError) elements.globalError.style.display = 'none';
    
    let url = '';
    if (queryType === 'coords') {
        url = `${BASE_URL}weather?lat=${queryValue.lat}&lon=${queryValue.lon}&appid=${API_KEY}`;
    } else if (queryType === 'city') {
        url = `${BASE_URL}weather?q=${encodeURIComponent(queryValue)}&appid=${API_KEY}`;
    } else { 
        setLoading(false); 
        return null; 
    }

    try {
        const response = await fetch(url);
        if (!response.ok) { 
            const errorData = await response.json().catch(() => ({})); 
            throw new Error(errorData.message || 'Kota tidak ditemukan.'); 
        }
        
        const data = await response.json();
        state.currentLocationData = data; 
        
        if (elements.lastUpdated) {
            elements.lastUpdated.textContent = `Terakhir diperbarui: ${new Date().toLocaleString('id-ID')}`;
        }
        
        return data;
    } catch (error) {
        displayError(`Gagal mengambil cuaca: ${error.message}`);
        return null;
    } finally {
        setLoading(false);
    }
};

const fetchForecast = async (lat, lon) => {
    const url = `${BASE_URL}forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Gagal mengambil prakiraan.');
        return await response.json();
    } catch (error) {
        console.error("Gagal mengambil prakiraan 5 hari:", error);
        return null;
    }
};

// RENDER FUNCTIONS

const renderCurrentWeather = (data) => {
    if (!data || !data.main || !data.weather) return;
    
    const temp = convertTemp(data.main.temp, state.units);
    const feelsLikeTemp = convertTemp(data.main.feels_like, state.units);
    
    const windSpeed = state.units === 'fahrenheit' 
        ? `${(data.wind.speed * 2.237).toFixed(1)} mph`
        : `${data.wind.speed.toFixed(1)} m/s`;
        
    const formatTime = (timestamp) => {
        if (!timestamp) return '--';
        return new Date(timestamp * 1000).toLocaleTimeString('id-ID', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    if (elements.locationName) elements.locationName.textContent = `${data.name}, ${data.sys.country}`;
    if (elements.currentTemp) elements.currentTemp.textContent = temp;
    if (elements.currentCondition) elements.currentCondition.textContent = data.weather[0].description.toUpperCase();
    if (elements.currentIcon) {
        elements.currentIcon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
        elements.currentIcon.alt = data.weather[0].description;
    }
    if (elements.humidity) elements.humidity.textContent = `${data.main.humidity}%`;
    if (elements.windSpeed) elements.windSpeed.textContent = windSpeed;
    if (elements.feelsLike) elements.feelsLike.textContent = feelsLikeTemp;
    if (elements.sunrise) elements.sunrise.textContent = formatTime(data.sys.sunrise);
    if (elements.sunset) elements.sunset.textContent = formatTime(data.sys.sunset);
};

const renderForecast = (forecastData) => {
    if (!elements.forecastContainer) return;
    
    elements.forecastContainer.innerHTML = '';
    if (!forecastData || !forecastData.list) return;
    
    const dailyForecasts = forecastData.list
        .filter(item => item.dt_txt.includes("12:00:00"))
        .slice(0, 5);
    
    dailyForecasts.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dayName = date.toLocaleDateString('id-ID', { weekday: 'short' });
        const highTemp = convertTemp(item.main.temp_max, state.units);
        const lowTemp = convertTemp(item.main.temp_min, state.units);
        
        const div = document.createElement('div');
        div.className = 'forecast-item';
        div.tabIndex = 0;
        div.setAttribute('role', 'button');
        div.setAttribute('aria-label', `Prakiraan untuk ${dayName}`);
        div.innerHTML = `
            <p><strong>${dayName}</strong></p>
            <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png" alt="${item.weather[0].description}">
            <p class="forecast-temp">${highTemp} / ${lowTemp}</p>
            <small>${item.weather[0].main}</small>
        `;
        
        const showDetails = () => showForecastModal(item);
        
        div.addEventListener('click', showDetails);
        div.addEventListener('keypress', (e) => { 
            if (e.key === 'Enter') showDetails(); 
        });
        
        elements.forecastContainer.appendChild(div);
    });
};

const updateWeatherDisplay = async (queryType, queryValue) => {
    const currentData = await fetchWeather(queryType, queryValue);
    if (currentData) {
        renderCurrentWeather(currentData);
        const forecastData = await fetchForecast(currentData.coord.lat, currentData.coord.lon);
        if (forecastData) renderForecast(forecastData);
        return true; 
    }
    return false; 
};

const getUserLocation = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                updateWeatherDisplay('coords', { lat: latitude, lon: longitude });
            },
            (error) => {
                console.error('Geolocation Error:', error);
                displayError('Izin lokasi ditolak. Menampilkan cuaca Jakarta sebagai default.');
                updateWeatherDisplay('city', 'Jakarta');
            }
        );
    } else {
        displayError('Browser tidak mendukung Geolocation. Menampilkan cuaca Jakarta sebagai default.');
        updateWeatherDisplay('city', 'Jakarta');
    }
};

window.searchCity = (cityName) => {
    const city = cityName.trim();
    if (!city) return;
    
    if (elements.searchField) elements.searchField.value = '';
    if (elements.searchSuggestions) elements.searchSuggestions.style.display = 'none';
    
    updateWeatherDisplay('city', city).then(success => {
        if (success) {
            updateSearchHistory(city);
            renderSearchHistory();
        }
    });
};

// EVENT LISTENERS

if (elements.unitToggle) {
    elements.unitToggle.addEventListener('click', () => {
        state.units = state.units === 'celsius' ? 'fahrenheit' : 'celsius';
        elements.unitToggle.textContent = state.units === 'celsius' ? '°F' : '°C'; 
        
        if (state.currentLocationData) {
            renderCurrentWeather(state.currentLocationData);
            const { lat, lon } = state.currentLocationData.coord;
            fetchForecast(lat, lon).then(data => {
                if (data) renderForecast(data);
            });
        }
    });
}

if (elements.themeToggle) {
    elements.themeToggle.addEventListener('click', () => {
        state.theme = state.theme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', state.theme);
        elements.themeToggle.textContent = state.theme === 'light' ? '🌙' : '☀️'; 
    });
}

if (elements.searchButton) {
    elements.searchButton.addEventListener('click', () => {
        const query = elements.searchField.value.trim();
        if (query) window.searchCity(query);
    });
}

if (elements.searchField) {
    elements.searchField.addEventListener('input', (e) => {
        clearTimeout(debounceTimeout);
        const query = e.target.value.trim();
        
        if (query.length >= 2) {
            debounceTimeout = setTimeout(async () => {
                const suggestions = await fetchCitySuggestions(query);
                renderSuggestions(suggestions);
            }, 300);
        } else {
            renderSuggestions([]);
        }
    });
    
    elements.searchField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            clearTimeout(debounceTimeout);
            renderSuggestions([]);
            const query = e.target.value.trim();
            if (query) window.searchCity(query);
        }
    });
    
    elements.searchField.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && elements.searchSuggestions) {
            elements.searchSuggestions.style.display = 'none';
        }
    });
}

document.addEventListener('click', (e) => {
    if (elements.searchField && elements.searchSuggestions) {
        const searchSection = document.querySelector('.search-section');
        if (searchSection && !searchSection.contains(e.target)) {
            elements.searchSuggestions.style.display = 'none';
        }
    }
});

// HISTORY & FAVORITES

window.removeHistory = (cityName) => {
    state.searchHistory = state.searchHistory.filter(item => item !== cityName);
    renderSearchHistory(); 
    displayError(`"${cityName}" berhasil dihapus dari riwayat.`);
};

window.removeFavorite = (cityKey) => {
    state.favorites = state.favorites.filter(item => item !== cityKey);
    renderFavorites(); 
    displayError(`"${cityKey}" berhasil dihapus dari favorit.`);
};

const updateSearchHistory = (cityName) => {
    const normalizedName = cityName.trim();
    state.searchHistory = state.searchHistory.filter(
        item => item.toLowerCase() !== normalizedName.toLowerCase()
    );
    state.searchHistory.unshift(normalizedName);
    state.searchHistory = state.searchHistory.slice(0, 5);
};

const renderSearchHistory = () => {
    if (!elements.searchHistoryList) return;
    
    elements.searchHistoryList.innerHTML = '';
    
    if (state.searchHistory.length === 0) {
        const emptyMsg = document.createElement('li');
        emptyMsg.innerHTML = '<span style="color: var(--secondary-color); font-style: italic;">Belum ada riwayat pencarian</span>';
        elements.searchHistoryList.appendChild(emptyMsg);
        return;
    }
    
    state.searchHistory.forEach(city => {
        const li = document.createElement('li');
        const escapedCity = city.replace(/'/g, "\\'").replace(/"/g, '\\"');
        li.innerHTML = `
            <span>${city}</span>
            <div class="action-buttons">
                <button onclick="window.searchCity('${escapedCity}')" class="control-button" aria-label="Lihat cuaca ${city}">Lihat</button>
                <button onclick="window.removeHistory('${escapedCity}')" class="control-button delete-btn" aria-label="Hapus ${city} dari riwayat">Hapus</button>
            </div>
        `;
        elements.searchHistoryList.appendChild(li);
    });
};

if (elements.addFavoriteBtn) {
    elements.addFavoriteBtn.addEventListener('click', () => {
        if (!state.currentLocationData || !state.currentLocationData.sys) {
            displayError('Tidak ada lokasi cuaca yang dimuat untuk ditambahkan.');
            return;
        }
        
        const { name, sys } = state.currentLocationData;
        const key = `${name}, ${sys.country}`;
        
        if (!state.favorites.includes(key)) {
            state.favorites.push(key);
            renderFavorites();
            
            const originalText = elements.addFavoriteBtn.innerHTML;
            elements.addFavoriteBtn.innerHTML = '<span class="material-symbols-outlined">grade</span> Tersimpan!';
            elements.addFavoriteBtn.disabled = true;
            
            setTimeout(() => { 
                elements.addFavoriteBtn.innerHTML = originalText;
                elements.addFavoriteBtn.disabled = false;
            }, 3000);
        } else {
            displayError('Lokasi ini sudah ada di favorit.');
        }
    });
}

function renderFavorites() {
    if (!elements.favoriteList) return;
    
    elements.favoriteList.innerHTML = '';
    
    if (state.favorites.length === 0) {
        const emptyMsg = document.createElement('li');
        emptyMsg.innerHTML = '<span style="color: var(--secondary-color); font-style: italic;">Belum ada lokasi favorit</span>';
        elements.favoriteList.appendChild(emptyMsg);
        return;
    }
    
    state.favorites.forEach(cityKey => {
        const city = cityKey.split(',')[0].trim();
        const escapedCity = city.replace(/'/g, "\\'").replace(/"/g, '\\"');
        const escapedKey = cityKey.replace(/'/g, "\\'").replace(/"/g, '\\"');
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${cityKey}</span>
            <div class="action-buttons">
                <button onclick="window.searchCity('${escapedCity}')" class="control-button" aria-label="Lihat cuaca ${cityKey}">Lihat</button>
                <button onclick="window.removeFavorite('${escapedKey}')" class="control-button delete-btn" aria-label="Hapus ${cityKey} dari favorit">Hapus</button>
            </div>
        `;
        elements.favoriteList.appendChild(li);
    });
}

// INITIALIZATION

function init() {
    document.documentElement.setAttribute('data-theme', state.theme);
    
    if (elements.themeToggle) {
        elements.themeToggle.textContent = state.theme === 'light' ? '🌙' : '☀️';
    }
    if (elements.unitToggle) {
        elements.unitToggle.textContent = state.units === 'celsius' ? '°F' : '°C';
    }
    
    createForecastModal();
    renderSearchHistory();
    renderFavorites();
    getUserLocation();
}

document.addEventListener('DOMContentLoaded', init);
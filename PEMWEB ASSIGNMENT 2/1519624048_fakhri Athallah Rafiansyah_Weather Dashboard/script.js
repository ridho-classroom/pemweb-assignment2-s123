// Ganti ini dengan Kunci API OpenWeatherMap Anda yang sebenarnya
const API_KEY = "ff0e1517d58d149c441ee97393524034"; 
const API_URL = "https://api.openweathermap.org/data/2.5/";

// Elemen DOM
const body = document.body;
const themeToggle = document.getElementById('theme-toggle');
const unitToggle = document.getElementById('unit-toggle');
const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const loadingSpinner = document.getElementById('loading-spinner');
const errorMessage = document.getElementById('error-message');
const currentWeatherDiv = document.getElementById('current-weather');
const forecastDiv = document.getElementById('forecast-5-days');
const historyContainer = document.getElementById('search-history');
const favoritesList = document.getElementById('favorites-list');
const autocompleteResults = document.getElementById('autocomplete-results');

// State Global (FR-4: Preferensi)
let currentUnit = localStorage.getItem('weatherUnit') || 'metric'; // 'metric' (°C) atau 'imperial' (°F)

// --- UTILITAS DAN HELPERS ---

/** Mendapatkan ikon Font Awesome berdasarkan kode cuaca OpenWeatherMap */
function getWeatherIcon(iconCode) {
    const iconMap = {
        '01d': 'fas fa-sun',       // Clear sky (day)
        '01n': 'fas fa-moon',      // Clear sky (night)
        '02d': 'fas fa-cloud-sun', // Few clouds (day)
        '02n': 'fas fa-cloud-moon',// Few clouds (night)
        '03d': 'fas fa-cloud',     // Scattered clouds
        '03n': 'fas fa-cloud',
        '04d': 'fas fa-cloud-meatball', // Broken clouds
        '04n': 'fas fa-cloud-meatball',
        '09d': 'fas fa-cloud-showers-heavy', // Shower rain
        '09n': 'fas fa-cloud-showers-heavy',
        '10d': 'fas fa-cloud-sun-rain', // Rain (day)
        '10n': 'fas fa-cloud-moon-rain',// Rain (night)
        '11d': 'fas fa-bolt',      // Thunderstorm
        '11n': 'fas fa-bolt',
        '13d': 'fas fa-snowflake', // Snow
        '13n': 'fas fa-snowflake',
        '50d': 'fas fa-smog',      // Mist
        '50n': 'fas fa-smog'
    };
    return iconMap[iconCode] || 'fas fa-question-circle';
}

/** Mengkonversi Kelvin ke Celcius atau Fahrenheit */
function formatTemperature(temp) {
    let value;
    let unitSymbol;
    if (currentUnit === 'metric') {
        value = temp; // OpenWeatherMap API sudah menyediakan data dalam Celcius jika unit='metric'
        unitSymbol = '°C';
    } else {
        // Konversi C ke F: (C * 9/5) + 32
        value = (temp * 9/5) + 32;
        unitSymbol = '°F';
    }
    return `${Math.round(value)}${unitSymbol}`;
}

/** Format kecepatan angin */
function formatWindSpeed(speed) {
    if (currentUnit === 'metric') {
        return `${Math.round(speed * 3.6)} km/h`; // Dari m/s ke km/h
    } else {
        return `${Math.round(speed)} mph`; // Dari m/s ke mph (kira-kira)
    }
}

/** Konversi timestamp Unix ke waktu lokal */
function formatTime(timestamp, timezoneOffset) {
    const date = new Date((timestamp + timezoneOffset) * 1000);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
}

/** Menampilkan pesan kesalahan */
function showStatus(isError, message) {
    if (isError) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
    } else {
        errorMessage.classList.add('hidden');
    }
}

// --- FUNGSI API UTAMA ---

/** Mengambil data cuaca berdasarkan koordinat */
async function getWeatherData(lat, lon, locationName) {
    loadingSpinner.classList.remove('hidden');
    showStatus(false, '');
    try {
        const [currentRes, forecastRes] = await Promise.all([
            fetch(`${API_URL}weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`),
            fetch(`${API_URL}forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`)
        ]);

        if (!currentRes.ok || !forecastRes.ok) {
            throw new Error('Gagal mengambil data cuaca. Coba lagi nanti.');
        }

        const currentData = await currentRes.json();
        const forecastData = await forecastRes.json();
        
        // Simpan data di cache (FR-4)
        localStorage.setItem('cachedWeather', JSON.stringify({ current: currentData, forecast: forecastData, name: locationName }));

        renderCurrentWeather(currentData, locationName);
        renderForecast(forecastData);
        // Implementasi FR-6 sederhana (AQI, UV, Times)
        renderAdditionalData(lat, lon, currentData.timezone);

    } catch (error) {
        console.error('API Error:', error);
        showStatus(true, `❌ ${error.message || 'Terjadi kesalahan saat mengambil data cuaca.'}`);
    } finally {
        loadingSpinner.classList.add('hidden');
    }
}

// --- FUNGSI RENDERING DOM (FR-1 & FR-3) ---

/** Render Cuaca Saat Ini */
function renderCurrentWeather(data, locationName) {
    const temp = formatTemperature(data.main.temp);
    const feelsLike = formatTemperature(data.main.feels_like);
    const humidity = data.main.humidity;
    const windSpeed = formatWindSpeed(data.wind.speed);
    const weatherIcon = getWeatherIcon(data.weather[0].icon);

    currentWeatherDiv.innerHTML = `
        <button class="add-favorite-btn" onclick="toggleFavorite('${locationName}', ${data.coord.lat}, ${data.coord.lon})">
            <i class="${isFavorite(locationName) ? 'fas fa-heart' : 'far fa-heart'}"></i>
        </button>
        <div class="header-info">
            <h2 class="hero-location">${locationName}</h2>
            <p>${new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div class="hero-main-info">
            <p class="hero-temp">${temp}</p>
            <div class="hero-icon-conditions">
                <i class="${weatherIcon} hero-weather-icon"></i>
                <p class="hero-conditions">${data.weather[0].description.toUpperCase()}</p>
            </div>
        </div>
        <div class="hero-details">
            <div><i class="fas fa-thermometer-half"></i> Terasa Seperti: <strong>${feelsLike}</strong></div>
            <div><i class="fas fa-tint"></i> Kelembaban: <strong>${humidity}%</strong></div>
            <div><i class="fas fa-wind"></i> Kecepatan Angin: <strong>${windSpeed}</strong></div>
            <div><i class="fas fa-tachometer-alt"></i> Tekanan: <strong>${data.main.pressure} hPa</strong></div>
        </div>
    `;
}

/** Render Prakiraan 5 Hari */
function renderForecast(data) {
    forecastDiv.innerHTML = '';
    const dailyData = {};
    
    // Kelompokkan data per hari
    data.list.forEach(item => {
        const date = item.dt_txt.split(' ')[0];
        if (!dailyData[date]) {
            dailyData[date] = { temps: [], icons: [], items: [] };
        }
        dailyData[date].temps.push(item.main.temp);
        dailyData[date].icons.push(item.weather[0].icon);
        dailyData[date].items.push(item);
    });

    Object.keys(dailyData).forEach((dateKey, index) => {
        if (index > 0 && index <= 5) { // Mulai dari besok, hingga 5 hari
            const dayData = dailyData[dateKey];
            const temps = dayData.temps.map(formatTemperature);
            const highTemp = temps.reduce((max, t) => Math.max(max, parseFloat(t)), -Infinity);
            const lowTemp = temps.reduce((min, t) => Math.min(min, parseFloat(t)), Infinity);
            
            // Ambil ikon yang paling sering muncul di tengah hari (kira-kira)
            const midDayIndex = Math.floor(dayData.temps.length / 2);
            const icon = getWeatherIcon(dayData.items[midDayIndex].weather[0].icon);
            
            const date = new Date(dateKey);
            const dayName = date.toLocaleDateString('id-ID', { weekday: 'short' });

            const card = document.createElement('div');
            card.className = 'forecast-card card';
            card.innerHTML = `
                <h4>${dayName}</h4>
                <i class="${icon}"></i>
                <p class="forecast-temp-range">${highTemp}° / ${lowTemp}°</p>
                <p>${dayData.items[midDayIndex].weather[0].description.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</p>
            `;
            // FR-3: Item perkiraan yang dapat diklik
            card.onclick = () => showDetailModal(dayName, dayData.items, dateKey);
            forecastDiv.appendChild(card);
        }
    });
}

/** Render Data Tambahan (FR-6) */
async function renderAdditionalData(lat, lon, timezoneOffset) {
    try {
        // Hanya OpenWeatherMap One Call API yang menyediakan UV dan Sunrise/Sunset secara langsung di versi gratis/langkah awal.
        // Untuk data ini, kita akan bergantung pada data yang ada di current weather atau placeholder.
        
        // Data One Call API untuk UV, Sunrise/Sunset yang lebih akurat
        const oneCallRes = await fetch(`${API_URL}onecall?lat=${lat}&lon=${lon}&exclude=minutely,daily&units=metric&appid=${API_KEY}`);
        const oneCallData = await oneCallRes.json();

        // Update UV Index
        document.getElementById('uv-value').textContent = oneCallData.current.uvi || 'N/A';
        
        // Update Sunrise/Sunset
        document.getElementById('sunrise-time').textContent = formatTime(oneCallData.current.sunrise, timezoneOffset);
        document.getElementById('sunset-time').textContent = formatTime(oneCallData.current.sunset, timezoneOffset);

        // Render Prakiraan Per Jam (FR-6)
        renderHourlyForecast(oneCallData.hourly, timezoneOffset);
        
        // AQI (FR-6): Memerlukan API terpisah
        const aqiRes = await fetch(`${API_URL}air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`);
        const aqiData = await aqiRes.json();
        const aqi = aqiData.list[0].main.aqi; // 1-5
        const aqiTextMap = { 1: 'Baik', 2: 'Wajar', 3: 'Sedang', 4: 'Buruk', 5: 'Sangat Buruk' };
        document.getElementById('aqi-value').textContent = `${aqi} (${aqiTextMap[aqi] || 'N/A'})`;

    } catch (error) {
        console.warn("Gagal mengambil data tambahan (AQI/UV/Hourly):", error);
        // Biarkan placeholder N/A
    }
}

/** Render Prakiraan Per Jam untuk Hari Ini (di widget kecil) */
function renderHourlyForecast(hourlyData, timezoneOffset) {
    const hourlyPlaceholder = document.getElementById('hourly-forecast-placeholder');
    hourlyPlaceholder.innerHTML = '<h4>Prakiraan 24 Jam:</h4>';
    
    const hourlyGrid = document.createElement('div');
    hourlyGrid.style.display = 'flex';
    hourlyGrid.style.overflowX = 'auto';
    hourlyGrid.style.gap = '10px';
    hourlyGrid.style.padding = '10px 0';

    for (let i = 0; i < 24; i++) {
        const hour = hourlyData[i];
        const time = formatTime(hour.dt, timezoneOffset);
        const temp = formatTemperature(hour.temp);
        const icon = getWeatherIcon(hour.weather[0].icon);

        hourlyGrid.innerHTML += `
            <div class="hourly-item" style="flex-shrink: 0; text-align: center; border: 1px solid #ccc; padding: 5px; border-radius: 5px;">
                <p><strong>${time}</strong></p>
                <i class="${icon}" style="font-size: 1.5em; color: var(--accent-color);"></i>
                <p>${temp}</p>
            </div>
        `;
    }
    hourlyPlaceholder.appendChild(hourlyGrid);
}


/** Tampilkan Modal Detail Prakiraan (FR-3) */
function showDetailModal(dayName, items, dateKey) {
    const modal = document.getElementById('detail-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');

    modalTitle.textContent = `Detail Prakiraan untuk ${dayName}, ${dateKey}`;
    modalBody.innerHTML = '';

    items.forEach(item => {
        const time = new Date(item.dt * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
        const temp = formatTemperature(item.main.temp);
        const icon = getWeatherIcon(item.weather[0].icon);

        modalBody.innerHTML += `
            <div class="hourly-item card">
                <p><strong>${time}</strong></p>
                <i class="${icon}" style="font-size: 1.8em; color: var(--accent-color);"></i>
                <p>${temp}</p>
                <p style="font-size: 0.8em;">${item.weather[0].description}</p>
            </div>
        `;
    });

    modal.classList.remove('hidden');
}

// Menutup modal saat mengklik tombol close atau di luar modal
document.querySelector('.close-btn').onclick = () => document.getElementById('detail-modal').classList.add('hidden');
window.onclick = (event) => {
    const modal = document.getElementById('detail-modal');
    if (event.target == modal) {
        modal.classList.add('hidden');
    }
};


// --- FUNGSI PERSISTENSI & TANGANI PENGGUNA (FR-4 & FR-5) ---

/** Load Preferensi dan Data Cached saat aplikasi dimuat */
function loadPreferencesAndCache() {
    // Tema (FR-4)
    const savedTheme = localStorage.getItem('weatherTheme') || 'light-theme';
    body.className = savedTheme;

    // Unit (FR-4)
    currentUnit = localStorage.getItem('weatherUnit') || 'metric';
    unitToggle.textContent = currentUnit === 'metric' ? '°C / °F' : '°F / °C';

    // Data Cache (FR-4)
    const cachedData = JSON.parse(localStorage.getItem('cachedWeather'));
    if (cachedData) {
        // Render data cache
        renderCurrentWeather(cachedData.current, cachedData.name);
        renderForecast(cachedData.forecast);
    }
    
    // Riwayat Pencarian & Favorit (FR-4)
    renderSearchHistory();
    renderFavorites();
}

/** Inisialisasi Lokasi Pengguna (FR-1) */
function initializeLocation() {
    const cachedLocation = localStorage.getItem('lastLocation');

    if (cachedLocation) {
        const { lat, lon, name } = JSON.parse(cachedLocation);
        getWeatherData(lat, lon, name);
    } else if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                // Geolocation sukses
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                // Reverse Geocoding untuk mendapatkan nama kota (OpenWeatherMap)
                fetch(`${API_URL}reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`)
                    .then(res => res.json())
                    .then(data => {
                        const locationName = data[0].name || 'Lokasi Anda';
                        localStorage.setItem('lastLocation', JSON.stringify({ lat, lon, name: locationName }));
                        getWeatherData(lat, lon, locationName);
                    })
                    .catch(() => getWeatherData(lat, lon, 'Lokasi Anda')); // Jika reverse geocoding gagal
            },
            (error) => {
                console.warn('Geolocation ditolak atau gagal:', error);
                showStatus(true, 'Geolocation ditolak. Tampilkan data dari lokasi default (misalnya, Jakarta).');
                // Lokasi default
                getWeatherData(-6.2088, 106.8456, 'Jakarta');
            }
        );
    } else {
        showStatus(true, 'Browser tidak mendukung Geolocation. Tampilkan data dari lokasi default (misalnya, Jakarta).');
        getWeatherData(-6.2088, 106.8456, 'Jakarta');
    }
}

/** Simpan dan Render Riwayat Pencarian (FR-4) */
function saveSearchHistory(cityName) {
    let history = JSON.parse(localStorage.getItem('searchHistory')) || [];
    // Pastikan nama kota unik
    history = history.filter(h => h.toLowerCase() !== cityName.toLowerCase());
    // Tambahkan ke depan dan batasi hingga 10 item
    history.unshift(cityName);
    history = history.slice(0, 10); 
    localStorage.setItem('searchHistory', JSON.stringify(history));
    renderSearchHistory();
}

function renderSearchHistory() {
    const history = JSON.parse(localStorage.getItem('searchHistory')) || [];
    historyContainer.innerHTML = '';
    history.forEach(city => {
        historyContainer.innerHTML += `<button onclick="searchCityByName('${city}')">${city}</button>`;
    });
}

/** Simpan dan Render Favorit (FR-4) */
function toggleFavorite(cityName, lat, lon) {
    let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    const index = favorites.findIndex(f => f.name === cityName);

    if (index > -1) {
        favorites.splice(index, 1); // Hapus
    } else {
        favorites.push({ name: cityName, lat, lon }); // Tambah
    }
    localStorage.setItem('favorites', JSON.stringify(favorites));
    renderFavorites();
    // Update ikon di kartu cuaca saat ini
    const favBtn = document.querySelector('.add-favorite-btn i');
    if (favBtn) {
        favBtn.className = isFavorite(cityName) ? 'fas fa-heart' : 'far fa-heart';
    }
}

function isFavorite(cityName) {
    let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    return favorites.some(f => f.name === cityName);
}

function renderFavorites() {
    const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    favoritesList.innerHTML = '';
    favorites.forEach(fav => {
        favoritesList.innerHTML += `<button onclick="getWeatherData(${fav.lat}, ${fav.lon}, '${fav.name}')">${fav.name} <i class="fas fa-times-circle" style="color:red;" onclick="event.stopPropagation(); toggleFavorite('${fav.name}', 0, 0);"></i></button>`;
    });
}

// --- PENCARIAN DAN PELENGKAPAN OTOMATIS (FR-2) ---

/** Mengambil koordinat dari nama kota */
async function searchCityByName(cityName) {
    if (!cityName) return;

    loadingSpinner.classList.remove('hidden');
    showStatus(false, '');
    autocompleteResults.classList.add('hidden'); // Sembunyikan saran

    try {
        // Geocoding: Mengubah nama kota menjadi koordinat
        const geoRes = await fetch(`${API_URL}weather?q=${cityName}&appid=${API_KEY}`);
        if (!geoRes.ok) {
            if (geoRes.status === 404) {
                throw new Error('Kota tidak ditemukan. Mohon periksa ejaan.');
            }
            throw new Error('Gagal melakukan geocoding.');
        }

        const data = await geoRes.json();
        const lat = data.coord.lat;
        const lon = data.coord.lon;
        
        saveSearchHistory(cityName);
        localStorage.setItem('lastLocation', JSON.stringify({ lat, lon, name: cityName }));
        getWeatherData(lat, lon, cityName);

    } catch (error) {
        console.error('Search Error:', error);
        showStatus(true, `❌ ${error.message || 'Gagal mencari kota.'}`);
    } finally {
        loadingSpinner.classList.add('hidden');
        cityInput.value = ''; // Bersihkan input
    }
}

// FR-2: Pelengkapan Otomatis Sederhana (berdasarkan riwayat dan favorit)
cityInput.addEventListener('input', () => {
    const query = cityInput.value.toLowerCase();
    autocompleteResults.innerHTML = '';

    if (query.length === 0) {
        autocompleteResults.classList.add('hidden');
        return;
    }

    const history = JSON.parse(localStorage.getItem('searchHistory')) || [];
    const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    const allLocations = [...new Set([...history, ...favorites.map(f => f.name)])];

    const matchingLocations = allLocations.filter(loc => 
        loc.toLowerCase().includes(query)
    ).slice(0, 5); // Batasi 5 saran

    if (matchingLocations.length > 0) {
        matchingLocations.forEach(loc => {
            const div = document.createElement('div');
            div.textContent = loc;
            div.onclick = () => {
                cityInput.value = loc;
                searchCityByName(loc);
            };
            autocompleteResults.appendChild(div);
        });
        autocompleteResults.classList.remove('hidden');
    } else {
        autocompleteResults.classList.add('hidden');
    }
});


// --- EVENT LISTENERS (FR-5) ---

// Toggle Tema (Gelap/Terang)
themeToggle.addEventListener('click', () => {
    const isDark = body.classList.contains('dark-theme');
    body.className = isDark ? 'light-theme' : 'dark-theme';
    themeToggle.innerHTML = isDark ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
    localStorage.setItem('weatherTheme', isDark ? 'light-theme' : 'dark-theme');
});

// Toggle Satuan (°C / °F)
unitToggle.addEventListener('click', () => {
    currentUnit = currentUnit === 'metric' ? 'imperial' : 'metric';
    localStorage.setItem('weatherUnit', currentUnit);
    unitToggle.textContent = currentUnit === 'metric' ? '°C / °F' : '°F / °C';
    
    // Muat ulang data cuaca terakhir dengan satuan baru
    const cachedLocation = JSON.parse(localStorage.getItem('lastLocation'));
    if (cachedLocation) {
        getWeatherData(cachedLocation.lat, cachedLocation.lon, cachedLocation.name);
    }
});

// Tombol Pencarian
searchBtn.addEventListener('click', () => {
    searchCityByName(cityInput.value.trim());
});
cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchCityByName(cityInput.value.trim());
    }
});


// --- INITIALIZATION ---

document.addEventListener('DOMContentLoaded', () => {
    loadPreferencesAndCache();
    initializeLocation();
});
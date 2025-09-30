const API_KEY = '0c390e1a25c05a4f5346ea21968d12c5';
const BASE_URL = 'https://api.openweathermap.org/data/2.5/';
const ICON_URL = 'https://openweathermap.org/img/wn/';

let unit = localStorage.getItem('unit') || 'metric';
let theme = localStorage.getItem('theme') || 'dark';
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
let recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]');

document.addEventListener('DOMContentLoaded', () => {
    applyTheme(theme);
    document.getElementById('unit-toggle').textContent = unit === 'metric' ? '°C' : '°F';
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    document.getElementById('unit-toggle').addEventListener('click', toggleUnit);
    document.getElementById('search-input').addEventListener('input', handleSearchInput);
    document.getElementById('search-input').addEventListener('keydown', handleSearchKey);
    document.getElementById('geo-btn').addEventListener('click', getLocationWeather);
    document.getElementById('fav-btn').addEventListener('click', addCurrentToFavorite); // Tambahkan event listener favorit
    loadFavorites();
    getLocationWeather();
});

function setLoading(isLoading) {
    document.getElementById('city').textContent = isLoading ? 'Memuat...' : '';
    document.getElementById('country').textContent = '';
    document.getElementById('temperature').textContent = '';
    document.getElementById('condition').textContent = '';
    document.getElementById('weather-icon').src = '';
    document.getElementById('humidity').textContent = '';
    document.getElementById('wind').textContent = '';
    document.getElementById('feels_like').textContent = '';
}

function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.style.background = "linear-gradient(to bottom, #0a2540 60%, #1e90ff 100%), url('https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1500&q=80') no-repeat center/cover";
        document.body.style.color = "#fff";
    } else {
        document.body.style.background = "linear-gradient(to bottom, #f5f7fa 60%, #a7c7e7 100%), url('https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=1500&q=80') no-repeat center/cover";
        document.body.style.color = "#222";
    }
    localStorage.setItem('theme', theme);
}

function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(theme);
}

function toggleUnit() {
    unit = unit === 'metric' ? 'imperial' : 'metric';
    localStorage.setItem('unit', unit);
    document.getElementById('unit-toggle').textContent = unit === 'metric' ? '°C' : '°F';
    getLocationWeather();
}

function getLocationWeather() {
    setLoading(true);
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
        }, () => {
            fetchWeatherByCity('Jakarta');
        });
    } else {
        fetchWeatherByCity('Jakarta');
    }
}

function fetchWeatherByCoords(lat, lon) {
    fetch(`${BASE_URL}weather?lat=${lat}&lon=${lon}&units=${unit}&lang=id&appid=${API_KEY}`)
        .then(res => res.json())
        .then(data => {
            updateCurrentWeather(data);
            fetchForecast(data.name);
        })
        .catch(() => showError('Gagal memuat data lokasi.'));
}

function fetchWeatherByCity(city) {
    setLoading(true);
    fetch(`${BASE_URL}weather?q=${city}&units=${unit}&lang=id&appid=${API_KEY}`)
        .then(res => res.json())
        .then(data => {
            if (data.cod !== 200) throw new Error(data.message);
            updateCurrentWeather(data);
            fetchForecast(city);
            addRecentSearch(city);
        })
        .catch(() => showError('Kota tidak ditemukan.'));
}

function updateCurrentWeather(data) {
    document.getElementById('city').textContent = data.name;
    document.getElementById('country').textContent = data.sys.country;
    document.getElementById('temperature').textContent = Math.round(data.main.temp);
    document.getElementById('condition').textContent = data.weather[0].description;
    document.getElementById('weather-icon').src = `${ICON_URL}${data.weather[0].icon}@2x.png`;
    document.getElementById('weather-icon').alt = data.weather[0].description;
    document.getElementById('humidity').textContent = data.main.humidity;
    document.getElementById('wind').textContent = Math.round(data.wind.speed * (unit === 'metric' ? 3.6 : 1));
    document.getElementById('feels_like').textContent = Math.round(data.main.feels_like);

    changeBackgroundByWeather(data.weather[0].main);

    // Update tombol favorit
    updateFavButton(data.name);
}

function updateFavButton(city) {
    const favBtn = document.getElementById('fav-btn');
    if (favorites.includes(city)) {
        favBtn.disabled = true;
        favBtn.textContent = '⭐ Sudah Favorit';
    } else {
        favBtn.disabled = false;
        favBtn.textContent = '⭐ Favorit';
    }
}

function addCurrentToFavorite() {
    const city = document.getElementById('city').textContent;
    if (city && !favorites.includes(city)) {
        favorites.push(city);
        localStorage.setItem('favorites', JSON.stringify(favorites));
        loadFavorites();
        updateFavButton(city);
    }
}

function changeBackgroundByWeather(main) {
    let bg, color;
    switch (main.toLowerCase()) {
        case 'clear':
            bg = "linear-gradient(to bottom, #87ceeb 60%, #fff 100%), url('https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=1500&q=80') no-repeat center/cover";
            color = "#222";
            break;
        case 'clouds':
            bg = "linear-gradient(to bottom, #b0c4de 60%, #d3d3d3 100%), url('https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=1500&q=80') no-repeat center/cover";
            color = "#222";
            break;
        case 'rain':
        case 'drizzle':
            bg = "linear-gradient(to bottom, #27408b 60%, #1e90ff 100%), url('https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1500&q=80') no-repeat center/cover";
            color = "#fff";
            break;
        case 'thunderstorm':
            bg = "linear-gradient(to bottom, #191970 60%, #696969 100%), url('https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1500&q=80') no-repeat center/cover";
            color = "#fff";
            break;
        case 'snow':
            bg = "linear-gradient(to bottom, #fffafa 60%, #e0e0e0 100%), url('https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=1500&q=80') no-repeat center/cover";
            color = "#222";
            break;
        default:
            bg = "linear-gradient(to bottom, #0a2540 60%, #1e90ff 100%), url('https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1500&q=80') no-repeat center/cover";
            color = "#fff";
    }
    document.body.style.background = bg;
    document.body.style.color = color;
}

function fetchForecast(city) {
    fetch(`${BASE_URL}forecast?q=${city}&units=${unit}&lang=id&appid=${API_KEY}`)
        .then(res => res.json())
        .then(data => {
            updateForecast(data.list);
        });
}

function updateForecast(list) {
    const forecastList = document.getElementById('forecast-list');
    forecastList.innerHTML = '';

    // Kelompokkan data berdasarkan tanggal (YYYY-MM-DD)
    const dailyData = {};
    list.forEach(item => {
        const dateObj = new Date(item.dt_txt);
        const dateKey = dateObj.toISOString().split('T')[0];
        if (!dailyData[dateKey]) dailyData[dateKey] = [];
        dailyData[dateKey].push(item);
    });

    // Ambil 5 hari ke depan
    Object.entries(dailyData).slice(0, 5).forEach(([dateKey, items]) => {
        // Cari suhu max/min dan data icon/kondisi dari waktu tengah hari (atau data pertama)
        let tempMax = -Infinity, tempMin = Infinity, icon = '', condition = '';
        let noonItem = items.find(i => new Date(i.dt_txt).getHours() === 12) || items[0];
        items.forEach(i => {
            if (i.main.temp_max > tempMax) tempMax = i.main.temp_max;
            if (i.main.temp_min < tempMin) tempMin = i.main.temp_min;
        });
        icon = noonItem.weather[0].icon;
        condition = noonItem.weather[0].description;

        // Format tanggal lokal
        const date = new Date(dateKey);
        const dayStr = date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' });

        const el = document.createElement('div');
        el.className = 'forecast-item';
        el.innerHTML = `
            <div class="forecast-date">${dayStr}</div>
            <img src="${ICON_URL}${icon}@2x.png" alt="${condition}">
            <div class="forecast-temp">${Math.round(tempMax)}° / ${Math.round(tempMin)}°</div>
            <div class="forecast-condition">${condition}</div>
        `;
        el.onclick = () => alert(`Detail cuaca: ${dayStr}\n${condition}\nTertinggi: ${Math.round(tempMax)}°\nTerendah: ${Math.round(tempMin)}°`);
        forecastList.appendChild(el);
    });
}

function handleSearchInput(e) {
    const val = e.target.value;
    if (val.length < 2) {
        document.getElementById('suggestions').innerHTML = '';
        return;
    }
    fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${val}&limit=5&appid=${API_KEY}`)
        .then(res => res.json())
        .then(data => {
            const suggestions = document.getElementById('suggestions');
            suggestions.innerHTML = '';
            data.forEach(loc => {
                const li = document.createElement('li');
                li.textContent = `${loc.name}, ${loc.country}`;
                li.onclick = () => {
                    fetchWeatherByCity(loc.name);
                    document.getElementById('search-input').value = '';
                    suggestions.innerHTML = '';
                };
                suggestions.appendChild(li);
            });
        });
}

function handleSearchKey(e) {
    if (e.key === 'Enter') {
        fetchWeatherByCity(e.target.value);
        document.getElementById('suggestions').innerHTML = '';
    }
}

function showError(msg) {
    document.getElementById('search-error').textContent = msg;
    setTimeout(() => {
        document.getElementById('search-error').textContent = '';
    }, 3000);
    setLoading(false);
}

function addRecentSearch(city) {
    if (!recentSearches.includes(city)) {
        recentSearches.unshift(city);
        if (recentSearches.length > 5) recentSearches.pop();
        localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
    }
}

function loadFavorites() {
    const list = document.getElementById('favorite-list');
    list.innerHTML = '';
    favorites.forEach(city => {
        const li = document.createElement('li');
        li.textContent = city;
        const btn = document.createElement('button');
        btn.textContent = 'Hapus';
        btn.onclick = () => removeFavorite(city);
        li.appendChild(btn);
        list.appendChild(li);
    });
}

function removeFavorite(city) {
    favorites = favorites.filter(c => c !== city);
    localStorage.setItem('favorites', JSON.stringify(favorites));
    loadFavorites();
}
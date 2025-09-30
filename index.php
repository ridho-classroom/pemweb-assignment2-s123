<?php
// API Key for OpenWeatherMap
$api_key = "34c41162ee59da8aff80f59586722925";

// Function to fetch weather data by coordinates
function fetchWeatherData($lat, $lon, $api_key) {
    $api_url = "https://api.openweathermap.org/data/2.5/weather?lat={$lat}&lon={$lon}&appid={$api_key}&units=metric";
    
    return makeApiRequest($api_url);
}

// Function to fetch weather forecast by city ID
function fetchWeatherForecast($city_id, $api_key) {
    $api_url = "http://api.openweathermap.org/data/2.5/forecast?id={$city_id}&appid={$api_key}&units=metric";
    
    return makeApiRequest($api_url);
}

// Function to fetch current weather by city ID
function fetchWeatherByCity($city_id, $api_key) {
    $api_url = "http://api.openweathermap.org/data/2.5/weather?id={$city_id}&appid={$api_key}&units=metric";
    
    return makeApiRequest($api_url);
}

// Generic function to make API requests
function makeApiRequest($api_url) {
    // Initialize cURL
    $ch = curl_init();
    
    // Set cURL options
    curl_setopt($ch, CURLOPT_URL, $api_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    
    // Execute the request
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    // Check for cURL errors
    if (curl_error($ch)) {
        curl_close($ch);
        return ['error' => 'cURL Error: ' . curl_error($ch)];
    }
    
    curl_close($ch);
    
    // Check HTTP response code
    if ($http_code !== 200) {
        return ['error' => 'HTTP Error: ' . $http_code];
    }
    
    // Decode JSON response
    $data = json_decode($response, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        return ['error' => 'JSON Decode Error: ' . json_last_error_msg()];
    }
    
    return $data;
}

// Function to search cities
function searchCities($query, $limit = 10) {
    $cities_json = file_get_contents('city.json');
    if (!$cities_json) {
        return ['error' => 'Could not load cities data'];
    }
    
    $cities = json_decode($cities_json, true);
    if (!$cities) {
        return ['error' => 'Invalid cities data'];
    }
    
    $query = strtolower(trim($query));
    if (strlen($query) < 2) {
        return [];
    }
    
    $results = [];
    $count = 0;
    
    foreach ($cities as $city) {
        if ($count >= $limit) break;
        
        $cityName = strtolower($city['name']);
        if (strpos($cityName, $query) === 0) { // Starts with query
            $results[] = $city;
            $count++;
        }
    }
    
    // If not enough results, search for cities containing the query
    if ($count < $limit) {
        foreach ($cities as $city) {
            if ($count >= $limit) break;
            
            $cityName = strtolower($city['name']);
            if (strpos($cityName, $query) !== false && strpos($cityName, $query) !== 0) {
                $results[] = $city;
                $count++;
            }
        }
    }
    
    return $results;
}

// Handle AJAX requests

// Search cities endpoint
if (isset($_GET['search']) && isset($_GET['q'])) {
    header('Content-Type: application/json');
    $query = $_GET['q'];
    $results = searchCities($query, 15);
    echo json_encode($results);
    exit;
}

// Weather data by coordinates
if (isset($_POST['lat']) && isset($_POST['lon'])) {
    header('Content-Type: application/json');
    $lat = floatval($_POST['lat']);
    $lon = floatval($_POST['lon']);
    
    $weather_data = fetchWeatherData($lat, $lon, $api_key);
    echo json_encode($weather_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

// Weather data by city ID
if (isset($_POST['city_id'])) {
    header('Content-Type: application/json');
    $city_id = intval($_POST['city_id']);
    $forecast_data = fetchWeatherForecast($city_id, $api_key);
    echo json_encode($forecast_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

// Current weather by city ID
if (isset($_POST['city_current'])) {
    header('Content-Type: application/json');
    $city_id = intval($_POST['city_current']);
    $weather_data = fetchWeatherByCity($city_id, $api_key);
    echo json_encode($weather_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

// Handle AJAX requests for air quality data
if (isset($_POST['air_quality'])) {
    header('Content-Type: application/json');
    $lat = floatval($_POST['lat']);
    $lon = floatval($_POST['lon']);
    $aqiUrl = "http://api.openweathermap.org/data/2.5/air_pollution?lat={$lat}&lon={$lon}&appid={$api_key}";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $aqiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $response = curl_exec($ch);
    
    if (curl_error($ch)) {
        echo json_encode(['error' => 'Network error: ' . curl_error($ch)]);
    } else {
        echo $response;
    }
    
    curl_close($ch);
    exit;
}

// Handle AJAX requests for UV index data
if (isset($_POST['uv_index'])) {
    header('Content-Type: application/json');
    $lat = floatval($_POST['lat']);
    $lon = floatval($_POST['lon']);
    $uvUrl = "http://api.openweathermap.org/data/2.5/uvi?lat={$lat}&lon={$lon}&appid={$api_key}";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $uvUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $response = curl_exec($ch);
    
    if (curl_error($ch)) {
        echo json_encode(['error' => 'Network error: ' . curl_error($ch)]);
    } else {
        echo $response;
    }
    
    curl_close($ch);
    exit;
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Weather App - GPS Location</title>
    <style>
        :root {
            --bg-primary: #f0f8ff;
            --bg-secondary: #ffffff;
            --bg-card: #f8f9fa;
            --text-primary: #333333;
            --text-secondary: #666666;
            --text-muted: #888888;
            --border-color: #dddddd;
            --accent-color: #007bff;
            --accent-hover: #0056b3;
            --error-bg: #f8d7da;
            --error-text: #721c24;
            --error-border: #dc3545;
            --success-color: #28a745;
            --shadow: rgba(0,0,0,0.1);
            --shadow-hover: rgba(0,0,0,0.2);
        }
        
        [data-theme="dark"] {
            --bg-primary: #1a1a1a;
            --bg-secondary: #2d2d2d;
            --bg-card: #3a3a3a;
            --text-primary: #ffffff;
            --text-secondary: #cccccc;
            --text-muted: #999999;
            --border-color: #444444;
            --accent-color: #4dabf7;
            --accent-hover: #339af0;
            --error-bg: #4a1e1e;
            --error-text: #ffb3b3;
            --error-border: #cc5555;
            --success-color: #51cf66;
            --shadow: rgba(0,0,0,0.3);
            --shadow-hover: rgba(0,0,0,0.5);
        }
        
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: var(--bg-primary);
            color: var(--text-primary);
            transition: background-color 0.3s ease, color 0.3s ease;
        }
        .container {
            background: var(--bg-secondary);
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px var(--shadow);
            transition: background-color 0.3s ease, box-shadow 0.3s ease;
        }
        .loading {
            text-align: center;
            color: var(--text-secondary);
            padding: 20px;
        }
        .loading-spinner {
            display: inline-block;
            width: 40px;
            height: 40px;
            border: 4px solid var(--border-color);
            border-radius: 50%;
            border-top-color: var(--accent-color);
            animation: spin 1s ease-in-out infinite;
            margin-bottom: 10px;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        .weather-data {
            background: var(--bg-card);
            padding: 20px;
            border-radius: 5px;
            border-left: 4px solid var(--accent-color);
            margin-top: 20px;
            transition: background-color 0.3s ease;
        }
        .error {
            background: var(--error-bg);
            color: var(--error-text);
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid var(--error-border);
            margin-top: 20px;
            transition: background-color 0.3s ease, color 0.3s ease;
        }
        .weather-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        .weather-card {
            background: var(--bg-secondary);
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 1px 3px var(--shadow);
            transition: background-color 0.3s ease, box-shadow 0.3s ease;
        }
        .temperature {
            font-size: 2em;
            font-weight: bold;
            color: var(--accent-color);
            transition: color 0.3s ease;
        }
        button {
            background: var(--accent-color);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            transition: background-color 0.3s ease;
        }
        button:hover {
            background: var(--accent-hover);
        }
        button:disabled {
            background: var(--text-muted);
            cursor: not-allowed;
        }
        .search-container {
            position: relative;
            margin: 20px 0;
        }
        .search-input {
            width: 100%;
            padding: 12px;
            border: 2px solid var(--border-color);
            border-radius: 5px;
            font-size: 16px;
            box-sizing: border-box;
            background: var(--bg-secondary);
            color: var(--text-primary);
            transition: border-color 0.3s ease, background-color 0.3s ease, color 0.3s ease;
        }
        .search-input:focus {
            outline: none;
            border-color: var(--accent-color);
        }
        .suggestions {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-top: none;
            border-radius: 0 0 5px 5px;
            max-height: 200px;
            overflow-y: auto;
            z-index: 1000;
            display: none;
            transition: background-color 0.3s ease, border-color 0.3s ease;
        }
        .suggestion-item {
            padding: 10px;
            cursor: pointer;
            border-bottom: 1px solid var(--border-color);
            color: var(--text-primary);
            transition: background-color 0.3s ease, color 0.3s ease;
        }
        .suggestion-item:hover {
            background-color: var(--bg-card);
        }
        .suggestion-item:last-child {
            border-bottom: none;
        }
        .tabs {
            display: flex;
            margin-bottom: 20px;
            border-bottom: 2px solid #eee;
        }
        .tab {
            padding: 10px 20px;
            cursor: pointer;
            border: none;
            background: none;
            font-size: 16px;
            color: var(--text-secondary);
            border-bottom: 2px solid transparent;
            transition: color 0.3s ease, border-bottom-color 0.3s ease;
        }
        .tab.active {
            color: var(--accent-color);
            border-bottom-color: var(--accent-color);
        }
        .tab-content {
            display: none;
        }
        .tab-content.active {
            display: block;
        }
        .forecast-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 10px;
            margin-top: 15px;
        }
        .forecast-item {
            background: var(--bg-secondary);
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 1px 3px var(--shadow);
            text-align: center;
            transition: background-color 0.3s ease, box-shadow 0.3s ease;
        }
        .forecast-time {
            font-weight: bold;
            color: var(--accent-color);
            margin-bottom: 5px;
            transition: color 0.3s ease;
        }
        .forecast-temp {
            font-size: 1.2em;
            margin: 5px 0;
        }
        .daily-forecast {
            margin-top: 30px;
        }
        .daily-forecast-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        .daily-forecast-item {
            background: var(--bg-secondary);
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 8px var(--shadow);
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
            border: 2px solid transparent;
        }
        .daily-forecast-item:hover {
            transform: translateY(-5px);
            box-shadow: 0 4px 15px var(--shadow-hover);
            border-color: var(--accent-color);
        }
        .daily-date {
            font-weight: bold;
            color: var(--accent-color);
            margin-bottom: 10px;
            font-size: 1.1em;
            transition: color 0.3s ease;
        }
        .daily-weather-icon {
            font-size: 2.5em;
            margin: 10px 0;
        }
        .daily-temps {
            margin: 10px 0;
        }
        .daily-high {
            font-size: 1.3em;
            font-weight: bold;
            color: #d73027;
        }
        .daily-low {
            font-size: 1.1em;
            color: #4575b4;
            margin-left: 10px;
        }
        .daily-condition {
            font-size: 0.9em;
            color: var(--text-secondary);
            text-transform: capitalize;
            margin-top: 5px;
            transition: color 0.3s ease;
        }
        .hourly-details {
            background: var(--bg-card);
            border-radius: 8px;
            padding: 15px;
            margin-top: 15px;
            display: none;
            transition: background-color 0.3s ease;
        }
        .hourly-details.show {
            display: block;
            animation: slideDown 0.3s ease;
        }
        @keyframes slideDown {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .hourly-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 10px;
            margin-top: 10px;
        }
        .hourly-item {
            background: var(--bg-secondary);
            padding: 10px;
            border-radius: 5px;
            text-align: center;
            font-size: 0.85em;
            transition: background-color 0.3s ease;
        }
        .close-details {
            float: right;
            background: var(--error-border);
            color: white;
            border: none;
            border-radius: 50%;
            width: 25px;
            height: 25px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.3s ease;
        }
        .controls {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            flex-wrap: wrap;
            gap: 10px;
        }
        .control-group {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .toggle-btn {
            background: var(--bg-card);
            color: var(--text-primary);
            border: 2px solid var(--border-color);
            padding: 8px 16px;
            border-radius: 20px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .toggle-btn:hover {
            border-color: var(--accent-color);
            background: var(--accent-color);
            color: white;
        }
        .toggle-btn.active {
            background: var(--accent-color);
            color: white;
            border-color: var(--accent-color);
        }
        .error-details {
            margin-top: 10px;
            padding: 10px;
            background: rgba(0,0,0,0.1);
            border-radius: 5px;
            font-family: monospace;
            font-size: 0.85em;
        }
        .favorites-section {
            margin: 20px 0;
            padding: 15px;
            background: var(--bg-card);
            border-radius: 8px;
            border: 1px solid var(--border-color);
            transition: background-color 0.3s ease, border-color 0.3s ease;
        }
        .favorites-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .favorites-list {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }
        .favorite-item {
            background: var(--bg-secondary);
            padding: 8px 12px;
            border-radius: 20px;
            border: 1px solid var(--border-color);
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.9em;
        }
        .favorite-item:hover {
            background: var(--accent-color);
            color: white;
            border-color: var(--accent-color);
        }
        .favorite-remove {
            background: none;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            padding: 0;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            font-size: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .favorite-remove:hover {
            background: rgba(255,255,255,0.2);
            color: white;
        }
        .recent-searches {
            margin-top: 10px;
        }
        .recent-searches-header {
            font-size: 0.85em;
            color: var(--text-secondary);
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .recent-searches-list {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
        }
        .recent-search-item {
            background: var(--bg-card);
            color: var(--text-secondary);
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 0.8em;
            cursor: pointer;
            transition: all 0.3s ease;
            border: 1px solid var(--border-color);
        }
        .recent-search-item:hover {
            background: var(--accent-color);
            color: white;
            border-color: var(--accent-color);
        }
        .add-favorite-btn {
            background: var(--success-color);
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 15px;
            font-size: 0.8em;
            cursor: pointer;
            transition: background-color 0.3s ease;
        }
        .add-favorite-btn:hover {
            background: #218838;
        }
        .cache-info {
            position: absolute;
            top: 5px;
            right: 5px;
            background: var(--success-color);
            color: white;
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 0.7em;
            opacity: 0.8;
        }
        .offline-indicator {
            background: #ff9800;
            color: white;
            padding: 5px 10px;
            border-radius: 5px;
            font-size: 0.8em;
            margin-bottom: 10px;
            display: none;
        }
        .favorite-remove {
            background: none;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            padding: 0;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            font-size: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .favorite-remove:hover {
            background: rgba(255,255,255,0.2);
            color: white;
        }
        .recent-searches {
            margin-top: 10px;
        }
        .recent-searches-header {
            font-size: 0.85em;
            color: var(--text-secondary);
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .recent-searches-list {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
        }
        .recent-search-item {
            background: var(--bg-card);
            color: var(--text-secondary);
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 0.8em;
            cursor: pointer;
            transition: all 0.3s ease;
            border: 1px solid var(--border-color);
        }
        .recent-search-item:hover {
            background: var(--accent-color);
            color: white;
            border-color: var(--accent-color);
        }
        .add-favorite-btn {
            background: var(--success-color);
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 15px;
            font-size: 0.8em;
            cursor: pointer;
            transition: background-color 0.3s ease;
        }
        .add-favorite-btn:hover {
            background: #218838;
        }
        .cache-info {
            position: absolute;
            top: 5px;
            right: 5px;
            background: var(--success-color);
            color: white;
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 0.7em;
            opacity: 0.8;
        }
        .offline-indicator {
            background: #ff9800;
            color: white;
            padding: 5px 10px;
            border-radius: 5px;
            font-size: 0.8em;
            margin-bottom: 10px;
            display: none;
        }
        .hourly-forecast-section {
            margin: 20px 0;
            background: var(--bg-card);
            border-radius: 8px;
            padding: 15px;
            border: 1px solid var(--border-color);
        }
        .hourly-forecast-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
            gap: 10px;
            margin-top: 15px;
            overflow-x: auto;
        }
        .hourly-item-card {
            background: var(--bg-secondary);
            padding: 12px 8px;
            border-radius: 8px;
            text-align: center;
            min-width: 100px;
            font-size: 0.85em;
            border: 1px solid var(--border-color);
            transition: all 0.3s ease;
        }
        .hourly-item-card:hover {
            background: var(--accent-color);
            color: white;
            transform: translateY(-2px);
        }
        .additional-data {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .data-card {
            background: var(--bg-card);
            padding: 15px;
            border-radius: 8px;
            border: 1px solid var(--border-color);
            text-align: center;
            transition: all 0.3s ease;
        }
        .data-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px var(--shadow);
        }
        .data-card-title {
            font-size: 0.9em;
            color: var(--text-secondary);
            margin-bottom: 8px;
            font-weight: 500;
        }
        .data-card-value {
            font-size: 1.5em;
            font-weight: bold;
            color: var(--accent-color);
            margin-bottom: 5px;
        }
        .data-card-subtitle {
            font-size: 0.8em;
            color: var(--text-muted);
        }
        .uv-low { color: #4CAF50; }
        .uv-moderate { color: #FF9800; }
        .uv-high { color: #FF5722; }
        .uv-very-high { color: #9C27B0; }
        .uv-extreme { color: #E91E63; }
        .aqi-good { color: #4CAF50; }
        .aqi-moderate { color: #FFEB3B; }
        .aqi-unhealthy-sensitive { color: #FF9800; }
        .aqi-unhealthy { color: #FF5722; }
        .aqi-very-unhealthy { color: #9C27B0; }
        .aqi-hazardous { color: #8B0000; }
        .social-sharing {
            margin: 15px 0;
            padding: 15px;
            background: var(--bg-card);
            border-radius: 8px;
            border: 1px solid var(--border-color);
        }
        .share-buttons {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            justify-content: center;
            margin-top: 10px;
        }
        .share-btn {
            padding: 8px 16px;
            border: none;
            border-radius: 20px;
            font-size: 0.85em;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .share-btn.twitter {
            background: #1DA1F2;
            color: white;
        }
        .share-btn.facebook {
            background: #1877F2;
            color: white;
        }
        .share-btn.whatsapp {
            background: #25D366;
            color: white;
        }
        .share-btn.copy {
            background: var(--bg-secondary);
            color: var(--text-primary);
            border: 1px solid var(--border-color);
        }
        .share-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .current-time {
            font-size: 0.9em;
            color: var(--text-secondary);
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="controls">
            <h1 style="margin: 0;">🌤️ Weather App</h1>
            <div class="control-group">
                <button class="toggle-btn" id="unitToggle" onclick="toggleTemperatureUnit()">
                    🌡️ <span id="unitText">°F</span>
                </button>
                <button class="toggle-btn" id="themeToggle" onclick="toggleTheme()">
                    🌙 Dark
                </button>
            </div>
        </div>
        <p>Get weather data by GPS location or search for any city worldwide.</p>
        
        <div class="tabs">
            <button class="tab active" onclick="switchTab('gps')">📍 GPS Location</button>
            <button class="tab" onclick="switchTab('search')">🔍 Search City</button>
        </div>
        
        <div id="gps-tab" class="tab-content active">
            <p>Click the button below to get weather data for your current location.</p>
            <button id="getLocationBtn" onclick="getLocation()">Get My Weather</button>
        </div>
        
        <div id="search-tab" class="tab-content">
            <div id="offlineIndicator" class="offline-indicator">
                📶 You're offline. Showing cached data when available.
            </div>
            
            <div class="favorites-section">
                <div class="favorites-header">
                    <h4 style="margin: 0; color: var(--text-primary);">⭐ Favorite Locations</h4>
                    <button class="toggle-btn" onclick="clearAllFavorites()" style="padding: 4px 8px; font-size: 0.8em;">
                        🗑️ Clear All
                    </button>
                </div>
                <div id="favoritesList" class="favorites-list">
                    <!-- Favorites will be populated here -->
                </div>
            </div>
            
            <p>Search for any city to get current weather and 5-day forecast.</p>
            <div class="search-container">
                <input 
                    type="text" 
                    id="citySearch" 
                    class="search-input" 
                    placeholder="Type city name (e.g., London, Tokyo, New York...)"
                    autocomplete="off"
                    oninput="searchCities(this.value)"
                    onkeydown="handleKeyDown(event)"
                >
                <div id="suggestions" class="suggestions"></div>
                
                <div class="recent-searches">
                    <div class="recent-searches-header">
                        <span>🕒 Recent Searches</span>
                        <button class="toggle-btn" onclick="clearSearchHistory()" style="padding: 2px 6px; font-size: 0.7em;">
                            Clear
                        </button>
                    </div>
                    <div id="recentSearchesList" class="recent-searches-list">
                        <!-- Recent searches will be populated here -->
                    </div>
                </div>
            </div>
        </div>
        
        <div id="status" class="loading" style="display: none;">
            <p>📍 Getting your location...</p>
        </div>
        
        <div id="weatherResult"></div>
    </div>

    <script>
        let searchTimeout;
        let selectedSuggestionIndex = -1;
        let currentUnit = 'celsius'; // 'celsius' or 'fahrenheit'
        let currentTheme = 'light'; // 'light' or 'dark'
        let favorites = [];
        let searchHistory = [];
        let weatherCache = {};
        let isOnline = navigator.onLine;
        
        // Cache configuration
        const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
        const MAX_SEARCH_HISTORY = 10;
        const MAX_CACHE_ITEMS = 50;
        
        // Initialize theme and unit from localStorage
        function initializeSettings() {
            const savedTheme = localStorage.getItem('weatherAppTheme') || 'light';
            const savedUnit = localStorage.getItem('weatherAppUnit') || 'celsius';
            
            currentTheme = savedTheme;
            currentUnit = savedUnit;
            
            // Apply theme
            document.body.setAttribute('data-theme', savedTheme);
            updateThemeButton();
            
            // Apply unit
            updateUnitButton();
            
            // Load persistent data
            loadFavorites();
            loadSearchHistory();
            loadWeatherCache();
            
            // Update UI
            updateFavoritesDisplay();
            updateRecentSearchesDisplay();
            
            // Setup offline detection
            setupOfflineDetection();
        }
        
        function toggleTheme() {
            currentTheme = currentTheme === 'light' ? 'dark' : 'light';
            document.body.setAttribute('data-theme', currentTheme);
            localStorage.setItem('weatherAppTheme', currentTheme);
            updateThemeButton();
        }
        
        function updateThemeButton() {
            const btn = document.getElementById('themeToggle');
            if (currentTheme === 'dark') {
                btn.innerHTML = '☀️ Light';
                btn.classList.add('active');
            } else {
                btn.innerHTML = '🌙 Dark';
                btn.classList.remove('active');
            }
        }
        
        function toggleTemperatureUnit() {
            currentUnit = currentUnit === 'celsius' ? 'fahrenheit' : 'celsius';
            localStorage.setItem('weatherAppUnit', currentUnit);
            updateUnitButton();
            
            // Refresh current weather data if displayed
            const weatherResult = document.getElementById('weatherResult');
            if (weatherResult.innerHTML.trim() !== '') {
                // Re-render current weather with new unit
                updateTemperatureDisplay();
            }
        }
        
        function updateUnitButton() {
            const btn = document.getElementById('unitToggle');
            const unitText = document.getElementById('unitText');
            if (currentUnit === 'fahrenheit') {
                unitText.textContent = '°C';
                btn.classList.add('active');
            } else {
                unitText.textContent = '°F';
                btn.classList.remove('active');
            }
        }
        
        function convertTemperature(celsius) {
            if (currentUnit === 'fahrenheit') {
                return Math.round((celsius * 9/5) + 32);
            }
            return Math.round(celsius);
        }
        
        function getUnitSymbol() {
            return currentUnit === 'fahrenheit' ? '°F' : '°C';
        }
        
        function updateTemperatureDisplay() {
            // Update all temperature displays in the current weather data
            const tempElements = document.querySelectorAll('.temperature, .forecast-temp, .daily-high, .daily-low');
            tempElements.forEach(element => {
                const tempValue = parseFloat(element.textContent);
                if (!isNaN(tempValue)) {
                    const convertedTemp = convertTemperature(tempValue);
                    const unit = getUnitSymbol();
                    element.textContent = element.classList.contains('daily-high') || element.classList.contains('daily-low') 
                        ? `${convertedTemp}°` 
                        : `${convertedTemp}${unit}`;
                }
            });
        }
        
        function showLoadingState(message = 'Loading...') {
            const statusDiv = document.getElementById('status');
            statusDiv.innerHTML = `
                <div class="loading-spinner"></div>
                <p>${message}</p>
            `;
            statusDiv.style.display = 'block';
        }
        
        function hideLoadingState() {
            document.getElementById('status').style.display = 'none';
        }
        
        function showDetailedError(message, details = null) {
            const resultDiv = document.getElementById('weatherResult');
            let errorHtml = `<div class="error">❌ Error: ${message}`;
            
            if (details) {
                errorHtml += `
                    <details>
                        <summary style="cursor: pointer; margin-top: 10px;">Technical Details</summary>
                        <div class="error-details">${details}</div>
                    </details>
                `;
            }
            
            errorHtml += '</div>';
            resultDiv.innerHTML = errorHtml;
        }
        
        // === DATA PERSISTENCE FUNCTIONS ===
        
        function loadFavorites() {
            try {
                const saved = localStorage.getItem('weatherAppFavorites');
                favorites = saved ? JSON.parse(saved) : [];
            } catch (error) {
                console.error('Error loading favorites:', error);
                favorites = [];
            }
        }
        
        function saveFavorites() {
            try {
                localStorage.setItem('weatherAppFavorites', JSON.stringify(favorites));
            } catch (error) {
                console.error('Error saving favorites:', error);
            }
        }
        
        function addToFavorites(cityId, cityName, country = '') {
            const favorite = {
                id: cityId,
                name: cityName,
                country: country,
                addedAt: Date.now()
            };
            
            // Check if already exists
            const existingIndex = favorites.findIndex(fav => fav.id === cityId);
            if (existingIndex === -1) {
                favorites.unshift(favorite); // Add to beginning
                
                // Limit to 10 favorites
                if (favorites.length > 10) {
                    favorites = favorites.slice(0, 10);
                }
                
                saveFavorites();
                updateFavoritesDisplay();
                return true;
            }
            return false;
        }
        
        function removeFromFavorites(cityId) {
            favorites = favorites.filter(fav => fav.id !== cityId);
            saveFavorites();
            updateFavoritesDisplay();
        }
        
        function clearAllFavorites() {
            if (confirm('Are you sure you want to clear all favorite locations?')) {
                favorites = [];
                saveFavorites();
                updateFavoritesDisplay();
            }
        }
        
        function updateFavoritesDisplay() {
            const favoritesContainer = document.getElementById('favoritesList');
            if (!favoritesContainer) return;
            
            if (favorites.length === 0) {
                favoritesContainer.innerHTML = '<p style="color: var(--text-secondary); font-style: italic; margin: 0;">No favorite locations yet. Search for a city and add it to favorites!</p>';
                return;
            }
            
            favoritesContainer.innerHTML = favorites.map(fav => `
                <div class="favorite-item" onclick="loadFavoriteWeather('${fav.id}', '${fav.name}')">
                    <span>📍 ${fav.name}${fav.country ? ', ' + fav.country : ''}</span>
                    <button class="favorite-remove" onclick="event.stopPropagation(); removeFromFavorites('${fav.id}')" title="Remove from favorites">
                        ×
                    </button>
                </div>
            `).join('');
        }
        
        function loadSearchHistory() {
            try {
                const saved = localStorage.getItem('weatherAppSearchHistory');
                searchHistory = saved ? JSON.parse(saved) : [];
            } catch (error) {
                console.error('Error loading search history:', error);
                searchHistory = [];
            }
        }
        
        function saveSearchHistory() {
            try {
                localStorage.setItem('weatherAppSearchHistory', JSON.stringify(searchHistory));
            } catch (error) {
                console.error('Error saving search history:', error);
            }
        }
        
        function addToSearchHistory(cityId, cityName) {
            const search = {
                id: cityId,
                name: cityName,
                searchedAt: Date.now()
            };
            
            // Remove if already exists
            searchHistory = searchHistory.filter(item => item.id !== cityId);
            
            // Add to beginning
            searchHistory.unshift(search);
            
            // Limit history
            if (searchHistory.length > MAX_SEARCH_HISTORY) {
                searchHistory = searchHistory.slice(0, MAX_SEARCH_HISTORY);
            }
            
            saveSearchHistory();
            updateRecentSearchesDisplay();
        }
        
        function clearSearchHistory() {
            searchHistory = [];
            saveSearchHistory();
            updateRecentSearchesDisplay();
        }
        
        function updateRecentSearchesDisplay() {
            const recentContainer = document.getElementById('recentSearchesList');
            if (!recentContainer) return;
            
            if (searchHistory.length === 0) {
                recentContainer.innerHTML = '<span style="color: var(--text-muted); font-style: italic;">No recent searches</span>';
                return;
            }
            
            recentContainer.innerHTML = searchHistory.map(item => `
                <div class="recent-search-item" onclick="selectCityFromHistory('${item.id}', '${item.name}')">
                    ${item.name}
                </div>
            `).join('');
        }
        
        function loadWeatherCache() {
            try {
                const saved = localStorage.getItem('weatherAppCache');
                weatherCache = saved ? JSON.parse(saved) : {};
                
                // Clean expired cache entries
                const now = Date.now();
                Object.keys(weatherCache).forEach(key => {
                    if (now - weatherCache[key].cachedAt > CACHE_DURATION) {
                        delete weatherCache[key];
                    }
                });
                
                saveWeatherCache();
            } catch (error) {
                console.error('Error loading weather cache:', error);
                weatherCache = {};
            }
        }
        
        function saveWeatherCache() {
            try {
                // Limit cache size
                const cacheKeys = Object.keys(weatherCache);
                if (cacheKeys.length > MAX_CACHE_ITEMS) {
                    // Remove oldest entries
                    const sortedKeys = cacheKeys.sort((a, b) => 
                        weatherCache[a].cachedAt - weatherCache[b].cachedAt
                    );
                    
                    const keysToRemove = sortedKeys.slice(0, cacheKeys.length - MAX_CACHE_ITEMS);
                    keysToRemove.forEach(key => delete weatherCache[key]);
                }
                
                localStorage.setItem('weatherAppCache', JSON.stringify(weatherCache));
            } catch (error) {
                console.error('Error saving weather cache:', error);
            }
        }
        
        function getCachedWeather(cacheKey) {
            const cached = weatherCache[cacheKey];
            if (!cached) return null;
            
            const now = Date.now();
            if (now - cached.cachedAt > CACHE_DURATION) {
                delete weatherCache[cacheKey];
                saveWeatherCache();
                return null;
            }
            
            return cached.data;
        }
        
        function cacheWeatherData(cacheKey, data) {
            weatherCache[cacheKey] = {
                data: data,
                cachedAt: Date.now()
            };
            saveWeatherCache();
        }
        
        function setupOfflineDetection() {
            const offlineIndicator = document.getElementById('offlineIndicator');
            
            function updateOnlineStatus() {
                isOnline = navigator.onLine;
                if (offlineIndicator) {
                    offlineIndicator.style.display = isOnline ? 'none' : 'block';
                }
            }
            
            window.addEventListener('online', updateOnlineStatus);
            window.addEventListener('offline', updateOnlineStatus);
            updateOnlineStatus();
        }
        
        // === ADDITIONAL WEATHER DATA FUNCTIONS (FR-6) ===
        
        function fetchAdditionalWeatherData(lat, lon) {
            if (!isOnline) return Promise.resolve([null, null]);
            
            const airQualityPromise = fetch('', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `air_quality=1&lat=${lat}&lon=${lon}`
            }).then(r => r.json()).catch(() => null);
            
            const uvIndexPromise = fetch('', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `uv_index=1&lat=${lat}&lon=${lon}`
            }).then(r => r.json()).catch(() => null);
            
            return Promise.all([airQualityPromise, uvIndexPromise]);
        }
        
        function getAirQualityDescription(aqi) {
            const descriptions = {
                1: { text: 'Good', class: 'aqi-good' },
                2: { text: 'Fair', class: 'aqi-moderate' },
                3: { text: 'Moderate', class: 'aqi-unhealthy-sensitive' },
                4: { text: 'Poor', class: 'aqi-unhealthy' },
                5: { text: 'Very Poor', class: 'aqi-very-unhealthy' }
            };
            return descriptions[aqi] || { text: 'Unknown', class: '' };
        }
        
        function getUVDescription(uv) {
            if (uv < 3) return { text: 'Low', class: 'uv-low' };
            if (uv < 6) return { text: 'Moderate', class: 'uv-moderate' };
            if (uv < 8) return { text: 'High', class: 'uv-high' };
            if (uv < 11) return { text: 'Very High', class: 'uv-very-high' };
            return { text: 'Extreme', class: 'uv-extreme' };
        }
        
        function generateHourlyForecast(forecastData) {
            const today = new Date();
            const todayDateString = today.toDateString();
            
            // Filter forecast items for today only
            const todayForecasts = forecastData.list.filter(item => {
                const itemDate = new Date(item.dt * 1000);
                return itemDate.toDateString() === todayDateString;
            });
            
            if (todayForecasts.length === 0) {
                return '<p style="text-align: center; color: var(--text-secondary);">No hourly data available for today</p>';
            }
            
            return todayForecasts.map(item => {
                const date = new Date(item.dt * 1000);
                const time = date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
                const temp = convertTemperature(item.main.temp);
                const unit = getUnitSymbol();
                const icon = getWeatherIcon(item.weather[0].main);
                const desc = item.weather[0].description;
                const humidity = item.main.humidity;
                const windSpeed = item.wind.speed;
                
                return `
                    <div class="hourly-item-card">
                        <div style="font-weight: bold; margin-bottom: 5px;">${time}</div>
                        <div style="font-size: 1.5em; margin: 8px 0;">${icon}</div>
                        <div style="font-size: 1.1em; font-weight: bold; margin-bottom: 3px;">${temp}${unit}</div>
                        <div style="font-size: 0.8em; color: var(--text-secondary); margin-bottom: 3px; text-transform: capitalize;">${desc}</div>
                        <div style="font-size: 0.75em; color: var(--text-muted);">
                            💧${humidity}%<br>💨${windSpeed}m/s
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        // === SOCIAL SHARING FUNCTIONS (FR-7) ===
        
        function generateShareText(cityName, temp, description, unit) {
            return `🌤️ Weather in ${cityName}: ${temp}${unit} - ${description}. Check it out!`;
        }
        
        function shareToTwitter(shareText) {
            const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
            window.open(url, '_blank', 'width=600,height=400');
        }
        
        function shareToFacebook(shareText) {
            const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(shareText)}`;
            window.open(url, '_blank', 'width=600,height=400');
        }
        
        function shareToWhatsApp(shareText) {
            const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
            window.open(url, '_blank');
        }
        
        function copyToClipboard(shareText) {
            navigator.clipboard.writeText(shareText).then(() => {
                // Show temporary success message
                const btn = event.target;
                const originalText = btn.innerHTML;
                btn.innerHTML = '✅ Copied!';
                btn.style.background = 'var(--success-color)';
                
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.style.background = 'var(--bg-secondary)';
                }, 2000);
            }).catch(() => {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = shareText;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                
                const btn = event.target;
                const originalText = btn.innerHTML;
                btn.innerHTML = '✅ Copied!';
                setTimeout(() => {
                    btn.innerHTML = originalText;
                }, 2000);
            });
        }
        
        function switchTab(tabName) {
            // Hide all tab contents
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Remove active class from all tabs
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Show selected tab content
            document.getElementById(tabName + '-tab').classList.add('active');
            
            // Add active class to selected tab
            event.target.classList.add('active');
            
            // Clear previous results when switching tabs
            document.getElementById('weatherResult').innerHTML = '';
            hideSuggestions();
        }
        
        function searchCities(query) {
            clearTimeout(searchTimeout);
            selectedSuggestionIndex = -1;
            
            if (query.length < 2) {
                hideSuggestions();
                return;
            }
            
            searchTimeout = setTimeout(() => {
                fetch(`?search=1&q=${encodeURIComponent(query)}`)
                    .then(response => response.json())
                    .then(data => {
                        displaySuggestions(data);
                    })
                    .catch(error => {
                        console.error('Search error:', error);
                        hideSuggestions();
                    });
            }, 300); // Debounce search
        }
        
        function displaySuggestions(cities) {
            const suggestionsDiv = document.getElementById('suggestions');
            
            if (!cities || cities.length === 0) {
                hideSuggestions();
                return;
            }
            
            suggestionsDiv.innerHTML = '';
            cities.forEach((city, index) => {
                const div = document.createElement('div');
                div.className = 'suggestion-item';
                div.textContent = city.name;
                div.onclick = () => selectCity(city);
                div.dataset.index = index;
                div.dataset.cityId = city.id;
                div.dataset.cityName = city.name;
                suggestionsDiv.appendChild(div);
            });
            
            suggestionsDiv.style.display = 'block';
        }
        
        function hideSuggestions() {
            document.getElementById('suggestions').style.display = 'none';
            selectedSuggestionIndex = -1;
        }
        
        function selectCity(city) {
            document.getElementById('citySearch').value = city.name;
            hideSuggestions();
            fetchCityWeather(city.id, city.name);
        }
        
        function selectCityFromHistory(cityId, cityName) {
            document.getElementById('citySearch').value = cityName;
            fetchCityWeather(cityId, cityName);
        }
        
        function loadFavoriteWeather(cityId, cityName) {
            // Switch to search tab if not already there
            switchTab('search');
            document.getElementById('citySearch').value = cityName;
            fetchCityWeather(cityId, cityName);
        }
        
        function handleKeyDown(event) {
            const suggestions = document.querySelectorAll('.suggestion-item');
            
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, suggestions.length - 1);
                updateSelectedSuggestion(suggestions);
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
                updateSelectedSuggestion(suggestions);
            } else if (event.key === 'Enter') {
                event.preventDefault();
                if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
                    const cityId = suggestions[selectedSuggestionIndex].dataset.cityId;
                    const cityName = suggestions[selectedSuggestionIndex].dataset.cityName;
                    if (cityId && cityName) {
                        selectCity({id: cityId, name: cityName});
                    }
                }
            } else if (event.key === 'Escape') {
                hideSuggestions();
            }
        }
        
        function updateSelectedSuggestion(suggestions) {
            suggestions.forEach((suggestion, index) => {
                if (index === selectedSuggestionIndex) {
                    suggestion.style.backgroundColor = '#007bff';
                    suggestion.style.color = 'white';
                } else {
                    suggestion.style.backgroundColor = '';
                    suggestion.style.color = '';
                }
            });
        }
        
        function fetchCityWeather(cityId, cityName) {
            const resultDiv = document.getElementById('weatherResult');
            const cacheKey = `city_${cityId}`;
            
            // Check cache first
            const cachedData = getCachedWeather(cacheKey);
            if (cachedData && isOnline) {
                displayCityWeather(cachedData.current, cachedData.forecast, cityName, true);
                // Still fetch fresh data in background if online
                if (isOnline) {
                    fetchFreshCityWeather(cityId, cityName, false);
                }
                return;
            } else if (cachedData && !isOnline) {
                displayCityWeather(cachedData.current, cachedData.forecast, cityName, true);
                return;
            }
            
            if (!isOnline) {
                showDetailedError('No Internet Connection', `No cached data available for ${cityName}. Please connect to the internet to fetch weather data.`);
                return;
            }
            
            fetchFreshCityWeather(cityId, cityName, true);
        }
        
        function fetchFreshCityWeather(cityId, cityName, showLoading = true) {
            const resultDiv = document.getElementById('weatherResult');
            const cacheKey = `city_${cityId}`;
            
            if (showLoading) {
                showLoadingState(`📡 Fetching weather data for ${cityName}...`);
                resultDiv.innerHTML = '';
            }
            
            // Fetch both current weather and forecast
            Promise.all([
                fetch('', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: `city_current=${cityId}`
                }).then(r => r.json()),
                
                fetch('', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: `city_id=${cityId}`
                }).then(r => r.json())
            ])
            .then(([currentData, forecastData]) => {
                // Cache the data
                cacheWeatherData(cacheKey, {
                    current: currentData,
                    forecast: forecastData
                });
                
                // Add to search history
                addToSearchHistory(cityId, cityName);
                
                displayCityWeather(currentData, forecastData, cityName, false);
                if (showLoading) {
                    hideLoadingState();
                }
            })
            .catch(error => {
                // Try to show cached data on error
                const cachedData = getCachedWeather(cacheKey);
                if (cachedData) {
                    displayCityWeather(cachedData.current, cachedData.forecast, cityName, true);
                    if (showLoading) {
                        hideLoadingState();
                    }
                } else {
                    showDetailedError('Failed to fetch city weather data', `City: ${cityName}, Error: ${error.message}`);
                    if (showLoading) {
                        hideLoadingState();
                    }
                }
            });
        }
        
        function getLocation() {
            const resultDiv = document.getElementById('weatherResult');
            const btn = document.getElementById('getLocationBtn');
            
            // Clear previous results
            resultDiv.innerHTML = '';
            showLoadingState('📍 Getting your location...');
            btn.disabled = true;
            
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    function(position) {
                        const lat = position.coords.latitude;
                        const lon = position.coords.longitude;
                        
                        showLoadingState('📡 Fetching weather data...');
                        
                        // Send coordinates to PHP backend
                        fetch('', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                            },
                            body: `lat=${lat}&lon=${lon}`
                        })
                        .then(response => response.json())
                        .then(data => {
                            // Cache GPS weather data
                            const cacheKey = `gps_${lat.toFixed(2)}_${lon.toFixed(2)}`;
                            cacheWeatherData(cacheKey, { current: data });
                            
                            displayWeather(data, lat, lon);
                            hideLoadingState();
                            btn.disabled = false;
                        })
                        .catch(error => {
                            showDetailedError('Failed to fetch weather data', `Network error: ${error.message}`);
                            hideLoadingState();
                            btn.disabled = false;
                        });
                    },
                    function(error) {
                        let errorMessage = '';
                        switch(error.code) {
                            case error.PERMISSION_DENIED:
                                errorMessage = "Location access denied by user.";
                                break;
                            case error.POSITION_UNAVAILABLE:
                                errorMessage = "Location information is unavailable.";
                                break;
                            case error.TIMEOUT:
                                errorMessage = "Location request timed out.";
                                break;
                            default:
                                errorMessage = "An unknown error occurred.";
                                break;
                        }
                        showDetailedError('Location Error', errorMessage);
                        hideLoadingState();
                        btn.disabled = false;
                    }
                );
            } else {
                showDetailedError('Browser Not Supported', 'Geolocation is not supported by this browser. Try using the city search instead.');
                hideLoadingState();
                btn.disabled = false;
            }
        }
        
        function displayWeather(data, lat, lon) {
            const resultDiv = document.getElementById('weatherResult');
            
            if (data.error) {
                showError(data.error);
                return;
            }
            
            // Fetch additional weather data first
            fetchAdditionalWeatherData(lat, lon).then(([airQualityData, uvData]) => {
                displayWeatherWithAdditionalData(data, lat, lon, airQualityData, uvData);
            }).catch(() => {
                displayWeatherWithAdditionalData(data, lat, lon, null, null);
            });
        }
        
        function displayWeatherWithAdditionalData(data, lat, lon, airQualityData, uvData) {
            const resultDiv = document.getElementById('weatherResult');
            
            const temp = convertTemperature(data.main.temp);
            const feelsLike = convertTemperature(data.main.feels_like);
            const unit = getUnitSymbol();
            const description = data.weather[0].description;
            const humidity = data.main.humidity;
            const pressure = data.main.pressure;
            const windSpeed = data.wind.speed;
            const cityName = data.name;
            const country = data.sys.country;
            
            // Generate additional data for GPS location
            let additionalDataHtml = '';
            
            // Sunrise/Sunset card
            const sunrise = new Date(data.sys.sunrise * 1000).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
            const sunset = new Date(data.sys.sunset * 1000).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
            additionalDataHtml += `
                <div class="data-card">
                    <div class="data-card-title">🌅 Sun Times</div>
                    <div class="data-card-value" style="font-size: 1.1em;">↗️ ${sunrise}</div>
                    <div class="data-card-value" style="font-size: 1.1em;">↘️ ${sunset}</div>
                </div>
            `;
            
            // Add air quality and UV data if available
            if (airQualityData && !airQualityData.error) {
                const aqi = airQualityData.list[0].main.aqi;
                const aqiDesc = getAirQualityDescription(aqi);
                additionalDataHtml += `
                    <div class="data-card">
                        <div class="data-card-title">�️ Air Quality</div>
                        <div class="data-card-value ${aqiDesc.class}">${aqi}/5</div>
                        <div class="data-card-subtitle ${aqiDesc.class}">${aqiDesc.text}</div>
                    </div>
                `;
            }
            
            if (uvData && !uvData.error) {
                const uv = Math.round(uvData.value * 10) / 10;
                const uvDesc = getUVDescription(uv);
                additionalDataHtml += `
                    <div class="data-card">
                        <div class="data-card-title">☀️ UV Index</div>
                        <div class="data-card-value ${uvDesc.class}">${uv}</div>
                        <div class="data-card-subtitle ${uvDesc.class}">${uvDesc.text}</div>
                    </div>
                `;
            }
            
            // Generate share text
            const shareText = generateShareText(cityName, temp, description, unit);
            
            resultDiv.innerHTML = `
                <div class="weather-data">
                    <h2>Weather for ${cityName}, ${country}</h2>
                    <p><strong>Coordinates:</strong> ${lat.toFixed(4)}, ${lon.toFixed(4)}</p>
                    <div class="current-time">🕒 Last updated: ${new Date().toLocaleString()}</div>
                    
                    <div class="weather-info">
                        <div class="weather-card">
                            <div style="font-size: 1.5em; margin-bottom: 10px;">${getWeatherIcon(data.weather[0].main)}</div>
                            <div class="temperature">${temp}${unit}</div>
                            <p style="margin: 5px 0; text-transform: capitalize; font-size: 1.1em;">${description}</p>
                            <p style="margin: 5px 0;">Feels like ${feelsLike}${unit}</p>
                        </div>
                        
                        <div class="weather-details">
                            <p>� Humidity: ${humidity}%</p>
                            <p>🌪️ Pressure: ${pressure} hPa</p>
                            <p>💨 Wind Speed: ${windSpeed} m/s</p>
                        </div>
                    </div>
                    
                    <!-- Additional Weather Data -->
                    <div class="additional-data">
                        ${additionalDataHtml}
                    </div>
                    
                    <!-- Social Sharing -->
                    <div class="social-sharing">
                        <h4 style="margin: 0 0 10px 0; text-align: center; color: var(--text-primary);">📱 Share Weather</h4>
                        <div class="share-buttons">
                            <button class="share-btn twitter" onclick="shareToTwitter('${shareText.replace(/'/g, "\\\\")}')">🐦 Twitter</button>
                            <button class="share-btn facebook" onclick="shareToFacebook('${shareText.replace(/'/g, "\\\\")}')">📘 Facebook</button>
                            <button class="share-btn whatsapp" onclick="shareToWhatsApp('${shareText.replace(/'/g, "\\\\")}')">💬 WhatsApp</button>
                            <button class="share-btn copy" onclick="copyToClipboard('${shareText.replace(/'/g, "\\\\")}')">📋 Copy Text</button>
                        </div>
                    </div>
                </div>
            `;
        }
        
        function displayCityWeather(currentData, forecastData, cityName, isFromCache = false) {
            const resultDiv = document.getElementById('weatherResult');
            
            if (currentData.error) {
                showError(currentData.error);
                return;
            }
            
            if (forecastData.error) {
                showError(forecastData.error);
                return;
            }
            
            // Fetch additional data for city weather
            const lat = currentData.coord.lat;
            const lon = currentData.coord.lon;
            
            fetchAdditionalWeatherData(lat, lon).then(([airQualityData, uvData]) => {
                displayCityWeatherComplete(currentData, forecastData, cityName, isFromCache, airQualityData, uvData);
            }).catch(() => {
                displayCityWeatherComplete(currentData, forecastData, cityName, isFromCache, null, null);
            });
        }
        
        function displayCityWeatherComplete(currentData, forecastData, cityName, isFromCache, airQualityData, uvData) {
            const resultDiv = document.getElementById('weatherResult');
            
            // Current weather data
            const temp = convertTemperature(currentData.main.temp);
            const feelsLike = convertTemperature(currentData.main.feels_like);
            const unit = getUnitSymbol();
            const description = currentData.weather[0].description;
            const humidity = currentData.main.humidity;
            const pressure = currentData.main.pressure;
            const windSpeed = currentData.wind.speed;
            const country = currentData.sys.country;
            
            // Process forecast data (next 24 hours, every 3 hours)
            const forecasts = forecastData.list.slice(0, 8).map(item => {
                const date = new Date(item.dt * 1000);
                const time = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                const day = date.toLocaleDateString([], {weekday: 'short'});
                return {
                    time: `${day} ${time}`,
                    temp: convertTemperature(item.main.temp),
                    description: item.weather[0].description,
                    icon: item.weather[0].main
                };
            });
            
            let forecastHtml = '';
            forecasts.forEach(forecast => {
                const weatherIcon = getWeatherIcon(forecast.icon);
                forecastHtml += `
                    <div class="forecast-item">
                        <div class="forecast-time">${forecast.time}</div>
                        <div style="font-size: 1.5em; margin: 5px 0;">${weatherIcon}</div>
                        <div class="forecast-temp">${forecast.temp}${unit}</div>
                        <div style="font-size: 0.8em; text-transform: capitalize;">${forecast.description}</div>
                    </div>
                `;
            });
            
            // Process 5-day forecast
            const dailyForecast = processDailyForecast(forecastData);
            let dailyForecastHtml = '';
            
            dailyForecast.forEach((day, index) => {
                const hourlyHtml = day.hourlyData.map(hour => `
                    <div class="hourly-item">
                        <div style="font-weight: bold;">${hour.time}</div>
                        <div style="font-size: 1.2em; margin: 5px 0;">${getWeatherIcon(hour.icon)}</div>
                        <div>${hour.temp}°C</div>
                        <div style="font-size: 0.8em; color: #666;">${hour.condition}</div>
                        <div style="font-size: 0.75em; color: #888;">💧${hour.humidity}% 💨${hour.windSpeed}m/s</div>
                    </div>
                `).join('');
                
                dailyForecastHtml += `
                    <div class="daily-forecast-item" onclick="toggleDayDetails(${index})">
                        <div class="daily-date">${day.dateString}</div>
                        <div class="daily-weather-icon">${day.icon}</div>
                        <div class="daily-temps">
                            <span class="daily-high">${day.highTemp}°</span>
                            <span class="daily-low">${day.lowTemp}°</span>
                        </div>
                        <div class="daily-condition">${day.description}</div>
                    </div>
                    <div id="day-details-${index}" class="hourly-details">
                        <button class="close-details" onclick="event.stopPropagation(); document.getElementById('day-details-${index}').classList.remove('show');">×</button>
                        <h4>Hourly Forecast for ${day.dateString}</h4>
                        <div class="hourly-grid">
                            ${hourlyHtml}
                        </div>
                    </div>
                `;
            });
            
            const cityId = currentData.id;
            const isFavorite = favorites.some(fav => fav.id == cityId);
            
            // Generate hourly forecast
            const hourlyForecastHtml = generateHourlyForecast(forecastData);
            
            // Generate additional data cards
            let additionalDataHtml = '';
            
            // Sunrise/Sunset card
            const sunrise = new Date(currentData.sys.sunrise * 1000).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
            const sunset = new Date(currentData.sys.sunset * 1000).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
            additionalDataHtml += `
                <div class="data-card">
                    <div class="data-card-title">🌅 Sun Times</div>
                    <div class="data-card-value" style="font-size: 1.1em;">↗️ ${sunrise}</div>
                    <div class="data-card-value" style="font-size: 1.1em;">↘️ ${sunset}</div>
                </div>
            `;
            
            // Air Quality card
            if (airQualityData && !airQualityData.error) {
                const aqi = airQualityData.list[0].main.aqi;
                const aqiDesc = getAirQualityDescription(aqi);
                additionalDataHtml += `
                    <div class="data-card">
                        <div class="data-card-title">🌬️ Air Quality</div>
                        <div class="data-card-value ${aqiDesc.class}">${aqi}/5</div>
                        <div class="data-card-subtitle ${aqiDesc.class}">${aqiDesc.text}</div>
                    </div>
                `;
            }
            
            // UV Index card
            if (uvData && !uvData.error) {
                const uv = Math.round(uvData.value * 10) / 10;
                const uvDesc = getUVDescription(uv);
                additionalDataHtml += `
                    <div class="data-card">
                        <div class="data-card-title">☀️ UV Index</div>
                        <div class="data-card-value ${uvDesc.class}">${uv}</div>
                        <div class="data-card-subtitle ${uvDesc.class}">${uvDesc.text}</div>
                    </div>
                `;
            }
            
            // Generate share text
            const shareText = generateShareText(cityName, temp, description, unit);
            
            resultDiv.innerHTML = `
                <div class="weather-data" style="position: relative;">
                    ${isFromCache ? '<div class="cache-info">📦 Cached</div>' : ''}
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                        <h2 style="margin: 0;">Current Weather for ${cityName}, ${country}</h2>
                        <button class="add-favorite-btn" onclick="${isFavorite ? `removeFromFavorites('${cityId}')` : `addToFavorites('${cityId}', '${cityName}', '${country}')`}" title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                            ${isFavorite ? '❤️ Favorited' : '🤍 Add to Favorites'}
                        </button>
                    </div>
                    <div class="current-time">🕒 Last updated: ${new Date().toLocaleString()}</div>
                    
                    <div class="weather-info">
                        <div class="weather-card">
                            <div style="font-size: 1.5em; margin-bottom: 10px;">${getWeatherIcon(currentData.weather[0].main)}</div>
                            <div class="temperature">${temp}${unit}</div>
                            <p style="margin: 5px 0; text-transform: capitalize; font-size: 1.1em;">${description}</p>
                            <p style="margin: 5px 0;">Feels like ${feelsLike}${unit}</p>
                        </div>
                        
                        <div class="weather-details">
                            <p>💧 Humidity: ${humidity}%</p>
                            <p>🌪️ Pressure: ${pressure} hPa</p>
                            <p>💨 Wind Speed: ${windSpeed} m/s</p>
                        </div>
                    </div>
                    
                    <!-- Additional Weather Data (FR-6) -->
                    <div class="additional-data">
                        ${additionalDataHtml}
                    </div>
                    
                    <!-- Hourly Forecast for Today -->
                    <div class="hourly-forecast-section">
                        <h3 style="margin: 0 0 10px 0; color: var(--text-primary);">📊 Today's Hourly Forecast</h3>
                        <div class="hourly-forecast-grid">
                            ${hourlyForecastHtml}
                        </div>
                    </div>
                    
                    <!-- Social Sharing (FR-7) -->
                    <div class="social-sharing">
                        <h4 style="margin: 0 0 10px 0; text-align: center; color: var(--text-primary);">📱 Share Weather</h4>
                        <div class="share-buttons">
                            <button class="share-btn twitter" onclick="shareToTwitter('${shareText.replace(/'/g, "\\\\")}')">🐦 Twitter</button>
                            <button class="share-btn facebook" onclick="shareToFacebook('${shareText.replace(/'/g, "\\\\")}')">📘 Facebook</button>
                            <button class="share-btn whatsapp" onclick="shareToWhatsApp('${shareText.replace(/'/g, "\\\\")}')">💬 WhatsApp</button>
                            <button class="share-btn copy" onclick="copyToClipboard('${shareText.replace(/'/g, "\\\\")}')">📋 Copy Text</button>
                        </div>
                    </div>
                    
                    <h3>📈 24-Hour Forecast</h3>
                    <div class="forecast-container">
                        ${forecastHtml}
                    </div>
                    
                    <h3>5-Day Weather Forecast</h3>
                    <div class="daily-forecast">
                        ${dailyForecastHtml}
                    </div>
                </div>
            `;
        }
        
        function getWeatherIcon(weatherMain) {
            const icons = {
                'Clear': '☀️',
                'Clouds': '☁️',
                'Rain': '🌧️',
                'Drizzle': '🌦️',
                'Thunderstorm': '⛈️',
                'Snow': '❄️',
                'Mist': '🌫️',
                'Smoke': '🌫️',
                'Haze': '🌫️',
                'Dust': '🌫️',
                'Fog': '🌫️',
                'Sand': '🌫️',
                'Ash': '🌫️',
                'Squall': '💨',
                'Tornado': '🌪️'
            };
            return icons[weatherMain] || '🌤️';
        }
        
        function processDailyForecast(forecastData) {
            const dailyData = {};
            
            // Group forecast data by date
            forecastData.list.forEach(item => {
                const date = new Date(item.dt * 1000);
                const dateKey = date.toDateString();
                
                if (!dailyData[dateKey]) {
                    dailyData[dateKey] = {
                        date: date,
                        temps: [],
                        conditions: [],
                        hourlyData: []
                    };
                }
                
                dailyData[dateKey].temps.push(item.main.temp);
                dailyData[dateKey].conditions.push({
                    main: item.weather[0].main,
                    description: item.weather[0].description
                });
                dailyData[dateKey].hourlyData.push({
                    time: date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                    temp: Math.round(item.main.temp),
                    condition: item.weather[0].description,
                    icon: item.weather[0].main,
                    humidity: item.main.humidity,
                    windSpeed: item.wind?.speed || 0
                });
            });
            
            // Process each day to get high/low temps and most common condition
            const processedDays = Object.keys(dailyData).slice(0, 5).map(dateKey => {
                const dayData = dailyData[dateKey];
                const highTemp = Math.round(Math.max(...dayData.temps));
                const lowTemp = Math.round(Math.min(...dayData.temps));
                
                // Find most common weather condition
                const conditionCounts = {};
                dayData.conditions.forEach(condition => {
                    conditionCounts[condition.main] = (conditionCounts[condition.main] || 0) + 1;
                });
                
                const mostCommonCondition = Object.keys(conditionCounts).reduce((a, b) => 
                    conditionCounts[a] > conditionCounts[b] ? a : b
                );
                
                const conditionDescription = dayData.conditions.find(c => c.main === mostCommonCondition)?.description || '';
                
                return {
                    date: dayData.date,
                    dateString: dayData.date.toLocaleDateString([], {weekday: 'short', month: 'short', day: 'numeric'}),
                    highTemp,
                    lowTemp,
                    condition: mostCommonCondition,
                    description: conditionDescription,
                    icon: getWeatherIcon(mostCommonCondition),
                    hourlyData: dayData.hourlyData
                };
            });
            
            return processedDays;
        }
        
        function toggleDayDetails(dayIndex) {
            const detailsDiv = document.getElementById(`day-details-${dayIndex}`);
            const allDetails = document.querySelectorAll('.hourly-details');
            
            // Close all other details
            allDetails.forEach((detail, index) => {
                if (index !== dayIndex) {
                    detail.classList.remove('show');
                }
            });
            
            // Toggle current details
            detailsDiv.classList.toggle('show');
        }
        
        function showError(message) {
            showDetailedError(message);
        }
        
        // Close suggestions when clicking outside
        document.addEventListener('click', function(event) {
            if (!event.target.closest('.search-container')) {
                hideSuggestions();
            }
        });
        
        // Initialize settings and auto-request location when page loads
        window.addEventListener('load', function() {
            initializeSettings();
            // Optionally auto-request location on page load
            // getLocation();
        });
        
        function showError(message) {
            showDetailedError(message);
        }
        
        // Close suggestions when clicking outside
        document.addEventListener('click', function(event) {
            if (!event.target.closest('.search-container')) {
                hideSuggestions();
            }
        });
        
        // Initialize settings and auto-request location when page loads
        window.addEventListener('load', function() {
            initializeSettings();
            // Optionally auto-request location on page load
            // getLocation();
        });
        
        // Clean up old cache entries periodically
        setInterval(() => {
            const now = Date.now();
            let hasExpired = false;
            
            Object.keys(weatherCache).forEach(key => {
                if (now - weatherCache[key].cachedAt > CACHE_DURATION) {
                    delete weatherCache[key];
                    hasExpired = true;
                }
            });
            
            if (hasExpired) {
                saveWeatherCache();
            }
        }, 60000); // Check every minute
    </script>
</body>
</html>
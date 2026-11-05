(() => {
  const cityInput = document.getElementById('city-input');
  const searchBtn = document.getElementById('search-btn');
  const geoBtn = document.getElementById('geo-btn');
  const errorMsg = document.getElementById('error-msg');
  const weatherCard = document.getElementById('weather-card');
  const forecastContainer = document.getElementById('forecast');

  let isLoading = false;

  function showLoading() {
    if (isLoading) return;
    isLoading = true;
    errorMsg.classList.add('hidden');
    weatherCard.classList.add('hidden');
    forecastContainer.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  }

  function hideLoading() {
    isLoading = false;
  }

  function showError(msg) {
    hideLoading();
    errorMsg.textContent = msg;
    errorMsg.classList.remove('hidden');
    weatherCard.classList.add('hidden');
  }

  // ── Icon mapping ────────────────────────────

  const iconMap = {
    clearDay: '☀️',
    clearNight: '🌙',
    partlyCloudyDay: '⛅',
    partlyCloudyNight: '🌤️',
    cloudy: '☁️',
    rain: '🌧️',
    snow: '❄️',
    sleet: '🌨️',
    fog: '🌫️',
    thunderstorm: '⛈️',
    windy: '💨',
    hail: '🧊',
    dust: '🌪️',
    smoke: '😷',
    default: '🌡️'
  };

  function getWeatherIcon(code) {
    return iconMap[code] || iconMap.default;
  }

  function getCondition(code) {
    const conditions = {
      100: 'Clear',
      200: 'Partly Cloudy',
      300: 'Overcast',
      400: 'Rain',
      500: 'Snow',
      600: 'Sleet',
      700: 'Fog',
      800: 'Thunderstorm',
      900: 'Hail',
      1000: 'Windy',
      1100: 'Dust',
      1200: 'Smoke'
    };
    return conditions[code] || 'Unknown';
  }

  // ── Built-in city coordinates (lat, lon) for common US cities ──
  // Falls back to geolocation if no match found.

  const CITY_DB = {
    'new york': [40.7128, -74.006],
    'los angeles': [34.0522, -118.2437],
    'chicago': [41.8781, -87.6298],
    'houston': [29.7604, -95.3698],
    'phoenix': [33.4484, -112.074],
    'philadelphia': [39.9526, -75.1652],
    'san antonio': [29.4241, -98.4936],
    'san diego': [32.7157, -117.1611],
    'dallas': [32.7767, -96.797],
    'miami': [25.7617, -80.1918],
    'atlanta': [33.749, -84.388],
    'denver': [39.7392, -104.9903],
    'seattle': [47.6062, -122.3321],
    'boston': [42.3601, -71.0589],
    'portland': [45.5155, -122.6789],
    'las vegas': [36.1699, -115.1398],
    'london': [51.5074, -0.1278],
    'paris': [48.8566, 2.3522],
    'tokyo': [35.6762, 139.6503],
    'toronto': [43.6532, -79.3832],
    'austin': [30.2672, -97.7431],
    'jacksonville': [30.3322, -81.6557],
    'columbus': [39.9612, -82.9988],
    'indianapolis': [39.7684, -86.1581],
    'fort worth': [32.7555, -97.3308],
    'charlotte': [35.2271, -80.8431],
    'san francisco': [37.7749, -122.4194],
    'indianapolis': [39.7684, -86.1581],
    'hilliard': [40.0806, -83.1754],
    'columbus': [39.9612, -82.9988]
  };

  function findCityCoords(city) {
    const key = city.toLowerCase().trim();
    if (CITY_DB[key]) return CITY_DB[key];

    // Try partial match (e.g., "hill" matches "hilliard")
    for (const [name, coords] of Object.entries(CITY_DB)) {
      if (name.includes(key) || key.includes(name)) {
        return coords;
      }
    }
    return null;
  }

  async function searchByCity(city) {
    const coords = findCityCoords(city);
    if (!coords) {
      throw new Error(`City "${city.trim()}" not recognized. Try a common US city name like "Hilliard", "Columbus", or "Miami".`);
    }
    return { lat: coords[0], lon: coords[1] };
  }

  async function searchByCoords(lat, lon) {
    return { lat, lon };
  }

  // ── Fetch weather from Open-Meteo (proxied through local server) ───────────

  async function fetchWeather(lat, lon) {
    const params = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
      hourly: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,visibility,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,rain_sum,showers_sum,snowfall_sum,precipitation_hours,wind_speed_10m_max,wind_gusts_10m_max',
      temperature_unit: 'fahrenheit',
      wind_speed_unit: 'mph',
      timezone: 'auto'
    });

    const proxyUrl = `/api/weather?${params}`;
    console.log('Proxy URL:', proxyUrl);

    let res;
    try {
      res = await fetch(proxyUrl);
    } catch (fetchErr) {
      throw new Error(`Network error: ${fetchErr.message}. Make sure the local server is running.`);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.log('Weather API status:', res.status, 'body:', text.substring(0, 300));
      throw new Error(`Weather API error (${res.status}). Try again later.`);
    }

    let data;
    try {
      const text = await res.text();
      console.log('Raw response length:', text.length);
      console.log('Raw response (first 300):', text.substring(0, 300));
      data = JSON.parse(text);
      console.log('Parsed keys:', Object.keys(data));
      if (!data.current) {
        throw new Error('Weather API returned no current weather data. Check the URL in console.');
      }
    } catch (parseErr) {
      throw new Error(`Failed to parse weather response: ${parseErr.message}. The API may be unreachable.`);
    }
    return data;
  }

  // ── Display results ─────────────────────────

  function renderCurrent(data, city) {
    const c = data.current;
    document.getElementById('current-icon').textContent = getWeatherIcon(
      c.is_day ? 'clearDay' : 'clearNight'
    );
    document.getElementById('temperature').textContent = Math.round(c.temperature_2m);

    // condition text from daily first entry (use current code too)
    const condition = getCondition(c.weather_code);
    document.getElementById('condition').textContent = condition;

    if (city) {
      document.getElementById('location').textContent = city;
    } else {
      document.getElementById('location').textContent = 'Your Location';
    }

    // Humidity from hourly — pick the closest hour
    const now = new Date();
    const currentHourIdx = Math.floor((now.getHours()) / 1) % data.hourly.time.length;
    document.getElementById('humidity').textContent = `${Math.round(data.hourly.relative_humidity_2m[currentHourIdx])}%`;
    // For simplicity, use the same index to get wind and other values
    document.getElementById('wind').textContent = `${Math.round(c.wind_speed_10m)} mph`;
    document.getElementById('pressure').textContent = `${Math.round(c.pressure_msl)} hPa`;
    document.getElementById('visibility').textContent = '10+ km'; // default

    weatherCard.classList.remove('hidden');
  }

  function renderForecast(daily) {
    forecastContainer.innerHTML = '';
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < 7 && i < daily.time.length; i++) {
      const date = new Date(daily.time[i] + 'T00:00:00');
      const div = document.createElement('div');
      div.className = 'forecast-day';

      if (i === 0) {
        div.innerHTML = `
          <span class="day-name">${days[date.getDay()]}</span>
          <span class="fc-icon">${getWeatherIcon(daily.weather_code[i])}</span>
          <div class="fc-temps">
            <span class="fc-high">${Math.round(daily.temperature_2m_max[i])}°</span>
            <span class="fc-low">${Math.round(daily.temperature_2m_min[i])}°</span>
          </div>
        `;
      } else {
        div.innerHTML = `
          <span class="day-name">${i === 1 ? 'Tomorrow' : days[date.getDay()]}</span>
          <span class="fc-icon">${getWeatherIcon(daily.weather_code[i])}</span>
          <div class="fc-temps">
            <span class="fc-high">${Math.round(daily.temperature_2m_max[i])}°</span>
            <span class="fc-low">${Math.round(daily.temperature_2m_min[i])}°</span>
          </div>
        `;
      }

      forecastContainer.appendChild(div);
    }
  }

  // ── Main handler ────────────────────────────

  async function handleSearch(city) {
    if (!city || !city.trim()) {
      showError('Please enter a city name or zip code.');
      return;
    }

    showLoading();

    try {
      let lat, lon, displayName;
      if (city) {
        const coords = findCityCoords(city);
        if (!coords) {
          showError(`City "${city.trim()}" not recognized. Try a common US city name like "Hilliard", "Columbus", or "Miami".`);
          return;
        }
        lat = coords[0];
        lon = coords[1];
        displayName = CITY_DB[city.toLowerCase().trim()] ? city : 'Your Location';
      } else {
        // Geo location — use the helper below
        const pos = await new Promise((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by your browser.'));
            return;
          }
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
        displayName = 'Your Location';
      }

      const weatherData = await fetchWeather(lat, lon);
      renderCurrent(weatherData.current, displayName);
      renderForecast(weatherData.daily);
    } catch (err) {
      showError(err.message || 'Failed to load weather data.');
    }
  }

  // ── Event listeners ─────────────────────────

  searchBtn.addEventListener('click', () => {
    handleSearch(cityInput.value.trim());
  });

  cityInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      handleSearch(cityInput.value.trim());
    }
  });

  geoBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      showError('Geolocation is not supported by your browser.');
      return;
    }

    showLoading();

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        try {
          const weatherData = await fetchWeather(lat, lon);
          renderCurrent(weatherData.current, 'Your Location');
          renderForecast(weatherData.daily);
        } catch (err) {
          showError(err.message || 'Failed to load weather data.');
        }
      },
      () => {
        showError('Location access denied. Please enter a city name.');
      }
    );
  });

})();

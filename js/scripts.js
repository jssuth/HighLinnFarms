/* =============================================
   SCRIPTS.JS — site-wide JavaScript for highlinnfarms.com
   =============================================
   Every main page (not the two legal pages) loads this single
   file at the bottom of the <body>. It's organized top to
   bottom roughly in the order the features appear on the page:

     1.  Date           (top bar, left side)
     2.  Clock          (top bar, left side)
     3.  Weather panel  (top bar, right side) — by far the
                        biggest chunk of this file
     4.  About-page inline viewer (ancestor archive photos)
     5.  About-page archive-viewer wiring
     6.  Properties-page lightbox (full-screen photo viewer)
     7.  Properties-page seasonal tab viewer (spring/summer/fall/winter)
     8.  Farm Talk — category filter pills
     9.  Farm Talk — article expand / collapse

   Most features work off IDs and data-* attributes in the HTML,
   so the script stays in its own file and doesn't need to be
   tailored per page. When a feature's target elements aren't on
   the current page (e.g. the seasonal viewer IDs aren't on the
   Home page), the query selectors just return empty lists and
   the code quietly does nothing — which is what we want.
   ============================================= */


/* =============================================
   1. DATE — top bar, left side
   =============================================
   Reads the <span id="date">, replaces its contents with
   "Fri, 4/17/26" style text built from the visitor's local
   clock, then sets a 1-minute interval that only updates the
   displayed date if the clock rolls past midnight. That way the
   date rewrites itself once a day instead of once a second.
   ============================================= */
// =========================
// Date
// =========================
function updateDate() {
    const dateSpan = document.getElementById('date');
    const now = new Date();

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const dayName = days[now.getDay()];
    const month = now.getMonth() + 1; // JS months start at 0
    const day = now.getDate();
    const year = String(now.getFullYear()).slice(-2); // last two digits

    dateSpan.textContent = `${dayName}, ${month}/${day}/${year}`;
}

document.addEventListener("DOMContentLoaded", () => {
    updateDate();
});


// Refresh the date automatically at midnight
setInterval(() => {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0) {
        updateDate();
    }
}, 60000); // checks once per minute


/* =============================================
   2. CLOCK — top bar, left side
   =============================================
   Fills <span id="clock"> with a 12-hour style clock ("4:53 PM")
   every second. The "hours ? hours : 12" trick converts a 0-hour
   (midnight) to 12 so we never show "0:00 AM". Padding minutes
   keeps single digits from showing as "4:7 PM" instead of "4:07 PM".
   ============================================= */
// =========================
// Clock
// =========================
function updateClock() {
    const clockSpan = document.getElementById('clock');
    const now = new Date();

    let hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";

    hours = hours % 12;
    hours = hours ? hours : 12; // 0 becomes 12

    const paddedMinutes = minutes < 10 ? "0" + minutes : minutes;
    const timeString = `${hours}:${paddedMinutes} ${ampm}`;

    clockSpan.textContent = timeString;
}

// Update every second
setInterval(updateClock, 1000);
updateClock(); // run immediately


/* =============================================
   3. WEATHER PANEL — top bar, right side
   =============================================
   The big one. This block runs the weather pill in the top bar,
   the dropdown panel with wind / humidity / feels-like / 5-day
   forecast, and the "change city" text input at the bottom of
   the panel. Everything is powered by the OpenWeather API.

   ROUGH LAYOUT of this block:
     - weatherIcons      — map of condition keywords to emoji
     - getWeatherIcon()  — picks the right emoji from a
                           condition string, with day/night
                           variations for clear/partly cloudy
     - isNightTime()     — true if local time is between 6pm and 6am
     - weatherConfig     — API key + default lat/lon (Prescott)
                           NOTE: the key is joined from 4 short
                           chunks just to keep it from being an
                           obvious single string in the file
     - getCoordinatesForCity()  — geocoder lookup by city name
     - updateWeather()   — main function; fetches current weather
                           + 5-day forecast, updates the top bar
                           pill and the dropdown panel fields
     - updateMultiDayForecast() — populates the 5 .forecast-day
                                  blocks in the dropdown
     - Dropdown toggle   — click pill to show/hide .weather-panel
     - City submit       — handles what happens when the visitor
                           types a new ZIP / city+state / city
                           and clicks "Update"

   The Update button accepts three input styles:
     1. 5-digit ZIP            (uses OpenWeather "zip" endpoint)
     2. City + State (comma)   (uses geocoder with ",US" suffix,
                                or country code for foreign places)
     3. Plain city name        (loose geocoder lookup)

   Each case is handled by its own branch below. All three
   end up setting weatherConfig.lat/lon to the new coordinates
   and calling updateWeather() to refresh.
   ============================================= */
// ==============================
// Weather (Kansas-Optimized)
// ==============================

/* Lookup table: condition key → emoji. The keys are our own
   internal names; getWeatherIcon() below maps OpenWeather's
   condition strings onto these keys. */

// Full icon map for Kansas conditions (day + night)
const weatherIcons = {
    // Clear / Fair
    "clear-day": "☀️",
    "clear-night": "🌕",

    // Mostly clear / partly cloudy
    "mostly-sunny": "🌤️",
    "mostly-clear-night": "🌖",
    "partly-cloudy-day": "⛅",
    "partly-cloudy-night": "🌙",

    // Cloud cover
    "cloudy": "☁️",
    "overcast": "☁️",

    // Rain
    "light-rain": "🌦️",
    "rain": "🌧️",
    "heavy-rain": "🌧️",
    "drizzle": "🌦️",

    // Storms
    "thunderstorm": "⛈️",
    "severe-thunderstorm": "⛈️",

    // Winter
    "snow": "❄️",
    "snow-showers": "🌨️",
    "wintry-mix": "🌨️",
    "sleet": "🌨️",
    "freezing-rain": "🧊",
    "ice": "🧊",

    // Visibility
    "fog": "🌫️",
    "mist": "🌫️",
    "haze": "🌫️",

    // Wind
    "windy": "🌬️",
    "breezy": "🌬️",

    // Severe
    "tornado": "🌪️",
    "funnel-cloud": "🌪️",

    // Fallback
    "unknown": "🌀"
};

/* Pick a single emoji for whatever condition string the API
   returned. OpenWeather sends back free-form text like
   "light rain" or "thunderstorm" so we do keyword matching
   (.includes) in priority order and return the first hit.
   At night, clear/partly-cloudy get swapped to moon-based icons
   so a cloudless 2 AM shows 🌕 instead of ☀️. */

// Smart icon selector
function getWeatherIcon(condition, isNight = false) {
    const c = condition.toLowerCase();

    // Night overrides for clear/partly cloudy
    if (isNight) {
        if (c.includes("clear")) return weatherIcons["clear-night"];
        if (c.includes("partly")) return weatherIcons["partly-cloudy-night"];
        if (c.includes("mostly")) return weatherIcons["mostly-clear-night"];
    }

    // Daytime logic
    if (c.includes("sun") || c.includes("clear")) return weatherIcons["clear-day"];
    if (c.includes("mostly")) return weatherIcons["mostly-sunny"];
    if (c.includes("partly")) return weatherIcons["partly-cloudy-day"];
    if (c.includes("cloud")) return weatherIcons["cloudy"];
    if (c.includes("overcast")) return weatherIcons["overcast"];

    if (c.includes("drizzle")) return weatherIcons["drizzle"];
    if (c.includes("light rain")) return weatherIcons["light-rain"];
    if (c.includes("rain")) return weatherIcons["rain"];
    if (c.includes("heavy rain")) return weatherIcons["heavy-rain"];

    if (c.includes("thunder")) return weatherIcons["thunderstorm"];
    if (c.includes("storm")) return weatherIcons["severe-thunderstorm"];

    if (c.includes("snow")) return weatherIcons["snow"];
    if (c.includes("shower")) return weatherIcons["snow-showers"];
    if (c.includes("mix")) return weatherIcons["wintry-mix"];
    if (c.includes("sleet")) return weatherIcons["sleet"];
    if (c.includes("freezing")) return weatherIcons["freezing-rain"];
    if (c.includes("ice")) return weatherIcons["ice"];

    if (c.includes("fog") || c.includes("mist") || c.includes("haze"))
        return weatherIcons["fog"];

    if (c.includes("wind")) return weatherIcons["windy"];
    if (c.includes("breezy")) return weatherIcons["breezy"];

    if (c.includes("tornado") || c.includes("funnel"))
        return weatherIcons["tornado"];

    return weatherIcons["unknown"];
}

/* Rough day/night check. Anything before 6am or at/after 6pm
   counts as "night" for the purpose of picking icons. Good
   enough for Kansas — nobody's going to complain about a
   moon vs a sun on the weather pill. */
// Auto-detect day or night based on local time
function isNightTime() {
    const now = new Date();
    const hour = now.getHours();
    return hour < 6 || hour >= 18; // Night = 6pm–6am
}

/* API credentials + default location.
   The lat/lon start at Prescott (the Kansas home). They get
   overwritten when a visitor uses the "change city" box in
   the dropdown. */
// Weather configuration
const weatherConfig = {
  // The API key is stored split into 4 pieces and joined
  // at runtime — not bulletproof but keeps it from being a
  // single glaringly obvious string in the source.
 
  apiKey: ["cebf0d4f","222fb9dc","3f734913","3f7db964"].join(""),
  lat: 38.0683,      // Prescott, KS
  lon: -94.7069
};
/* Geocoder wrapper — takes a free-form city name string and
   returns {lat, lon, name}, or null if nothing matched.
   "async" means this function returns a Promise; callers have
   to "await" the result. */
async function getCoordinatesForCity(city) {
  const apiKey = weatherConfig.apiKey;
  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.length === 0) {
      return null;
    }

    return {
      lat: data[0].lat,
      lon: data[0].lon,
      name: `${data[0].name}, ${data[0].state || data[0].country}`
    };
  } catch (err) {
    console.error("Geocoding error:", err);
    return null;
  }
}

/* The main weather refresh. Reads the current lat/lon from
   weatherConfig, asks OpenWeather for the current conditions,
   updates both the top-bar pill ("Clouds, 19°F") and the
   inside-the-dropdown fields (Wind, Humidity, Feels Like,
   Updated time). Also kicks off updateMultiDayForecast()
   for the 5-day strip at the bottom of the dropdown.

   If the fetch fails (network down, bad key, etc.) the
   variables stay at "Unavailable" / "--°F" so the UI just
   shows blanks instead of crashing. */
// Main update function
async function updateWeather() {
  const weatherSpan = document.getElementById("weather-link");
  const weatherText = weatherSpan.querySelector(".weather-text");
  const weatherIcon = weatherSpan.querySelector(".weather-icon");

  const { lat, lon, apiKey } = weatherConfig;

  // Update multi-day forecast
  updateMultiDayForecast(lat, lon);

  let condition = "Unavailable";
  let temperature = "--°F";
  let windSpeed = "--";
  let humidity = "--";
  let feelsLike = "--°F";

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=imperial&appid=${apiKey}`
    );
    const data = await response.json();

    condition = data.weather[0].main;
    temperature = Math.round(data.main.temp) + "°F";
    windSpeed = Math.round(data.wind.speed) + " mph";
    humidity = data.main.humidity + "%";
    feelsLike = Math.round(data.main.feels_like) + "°F";
  } catch (error) {
    console.error("Weather API error:", error);
  }

  const isNight = isNightTime();
  const icon = getWeatherIcon(condition, isNight);

  // Top bar
  weatherSpan.dataset.icon = icon;
  weatherText.innerText = `${condition}, ${temperature}`;
  weatherIcon.innerText = icon;

  // Dropdown details
  const windEl = document.getElementById("wind");
  const humidityEl = document.getElementById("humidity");
  const feelsLikeEl = document.getElementById("feels-like");

  if (windEl) windEl.innerText = `🌬️ Wind: ${windSpeed}`;
  if (humidityEl) humidityEl.innerText = `💧 Humidity: ${humidity}`;
  if (feelsLikeEl) feelsLikeEl.innerText = `🌡️ Feels Like: ${feelsLike}`;

  // Updated time
  const now = new Date();
  const timeString = now.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  const updatedEl = document.getElementById("weather-updated");
  if (updatedEl) {
    updatedEl.innerText = `Updated ${timeString}`;
  }
}

/* Populates the 5 .forecast-day blocks at the bottom of the
   dropdown with tomorrow and the next four days. OpenWeather's
   free /forecast endpoint returns 40 three-hourly entries, so
   dayIndices picks entries roughly around noon for each day
   (24 hours / 3 hours = 8 slots per day; index 8 = +24h,
   index 16 = +48h, etc.). */
async function updateMultiDayForecast(lat, lon) {

  const { apiKey } = weatherConfig;
 
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=imperial&appid=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    const dayIndices = [8, 16, 24, 32, 39];
    const today = new Date();
    const dayLabels = ["Tomorrow"];

    for (let i = 2; i <= 5; i++) {
        const futureDate = new Date(today);
        futureDate.setDate(today.getDate() + i);
        const weekday = futureDate.toLocaleDateString("en-US", { weekday: "short" });
        dayLabels.push(weekday);
    }


    const forecastDivs = document.querySelectorAll(".forecast-day");

    dayIndices.forEach((index, i) => {
      const entry = data.list[index];
      const condition = entry.weather[0].main;
      const temp = Math.round(entry.main.temp);
      const icon = getWeatherIcon(condition, false);

      forecastDivs[i].querySelector(".day-label").innerText = dayLabels[i];
      forecastDivs[i].querySelector(".day-icon").innerText = icon;
      forecastDivs[i].querySelector(".day-temp").innerText = `${temp}°F`;
    });

  } catch (error) {
    console.error("Multiday forecast error:", error);
  }
}    // end updateMultiDayForecast

/* Kick off the first weather fetch on page load, then re-fetch
   every 10 minutes (600,000 ms) so the numbers don't go stale
   on a page that's been sitting open all day. */

// Initial run + auto-refresh every 10 minutes
updateWeather();
setInterval(updateWeather, 600000);

/* Dropdown open/close behavior.
   Clicking the weather pill toggles the .show class on the
   dropdown. On CLOSE we also:
     - reset the location back to Prescott
     - blank out the 5-day strip
     - re-fetch the weather
   so the panel is always "fresh" the next time it opens.
   e.stopPropagation() keeps the click from bubbling up to
   anything else that might be listening. */
// WEATHER DROPDOWN TOGGLE
const weatherLink = document.getElementById('weather-link');
const weatherPanel = document.getElementById('weather-panel');
const weatherCaret = weatherLink.querySelector('.weather-caret');

weatherLink.addEventListener('click', (e) => {
  e.stopPropagation();

  const isHidden = weatherPanel.classList.contains('hidden');

  if (isHidden) {
    weatherPanel.classList.remove('hidden');
    weatherPanel.classList.add('show');
    updateWeather(); // refresh when opening
  
  } else {
    weatherPanel.classList.remove('show');

    // Revert to Prescott when closing
    weatherConfig.lat = 38.0683;
    weatherConfig.lon = -94.7069;

    // Reset location label
    const locEl = document.getElementById("weather-location");
    locEl.innerText = "📍 Prescott, KS";

    // Clear forecast blocks (optional but clean)
    document.querySelectorAll(".forecast-day").forEach((block) => {
      block.querySelector(".day-label").innerText = "--";
      block.querySelector(".day-icon").innerText = "🌀";
      block.querySelector(".day-temp").innerText = "--°F";
    });

     // Refresh weather
    updateWeather();

    setTimeout(() => {
      weatherPanel.classList.add('hidden');
    }, 250);
 }



  weatherCaret.classList.toggle('rotate');
});

// WEATHER CITY UPDATE
const cityInput = document.getElementById("weather-city-input");
const citySubmit = document.getElementById("weather-city-submit");

// When the submit button is clicked, read the input and figure out
// what kind of location was entered: ZIP code, City+State, or city name only.
// Each case is handled separately because the OpenWeather API requires
// different URL formats depending on what is provided.
citySubmit.addEventListener("click", async () => {
  const city = cityInput.value.trim();
  if (!city) return; // Do nothing if the box is empty

  // -----------------------------------------------
  // CASE 1: ZIP CODE (exactly 5 digits)
  // Use the OpenWeather "zip" endpoint directly —
  // it returns coordinates plus a city name and country code.
  // -----------------------------------------------
  if (/^\d{5}$/.test(city)) {
    try {
        const apiKey = weatherConfig.apiKey;
        const zipUrl = `https://api.openweathermap.org/data/2.5/weather?zip=${city},US&units=imperial&appid=${apiKey}`;
        const response = await fetch(zipUrl);
        const data = await response.json();

        if (data.cod !== 200) {
            alert("ZIP not found. Try again.");
            return;
        }

        // Store the returned coordinates so updateWeather() uses them
        weatherConfig.lat = data.coord.lat;
        weatherConfig.lon = data.coord.lon;

        // Show the resolved city name in the panel header
        const locEl = document.getElementById("weather-location");
        locEl.innerText = `📍 ${data.name}, ${data.sys.country}`;

        // Pull fresh weather data for the new location
        updateWeather();

        // Clear the input field
        cityInput.value = "";
        return; // Done — skip the city/state logic below
    } catch (err) {
        console.error("ZIP lookup error:", err);
        alert("ZIP lookup failed.");
        return;
    }
  }

  // -----------------------------------------------
  // CASE 2: CITY + STATE (or City + Country)
  // Detected by the presence of a comma, e.g. "Topeka, KS"
  // or "London, GB". The state/country portion is checked
  // against a full US state list. If it matches a US state,
  // the search is formatted for the OpenWeather geocoder as
  // "City,ST,US". If not, it falls through to a foreign
  // country lookup using just "City,CountryCode".
  // -----------------------------------------------
  if (city.includes(",")) {
    const parts = city.split(",").map(p => p.trim());

    if (parts.length === 2) {
        const cityName = parts[0];
        let statePart = parts[1].toLowerCase();

        // OpenWeather uses "GB" for the United Kingdom, not "UK"
        if (statePart === "uk") statePart = "gb";

        // Full lookup table: accepts full state name or 2-letter abbreviation
        const states = {
            "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR",
            "california": "CA", "colorado": "CO", "connecticut": "CT", "delaware": "DE",
            "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID",
            "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS",
            "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
            "massachusetts": "MA", "michigan": "MI", "minnesota": "MN", "mississippi": "MS",
            "missouri": "MO", "montana": "MT", "nebraska": "NE", "nevada": "NV",
            "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
            "north carolina": "NC", "north dakota": "ND", "ohio": "OH", "oklahoma": "OK",
            "oregon": "OR", "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC",
            "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT",
            "vermont": "VT", "virginia": "VA", "washington": "WA", "west virginia": "WV",
            "wisconsin": "WI", "wyoming": "WY"
        };

        // If a full state name was typed (e.g. "Kansas"), convert it to its abbreviation
        if (states[statePart]) {
            statePart = states[statePart];
        }

        // Check whether the second part is a valid US state abbreviation
        const validAbbrev = Object.values(states);
        if (validAbbrev.includes(statePart.toUpperCase())) {

            // Format required by OpenWeather geocoder: "City,ST,US"
            const formatted = `${cityName},${statePart.toUpperCase()},US`;
            const coords = await getCoordinatesForCity(formatted);

            if (!coords) {
                alert("City/state not found. Check spelling.");
                return;
            }

            weatherConfig.lat = coords.lat;
            weatherConfig.lon = coords.lon;

            const locEl = document.getElementById("weather-location");
            locEl.innerText = `📍 ${coords.name}`;

            updateWeather();
            cityInput.value = "";
            return; // Done — skip the fallback below
        }

        // Not a US state — try as a foreign city+country (e.g., "London, GB")
        const formattedForeign = `${cityName},${statePart}`;
        const coordsForeign = await getCoordinatesForCity(formattedForeign);

        if (coordsForeign) {
            weatherConfig.lat = coordsForeign.lat;
            weatherConfig.lon = coordsForeign.lon;

            const locEl = document.getElementById("weather-location");
            locEl.innerText = `📍 ${coordsForeign.name}`;

            updateWeather();
            cityInput.value = "";
            return;
        }
    }
  }

  // -----------------------------------------------
  // CASE 3: PLAIN CITY NAME ONLY (e.g., "Denver")
  // Last resort — send the name as-is to the geocoder.
  // Works for many cities but is less precise without a state.
  // -----------------------------------------------
  const coords = await getCoordinatesForCity(city);

  if (!coords) {
    alert("City not found. Try 'City, State' or ZIP.");
    return;
  }

  // Update the stored coordinates with what the geocoder returned
  weatherConfig.lat = coords.lat;
  weatherConfig.lon = coords.lon;

  // Show the resolved location name in the panel header
  const locEl = document.getElementById("weather-location");
  locEl.innerText = `📍 ${coords.name}`;

  // Refresh weather with new coordinates
  updateWeather();

  // Clear the text box
  cityInput.value = "";
});

/* =============================================
   4. ABOUT PAGE — Inline viewer (generic IIFE)
   =============================================
   This is the generic "open a media viewer with thumbnails"
   machinery. It powers any viewer panel on the page that
   follows the same HTML structure — the About page uses it
   for ancestor archives (see block 5 below for the actual
   content data).

   The IIFE (that's the "(function () { ... })();" wrapper)
   runs immediately on page load and keeps its internal
   variables private so they don't leak into the global scope
   and collide with anything else.
   ============================================= */
// ============================================================
// ABOUT PAGE — INLINE VIEWER (IIFE)
// This block handles the inline media viewer used on the About
// page for items like the farm map or document viewer panels.
// It is wrapped in an immediately-invoked function expression
// (IIFE) so that its internal variables stay private and do
// not conflict with other scripts on the page.
//
// How it works:
//   - Each viewer panel in the HTML has a [data-viewer-open] trigger button.
//   - Clicking the button finds the matching viewer element by ID,
//     runs setupViewer() on it the first time (lazy init), then
//     makes it visible and scrolls it into view.
//   - Inside setupViewer(), the viewer reads its own thumbnail
//     buttons to build the item list, then wires up prev/next/close.
// ============================================================
(function () {

  // Sets up a single viewer panel.
  // Called once per viewer the first time it is opened.
  function setupViewer(viewerEl) {
    const thumbsWrap = viewerEl.querySelector("[data-items]");
    const thumbs = Array.from(thumbsWrap.querySelectorAll(".thumb"));
    const imgEl = viewerEl.querySelector('img.viewer-media[data-type="image"]');
    const pdfEl = viewerEl.querySelector('iframe.viewer-media[data-type="pdf"]');
    const countEl = viewerEl.querySelector(".viewer-count");
    const prevBtn = viewerEl.querySelector("[data-prev]");
    const nextBtn = viewerEl.querySelector("[data-next]");
    const closeBtn = viewerEl.querySelector("[data-viewer-close]");

    let index = 0; // Tracks which item is currently displayed

    // Displays item at position i (wraps around at the ends).
    // Updates the active thumbnail highlight, swaps the visible
    // media element (image or PDF iframe), and updates the counter.
    function show(i) {
      index = (i + thumbs.length) % thumbs.length; // Wrap around
      thumbs.forEach(t => t.classList.remove("is-active"));
      const active = thumbs[index];
      active.classList.add("is-active");

      const src = active.getAttribute("data-src");
      const kind = active.getAttribute("data-kind"); // "image" or "pdf"

      // Hide both media elements, then show only the correct one
      imgEl.classList.remove("is-active");
      pdfEl.classList.remove("is-active");

      if (kind === "pdf") {
        pdfEl.src = src;
        pdfEl.classList.add("is-active");
      } else {
        imgEl.src = src;
        imgEl.alt = active.getAttribute("aria-label") || "";
        imgEl.classList.add("is-active");
      }

      // Update the "1 / 3" counter if present
      if (countEl) countEl.textContent = `${index + 1} / ${thumbs.length}`;
    }

    // Clicking a thumbnail jumps directly to that item
    thumbs.forEach((btn, i) => {
      btn.addEventListener("click", () => show(i));
    });

    prevBtn.addEventListener("click", () => show(index - 1));
    nextBtn.addEventListener("click", () => show(index + 1));

    closeBtn.addEventListener("click", () => {
      viewerEl.classList.remove("is-open");
      viewerEl.setAttribute("aria-hidden", "true");
      show(0); // Reset to the first item (portrait) when closing
    });

    show(0); // Show the first item immediately on setup
  }

  // Wire up all [data-viewer-open] trigger buttons on the page.
  // Each button stores the ID of the viewer it should open.
  // The viewer is initialized lazily — only on first open —
  // to avoid processing panels that are never viewed.
  document.querySelectorAll("[data-viewer-open]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-viewer-open");
      const viewer = document.getElementById(id);
      if (!viewer) return;

      if (!viewer.dataset.ready) {
        // First open: run setup, then mark as initialized
        setupViewer(viewer);
        viewer.dataset.ready = "true";
      }
      viewer.classList.add("is-open");
      viewer.setAttribute("aria-hidden", "false");
      viewer.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
})();

/* =============================================
   5. ABOUT PAGE — Archive viewers (data + setup)
   =============================================
   Each ancestor on about.html has a "📂 View Archives" button
   that opens a .media-viewer panel below the card. Instead of
   hand-coding every viewer, we keep all the archive content in
   a single data object (ARCHIVE_ITEMS) keyed by the viewer's
   DOM id. When the button is clicked, the script looks up the
   matching array, builds the thumbnail strip from it, and wires
   up the prev/next/close controls.

   Each item in the array has:
     type     — "image", "pdf", or "html" (a newspaper-clipping
                page that loads in the iframe)
     title    — the main caption
     label    — short text used on the thumbnail button
     caption  — optional longer description shown under the image
     src      — path to the file (under images/archives/<id>/...)

   To add a new item to an ancestor, just add a new object to
   that ancestor's array — no HTML changes needed.
   ============================================= */
// =====================================
// ABOUT PAGE ARCHIVE VIEWERS
// =====================================

const ARCHIVE_ITEMS = {
  
  "viewer-walter-j": [
  {
    type: "image",
    title: "Portrait",
    label: "Portrait",
    src: "archives/walter-j/portrait.jpg"
  },
  {
    type: "image",
    title: "Farm Location",
    label: "Farm ",
    caption: "Location: Original farm of Walter J. Sutherland, ¼ mile west of the Kansas/Missouri State Line",
    src: "archives/walter-j/farm-location.jpg"
  },
  {
    type: "pdf",
    title: "Civil War Record — Illinois State Archives",
    label: "Civil War",
    src: "archives/walter-j/civil-war-illinois-archive.pdf#toolbar=0&navpanes=0&scrollbar=0"
  },
  {
    type: "html",
    title: "Citizen of Prescott (1884–1887)",
    label: "1884-87",
    src: "archives/walter-j/clippings-citizen-of-prescott.html"
  },
  {
    type: "html",
    title: "On the Farm (1887–1901)",
    label: "Farm Life",
    src: "archives/walter-j/clippings-on-the-farm.html"
  },
  {
    type: "html",
    title: "Later Years & Family (1889–1921)",
    label: "Later Years",
    src: "archives/walter-j/clippings-later-years.html"
  },
  {
    type: "html",
    title: "Prosperous Farmer (1899)",
    label: "1899",
    src: "archives/walter-j/article-1899-prosperous-farmer.html"
  }
],

  "viewer-walter-mason": [
  {
    type: "image",
    title: "Mason & Maud",
    label: "Portrait",
    src: "archives/walter-mason/mason-maud.jpg"
  },
  {
    type: "image",
    title: "Mason & Maud — circa 1900",
    label: "1900",
    caption: "Walter Mason Sutherland and Maud, portrait taken at a studio in Pleasanton, KS — likely shortly after their Christmas Day 1900 wedding, when Mason was 27. The square and compass pin on his lapel reflects his lifelong membership in the Masonic fraternal order.",
    src: "archives/walter-mason/mason-maud-portrait-1900.jpg"
  },
  {
    type: "image",
    title: "Family at the Farm",
    label: "Farm 1912",
    caption: "Taken in 1912 in the yard of their farmhouse east of Prescott. Mason is holding the mules, daughter Florence (Kite) holds the horse that son Billy, age 4, is riding. Maude is seated with baby Carl on her lap and Mildred stands beside her. Billy died in July 1919 as the result of a fall from a horse.",
    src: "archives/walter-mason/mason-country-home.jpg"
  },
  {
    type: "image",
    title: "Prescott Post Office",
    label: "Post Office",
    caption: "Mason Sutherland standing before the Prescott post office — where he served as Postmaster from 1924 until his retirement in 1945. The brick storefront with large plate glass windows was a fixture on the Prescott main street for over two decades.",
    src: "archives/walter-mason/mason-postoffice-prescott.jpg"
  },
  {
    type: "image",
    title: "The Building Today",
    label: "Today",
    caption: "The same Prescott building as it stands today — the brick front replaced with aluminum siding and the entrance relocated over the years. After Mason's retirement in 1945, son Carl converted it into a locker plant and grocery store, one of the few places in the area where families could rent freezer space to store meat. The east side shown here still reflects the original layout, including the carcass entry door and the walled-off smokehouse further down the alley.",
    src: "archives/walter-mason/prescott-building-today.jpg"
  }
],

"viewer-carl-mason": [
  {
    type: "image",
    title: "Carl & Mary Jane",
    label: "Together",
    src: "archives/carl-mason/carl-mary.jpg"
  },
  {
    type: "image",
    title: "Carl at Mizzou",
    label: "Carl 1933",
    caption: "Carl Mason Sutherland, Delta Sigma Phi fraternity portrait, University of Missouri, 1933.",
    src: "archives/carl-mason/carl-portrait.jpg"
  },
  {
    type: "image",
    title: "Mary Jane Portrait",
    label: "Mary Jane",
    caption: "Mary Jane Harryman, portrait photograph, circa mid-1930s.",
    src: "archives/carl-mason/maryj-portrait.jpg"
  }
]


};

// Clears the stage area and renders a single archive item into it.
// Supports three item types:
//   "image" — creates an <img> tag, appending a caption below if provided
//   "html"  — creates an <iframe> pointing to an HTML file (e.g. newspaper clippings)
//   "pdf"   — creates an <iframe> pointing to a PDF file
// Items are defined in ARCHIVE_ITEMS above, keyed by viewer ID.
function renderArchiveStage(stageEl, item) {
  stageEl.innerHTML = ""; // Clear any previously rendered content

  if (item.type === "image") {
    const img = document.createElement("img");
    img.src = item.src;
    img.alt = item.title || "Image";
    img.loading = "lazy"; // Defer loading until visible
    stageEl.appendChild(img);
    if (item.caption) {
      // Add descriptive caption below the image if one is defined
      const cap = document.createElement("p");
      cap.className = "viewer-caption";
      cap.textContent = item.caption;
      stageEl.appendChild(cap);
    }
    return;
  }

  if (item.type === "html") {
    // Render an HTML archive page (e.g. newspaper clippings) inside an iframe
    const iframe = document.createElement("iframe");
    iframe.src = item.src;
    iframe.title = item.title || "Archive item";
    iframe.loading = "lazy";
    stageEl.appendChild(iframe);
    return;
  }

  if (item.type === "pdf") {
    // Render a PDF document inside an iframe
    const iframe = document.createElement("iframe");
    iframe.src = item.src;
    iframe.title = item.title || "Document";
    iframe.loading = "lazy";
    stageEl.appendChild(iframe);
  }
}

// Builds (or rebuilds) the thumbnail strip beneath the stage area.
// If there is only one item, the strip is hidden — no point showing
// a single tab. For image items, a small preview image is used.
// For HTML and PDF items, a text label button is shown instead
// (since there is no image to use as a preview).
// The onPick callback is called with the selected index when a
// thumbnail is clicked, allowing the caller to update its state.
function buildArchiveThumbs(thumbsEl, items, activeIndex, onPick) {
  thumbsEl.innerHTML = ""; // Rebuild from scratch each time

  if (items.length <= 1) {
    // Only one item — no need for a thumbnail strip
    thumbsEl.style.display = "none";
    return;
  }

  thumbsEl.style.display = "flex";

  items.forEach((item, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "viewer-thumb" + (index === activeIndex ? " is-active" : "");
    btn.title = item.title || `Item ${index + 1}`;

    if (item.type === "image") {
      // Use the actual image as the thumbnail
      const img = document.createElement("img");
      img.src = item.src;
      img.alt = item.title || "Thumbnail";
      img.loading = "lazy";
      btn.appendChild(img);
    } else {
      // For HTML/PDF items, use a short text label as the tab button
      btn.textContent = item.label || (item.type === "html" ? "Article" : "PDF");
      btn.style.fontWeight = "700";
      btn.style.padding = "18px 10px";
      btn.style.background = "#fff";
    }

    btn.addEventListener("click", () => onPick(index));
    thumbsEl.appendChild(btn);
  });
}

// Initializes one archive viewer panel.
// Looks up the viewer's ID in ARCHIVE_ITEMS to get its item list,
// then sets up the stage, counter, thumbnail strip, and navigation.
// The internal updateViewer() function re-renders everything each
// time the selected item changes (prev/next/thumb click).
// When closed, the viewer resets to the first item (portrait) so
// it always opens fresh the next time.
function initArchiveViewer(viewerEl) {
  const viewerId = viewerEl.id;
  const items = ARCHIVE_ITEMS[viewerId] || []; // Pull items from the data object above
  if (!items.length) return; // Nothing to display — exit early

  const stage = viewerEl.querySelector(".viewer-stage");
  const thumbs = viewerEl.querySelector(".viewer-thumbs");
  const counter = viewerEl.querySelector(".viewer-counter");
  const prevBtn = viewerEl.querySelector(".viewer-prev");
  const nextBtn = viewerEl.querySelector(".viewer-next");
  const closeBtn = viewerEl.querySelector(".viewer-close");

  let currentIndex = 0; // Start at the first item

  // Re-renders the stage, counter, and thumbnail strip for the current index.
  // Disables prev/next buttons when there is only one item.
  function updateViewer() {
    renderArchiveStage(stage, items[currentIndex]);
    counter.textContent = `${currentIndex + 1} / ${items.length}`;

    // Rebuild thumbs; pass a callback so clicking a thumb updates currentIndex
    buildArchiveThumbs(thumbs, items, currentIndex, (newIndex) => {
      currentIndex = newIndex;
      updateViewer();
    });

    // Disable navigation when only one item exists
    const single = items.length <= 1;
    prevBtn.disabled = single;
    nextBtn.disabled = single;
  }

  prevBtn.onclick = () => {
    currentIndex = (currentIndex - 1 + items.length) % items.length; // Wrap backward
    updateViewer();
  };

  nextBtn.onclick = () => {
    currentIndex = (currentIndex + 1) % items.length; // Wrap forward
    updateViewer();
  };

  closeBtn.onclick = () => {
    viewerEl.hidden = true;
    currentIndex = 0; // Reset to the first item (portrait) on close
    updateViewer();

    // Update the aria-expanded state on the toggle button that opened this viewer
    const toggle = document.querySelector(`[data-viewer="${viewerId}"]`);
    if (toggle) toggle.setAttribute("aria-expanded", "false");
  };

  updateViewer(); // Render the initial state
}

// Event delegation for opening archive viewers.
// Rather than attaching a listener to every toggle button individually,
// a single listener on the document catches all clicks and checks
// whether the clicked element (or any of its parents) is a .viewer-toggle.
// This approach works even if toggle buttons are added to the page later.
// Each toggle stores the ID of its target viewer in a data-viewer attribute.
document.addEventListener("click", (event) => {
  const toggle = event.target.closest(".viewer-toggle");
  if (!toggle) return; // Click was not on a viewer toggle — ignore it

  const viewerId = toggle.getAttribute("data-viewer");
  const viewerEl = document.getElementById(viewerId);
  if (!viewerEl) return;

  viewerEl.hidden = false;
  toggle.setAttribute("aria-expanded", "true");

  if (!viewerEl.dataset.initialized) {
    // Run setup the first time this viewer is opened, then mark it done
    initArchiveViewer(viewerEl);
    viewerEl.dataset.initialized = "true";
  }
});

/* =============================================
   7. SEASONAL TAB VIEWER (Properties page)
   =============================================
   Builds the four-tab (Winter / Spring / Summer / Fall)
   photo viewer on properties.html. All photo data lives in
   SEASONAL_PHOTOS below, keyed by property name. The viewer
   element in the HTML only needs a data-property attribute
   (e.g. data-property="pleasanton") — the script looks up
   the matching photo arrays here.

   The gallery for each season is built entirely in JS: a big
   stage image with a caption at the bottom, a prev/next row
   with a "1 / 6" counter, and a scrolling thumbnail strip
   below. Each season keeps its own "where I was at" photo
   index so jumping between tabs doesn't reset progress.

   Lazy rendering — a season's gallery is only built when its
   tab is first clicked. That way the browser isn't eagerly
   loading four galleries at once when the page opens.

   Adding a new season to a property: drop new entries into
   the matching array in SEASONAL_PHOTOS. Adding a whole new
   property: add a new top-level key with winter/spring/summer/
   fall arrays, then set data-property="<key>" on the viewer
   element in the HTML.
   ============================================= */
// ============================================================
// SEASONAL TAB VIEWER — Properties Page
// ============================================================

const SEASONAL_PHOTOS = {
  pleasanton: {
    winter: [
      {
        src: "images/properties/pleasanton/pleasanton-winter-01-cabin.jpg",
        caption: "The Pleasanton cabin under heavy snowfall"
      },
      {
        src: "images/properties/pleasanton/pleasanton-winter-02-icicle-view.jpg",
        caption: "Winter sun through icicles — view from the deck"
      },
      {
        src: "images/properties/pleasanton/pleasanton-winter-03-snowy-woods.jpg",
        caption: "Fresh snow blankets the oak woodland"
      },
      {
        src: "images/properties/pleasanton/pleasanton-winter-04-snowy-oaks.jpg",
        caption: "Heavy snow bends the oak canopy into sweeping arches"
      },
      {
        src: "images/properties/pleasanton/pleasanton-winter-05-turkeys.jpg",
        caption: "Wild turkeys foraging through the snowy hillside"
      },
      {
        src: "images/properties/pleasanton/pleasanton-winter-06-deer.jpg",
        caption: "A herd of whitetail deer move through the timber"
      }
    ],
    spring: [
      {
        src: "images/properties/pleasanton/pleasanton-spring-01-cabin.jpg",
        caption: "Early spring at the cabin — new timber retaining walls taking shape"
      },
      {
        src: "images/properties/pleasanton/pleasanton-spring-02-green-woods.jpg",
        caption: "The oak woodland bursts to life with fresh spring green"
      },
      {
        src: "images/properties/pleasanton/pleasanton-spring-03-hailstorm.jpg",
        caption: "A spring hailstorm rolls through the timber — Kansas weather at its finest"
      },
      {
        src: "images/properties/pleasanton/pleasanton-spring-04-oak-sky.jpg",
        caption: "Spring arriving — first green buds beneath towering oaks"
      },
      {
        src: "images/properties/pleasanton/pleasanton-spring-05-turkeys.jpg",
        caption: "A tom turkey fans his tail for the hens on a frosty spring morning"
      }
    ],
    summer: [
      {
        src: "images/properties/pleasanton/pleasanton-summer-01-cabin.jpg",
        caption: "The Pleasanton cabin in full summer — green lawn and lush canopy"
      },
      {
        src: "images/properties/pleasanton/pleasanton-summer-02-putting-green.jpg",
        caption: "The property's own putting green tucked into the summer timber"
      },
      {
        src: "images/properties/pleasanton/pleasanton-summer-03-timber-trail.jpg",
        caption: "A winding trail through the oak timber on a summer day"
      },
      {
        src: "images/properties/pleasanton/pleasanton-summer-04-woodland.jpg",
        caption: "Summer shade beneath the oak canopy — cool and quiet"
      },
      {
        src: "images/properties/pleasanton/pleasanton-summer-05-field-view.jpg",
        caption: "Looking out across the open meadow to the timber beyond"
      },
      {
        src: "images/properties/pleasanton/pleasanton-summer-06-gate-drive.jpg",
        caption: "The rustic gate marks the entrance — the drive winds into the trees"
      }
    ],
    fall: [
      {
        src: "images/properties/pleasanton/pleasanton-fall-01-cabin-foliage.jpg",
        caption: "The cabin nestled in peak fall color — golden oaks all around"
      },
      {
        src: "images/properties/pleasanton/pleasanton-fall-02-canopy.jpg",
        caption: "Fall color sweeps through the canopy — yellows, oranges, and greens"
      },
      {
        src: "images/properties/pleasanton/pleasanton-fall-03-late-fall.jpg",
        caption: "Late fall in the timber — leaf-covered ground and a pop of color"
      },
      {
        src: "images/properties/pleasanton/pleasanton-fall-04-trail.jpg",
        caption: "A sunlit fall trail winds through the bare oaks"
      },
      {
        src: "images/properties/pleasanton/pleasanton-fall-05-sunset.jpg",
        caption: "A Kansas fall sunset — pink and purple skies through the timber"
      },
      {
        src: "images/properties/pleasanton/pleasanton-fall-06-turkeys.jpg",
        caption: "Two tom turkeys fan out in a full fall display"
      },
      {
        src: "images/properties/pleasanton/pleasanton-fall-07-deer-deck.jpg",
        caption: "Deer browse the timber as seen right from the cabin deck"
      }
    ]
  },
  // Prescott uses a lightbox gallery (see initPrescottGallery below)
  // rather than the seasonal tab viewer, so no entry is needed here.
};

const SEASON_COMING_SOON = {
  winter: { icon: "❄️", label: "Winter" },
  spring: { icon: "🌱", label: "Spring" },
  summer: { icon: "☀️", label: "Summer" },
  fall:   { icon: "🍂", label: "Fall" }
};

// Initializes one seasonal photo viewer for a given property.
// Each viewer is a self-contained widget with four tabs (Winter, Spring,
// Summer, Fall). Clicking a tab swaps the visible photo panel and renders
// that season's gallery if it has not been rendered yet (lazy rendering —
// panels are only built when first opened, not all at once on page load).
//
// Inside each season panel, the gallery is built entirely in JavaScript:
// a large stage image with caption, a prev/next navigation row with a
// counter, and a row of small thumbnail images beneath.
//
// Photo data comes from the SEASONAL_PHOTOS object above, keyed by the
// property name stored in the viewer element's data-property attribute.
// If a season has no photos yet, a "coming soon" placeholder is shown.
function initSeasonalViewer(viewerEl) {
  const property = viewerEl.dataset.property; // e.g. "pleasanton" or "prescott"
  if (!property || !SEASONAL_PHOTOS[property]) return; // Guard: unknown property

  const tabs = viewerEl.querySelectorAll(".season-tab");
  const panels = viewerEl.querySelectorAll(".season-panel");

  // Keep a separate photo index for each season so switching tabs
  // and back does not reset the position within a season's gallery.
  const currentIndex = {};
  Object.keys(SEASONAL_PHOTOS[property]).forEach(s => { currentIndex[s] = 0; });

  // Builds (or rebuilds) the gallery for one season inside its panel.
  // Called once per season on first open, and again whenever the user
  // navigates to a different photo (prev/next/thumbnail click).
  function renderPanel(season) {
    const panel = viewerEl.querySelector(`.season-panel[data-season="${season}"]`);
    if (!panel) return;
    const photos = SEASONAL_PHOTOS[property][season];

    panel.innerHTML = ""; // Clear previous content before rebuilding

    // If the season array is empty, show a friendly placeholder
    if (!photos || photos.length === 0) {
      const info = SEASON_COMING_SOON[season] || { icon: "📷", label: season };
      panel.innerHTML = `
        <div class="season-coming-soon">
          <span class="season-icon">${info.icon}</span>
          <p>${info.label} photos coming soon — check back later!</p>
        </div>`;
      return;
    }

    // Outer wrapper for the whole gallery layout
    const gallery = document.createElement("div");
    gallery.className = "season-gallery";

    // --- Stage: large image + caption ---
    const stage = document.createElement("div");
    stage.className = "season-stage";
    const img = document.createElement("img");
    img.src = photos[currentIndex[season]].src;
    img.alt = photos[currentIndex[season]].caption;
    const caption = document.createElement("div");
    caption.className = "season-caption";
    caption.textContent = photos[currentIndex[season]].caption;
    stage.appendChild(img);
    stage.appendChild(caption);

    // --- Navigation row: ← counter → ---
    const nav = document.createElement("div");
    nav.className = "season-nav";

    const prevBtn = document.createElement("button");
    prevBtn.className = "season-nav-btn";
    prevBtn.setAttribute("aria-label", "Previous photo");
    prevBtn.innerHTML = "&#8592;"; // Left arrow character

    const counter = document.createElement("div");
    counter.className = "season-counter";
    counter.textContent = `${currentIndex[season] + 1} / ${photos.length}`;

    const nextBtn = document.createElement("button");
    nextBtn.className = "season-nav-btn";
    nextBtn.setAttribute("aria-label", "Next photo");
    nextBtn.innerHTML = "&#8594;"; // Right arrow character

    nav.appendChild(prevBtn);
    nav.appendChild(counter);
    nav.appendChild(nextBtn);

    // --- Thumbnail strip ---
    // Small clickable preview images below the navigation row.
    // The active thumbnail gets the "active" CSS class for highlighting.
    const thumbsRow = document.createElement("div");
    thumbsRow.className = "season-thumbs";

    photos.forEach((photo, i) => {
      const thumb = document.createElement("div");
      thumb.className = "season-thumb" + (i === currentIndex[season] ? " active" : "");
      const tImg = document.createElement("img");
      tImg.src = photo.src;
      tImg.alt = photo.caption;
      tImg.loading = "lazy"; // Defer thumbnail loading until visible
      thumb.appendChild(tImg);

      // Clicking a thumbnail jumps directly to that photo and re-renders
      thumb.addEventListener("click", () => {
        currentIndex[season] = i;
        renderPanel(season);
      });
      thumbsRow.appendChild(thumb);
    });

    // Assemble the gallery: stage → nav → thumbs
    gallery.appendChild(stage);
    gallery.appendChild(nav);
    gallery.appendChild(thumbsRow);
    panel.appendChild(gallery);

    // Wire up prev/next buttons — wrap around at the ends
    prevBtn.addEventListener("click", () => {
      currentIndex[season] = (currentIndex[season] - 1 + photos.length) % photos.length;
      renderPanel(season);
    });

    nextBtn.addEventListener("click", () => {
      currentIndex[season] = (currentIndex[season] + 1) % photos.length;
      renderPanel(season);
    });
  }

  // --- Tab switching ---
  // When a season tab is clicked, deactivate all tabs and panels,
  // then activate only the selected tab and its matching panel.
  // Each panel is rendered lazily on first open using data-rendered
  // so the browser is not doing unnecessary work up front.
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const season = tab.dataset.season; // e.g. "winter", "spring"

      // Deactivate everything first
      tabs.forEach(t => t.classList.remove("active"));
      panels.forEach(p => p.classList.remove("active"));

      // Activate the clicked tab and its panel
      tab.classList.add("active");
      const activePanel = viewerEl.querySelector(`.season-panel[data-season="${season}"]`);
      if (activePanel) {
        activePanel.classList.add("active");
        if (!activePanel.dataset.rendered) {
          // First time this season has been opened — build its gallery
          renderPanel(season);
          activePanel.dataset.rendered = "true";
        }
      }
    });
  });

  // Render the default active tab on page load.
  // Looks for whichever tab already has the "active" class in the HTML;
  // falls back to "winter" if none is pre-selected.
  const defaultSeason = viewerEl.querySelector(".season-tab.active")?.dataset.season || "winter";
  renderPanel(defaultSeason);
  const defaultPanel = viewerEl.querySelector(`.season-panel[data-season="${defaultSeason}"]`);
  if (defaultPanel) {
    defaultPanel.dataset.rendered = "true"; // Mark as already rendered
  }
}

// Find every seasonal viewer on the page and initialize it when the
// DOM is fully loaded. Each viewer element must have a data-property
// attribute matching a key in SEASONAL_PHOTOS (e.g. data-property="pleasanton").
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".seasonal-viewer[data-property]").forEach(initSeasonalViewer);
});

/* =============================================
   6. PROPERTIES PAGE — Prescott photo gallery + lightbox
   =============================================
   The Prescott photos use a simpler approach than the seasonal
   tab viewer above — the photos are already in the HTML grid
   (.gallery-item figures), and this script just turns them into
   a clickable lightbox.

   Click anywhere on a photo (or hit Enter/Space when focused)
   and the script:
     1. Reads the figure's <img> src/alt and <figcaption> text
     2. Drops them into the #lightbox-img / #lightbox-caption /
        #lightbox-counter elements
     3. Shows the lightbox by setting hidden=false
     4. Locks page scrolling (overflow:hidden on body) so the
        page underneath doesn't scroll while the lightbox is open

   Navigation:
     - left/right arrow buttons cycle through photos
     - keyboard arrows do the same
     - Escape closes
     - Clicking the dark area outside the photo also closes
   ============================================= */
// ================================================
// PRESCOTT — Simple Photo Gallery Lightbox
// This runs automatically on the Properties page.
// When a visitor clicks any photo in the Prescott gallery,
// it opens a full-screen lightbox viewer with the caption, a photo
// counter (e.g. "3 / 17"), and left/right arrow navigation.
// Keyboard navigation is also supported: arrow keys move between
// photos and Escape closes the lightbox.
// New photos are picked up automatically as long as they are
// added to the HTML gallery grid — no JavaScript changes needed.
// ================================================

function initPrescottGallery() {
  const gallery = document.getElementById("prescott-gallery");
  if (!gallery) return;

  const lightbox  = document.getElementById("prescott-lightbox");
  const lbImg     = document.getElementById("lightbox-img");
  const lbCaption = document.getElementById("lightbox-caption");
  const lbCounter = document.getElementById("lightbox-counter");
  const lbClose   = lightbox.querySelector(".lightbox-close");
  const lbPrev    = lightbox.querySelector(".lightbox-prev");
  const lbNext    = lightbox.querySelector(".lightbox-next");

  const items = Array.from(gallery.querySelectorAll(".gallery-item"));
  let currentIdx = 0;

  function showItem(idx) {
    currentIdx = (idx + items.length) % items.length;
    const img = items[currentIdx].querySelector("img");
    const cap = items[currentIdx].querySelector("figcaption");
    lbImg.src = img.src;
    lbImg.alt = img.alt;
    lbCaption.textContent = cap ? cap.textContent : "";
    lbCounter.textContent = `${currentIdx + 1} / ${items.length}`;
  }

  function openLightbox(idx) {
    showItem(idx);
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    lbClose.focus();
  }

  function closeLightbox() {
    lightbox.hidden = true;
    document.body.style.overflow = "";
  }

  // Wire up each gallery item
  items.forEach((item, idx) => {
    const cap = item.querySelector("figcaption");
    item.setAttribute("tabindex", "0");
    item.setAttribute("role", "button");
    item.setAttribute("aria-label", cap ? cap.textContent : "View photo");

    item.addEventListener("click", () => openLightbox(idx));
    item.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openLightbox(idx);
      }
    });
  });

  lbClose.addEventListener("click", closeLightbox);
  lbPrev.addEventListener("click",  () => showItem(currentIdx - 1));
  lbNext.addEventListener("click",  () => showItem(currentIdx + 1));

  // Click outside inner content to close
  lightbox.addEventListener("click", e => {
    if (e.target === lightbox) closeLightbox();
  });

  // Keyboard navigation
  document.addEventListener("keydown", e => {
    if (lightbox.hidden) return;
    if (e.key === "Escape")     closeLightbox();
    if (e.key === "ArrowLeft")  showItem(currentIdx - 1);
    if (e.key === "ArrowRight") showItem(currentIdx + 1);
  });
}

document.addEventListener("DOMContentLoaded", initPrescottGallery);

/* =============================================
   8. FARM TALK — Category filter pills
   =============================================
   The row of filter pills across the top of farm-talk.html.
   Each pill has a data-category attribute ("all", "wildlife",
   "farming", etc.) and each article card has a matching
   data-category on its outer element. Click a pill and we:

     1. Mark that pill .active (removes .active from the others)
     2. Walk every article card and set display="" (show) if
        it matches, display="none" (hide) if it doesn't.

   Using style.display directly is simpler than adding/removing
   a class here — if we did it via a class, we'd have to remember
   to remove it from the correct cards on each click.
   ============================================= */
document.addEventListener("DOMContentLoaded", () => {
  const pills = document.querySelectorAll(".category-pill");
  const cards = document.querySelectorAll(".article-card");

  if (pills.length && cards.length) {
    pills.forEach(pill => {
      pill.addEventListener("click", () => {
        // Deactivate all pills, then mark the clicked one active
        pills.forEach(p => p.classList.remove("active"));
        pill.classList.add("active");

        const cat = pill.dataset.category; // The category to filter by

        // Show cards that match; hide those that do not
        cards.forEach(card => {
          if (cat === "all" || card.dataset.category === cat) {
            card.style.display = ""; // Restore default display
          } else {
            card.style.display = "none"; // Hide non-matching cards
          }
        });
      });
    });
  }
});

/* =============================================
   9. FARM TALK — Article expand / collapse
   =============================================
   Every article card has a "Read Article" button. Click it
   and the script flips three classes:

     .article-full   → .open   (CSS reveals the hidden body)
     .btn-read-article → .open (button color goes grey)
     .article-card   → .expanded (used by the print stylesheet
                                  so only the expanded card prints)

   Plus the button label flips between "Read Article" and
   "Close Article", and we smooth-scroll the card to the top
   of the viewport so the reader doesn't have to scroll
   themselves to find the newly-revealed text.

   The print stylesheet (@media print in styles.css) keys off
   the .expanded class — that's how the "Print Article" button
   ends up producing a clean printout of just this article.
   ============================================= */
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".btn-read-article").forEach(btn => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".article-card"); // The card containing this button
      const full = card ? card.querySelector(".article-full") : null;
      if (!full) return; // Guard: no expandable content found

      const isOpen = full.classList.contains("open");

      if (isOpen) {
        // Currently open — collapse it
        full.classList.remove("open");
        btn.textContent = "Read Article";
        btn.classList.remove("open");
        card.classList.remove("expanded");
      } else {
        // Currently closed — expand it and scroll into view
        full.classList.add("open");
        btn.textContent = "Close Article";
        btn.classList.add("open");
        card.classList.add("expanded");
        card.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
});
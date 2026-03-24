'use server';

export interface DailyWeather {
  date: string;
  maxTemp: number;
  minTemp: number;
  weatherCode: number;
}

export async function fetchTripWeather(
  destination: string,
  startDateStr?: string | null,
  duration: number = 5
): Promise<DailyWeather[] | null> {
  try {
    const fetchOptions = { cache: 'no-store' as RequestCache }; // Force Next.js to skip cache

    // 1. Geocode the destination
    let geoSearch = destination;
    let geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(geoSearch)}&count=1&language=en&format=json`,
      fetchOptions
    );
    let geoData = await geoRes.json();
    
    // Fallback 1: Try just the city name (before the comma)
    if (!geoData.results || geoData.results.length === 0) {
      const cityFallback = destination.split(',')[0].trim();
      if (cityFallback !== destination) {
        geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityFallback)}&count=1&language=en&format=json`,
          fetchOptions
        );
        geoData = await geoRes.json();
      }
    }

    // Fallback 2: Try just the country name (after the last comma)
    if (!geoData.results || geoData.results.length === 0) {
      const countryFallback = destination.split(',').pop()?.trim() || '';
      if (countryFallback && countryFallback !== destination) {
        geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(countryFallback)}&count=1&language=en&format=json`,
          fetchOptions
        );
        geoData = await geoRes.json();
      }
    }

    // If it STILL fails, abort gracefully.
    if (!geoData.results || geoData.results.length === 0) {
      console.warn('Weather Geocoding completely failed for:', destination);
      return null;
    }

    const { latitude, longitude, timezone } = geoData.results[0];
    const tz = timezone || 'auto';

    // 2. Determine Dates
    let start = new Date();
    if (startDateStr) {
      start = new Date(startDateStr);
    }
    
    const end = new Date(start);
    end.setDate(end.getDate() + duration - 1);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const maxForecastDate = new Date(today);
    maxForecastDate.setDate(maxForecastDate.getDate() + 14);

    let apiUrl = '';

    // If the ENTIRE trip falls within the next 14 days, use Live Forecast
    if (start >= today && end <= maxForecastDate) {
      const startIso = start.toISOString().split('T')[0];
      const endIso = end.toISOString().split('T')[0];
      apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=${tz}&start_date=${startIso}&end_date=${endIso}`;
    } 
    // Otherwise, use Historical Archive (1 year ago)
    else {
      const historicalStart = new Date(start);
      historicalStart.setFullYear(historicalStart.getFullYear() - 1);
      const historicalEnd = new Date(end);
      historicalEnd.setFullYear(historicalEnd.getFullYear() - 1);
      
      const startIso = historicalStart.toISOString().split('T')[0];
      const endIso = historicalEnd.toISOString().split('T')[0];
      
      apiUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${startIso}&end_date=${endIso}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=${tz}`;
    }

    // 3. Fetch the Weather
    const weatherRes = await fetch(apiUrl, fetchOptions);
    const weatherData = await weatherRes.json();

    if (!weatherData.daily || weatherData.error) {
       console.warn('Open-Meteo returned an error:', weatherData.reason || 'Unknown error');
       return null;
    }

    // 4. Map to our clean interface
    const formattedData: DailyWeather[] = weatherData.daily.time.map((date: string, index: number) => ({
      date: date,
      maxTemp: Math.round(weatherData.daily.temperature_2m_max[index]),
      minTemp: Math.round(weatherData.daily.temperature_2m_min[index]),
      weatherCode: weatherData.daily.weather_code[index],
    }));

    return formattedData;

  } catch (error) {
    console.error('Failed to fetch weather:', error);
    return null;
  }
}
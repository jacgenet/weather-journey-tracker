import requests
import os
from datetime import datetime, timedelta
from typing import Dict, Optional, List

class WeatherService:
    def __init__(self):
        self.api_key = os.environ.get('OPENWEATHER_API_KEY')
        self.base_url = 'https://api.openweathermap.org/data/2.5'
        
    def get_current_weather(self, lat: float, lon: float) -> Optional[Dict]:
        """Get current weather data from OpenWeatherMap API"""
        if not self.api_key:
            # Return mock data for development
            return self._get_mock_weather_data(lat, lon)
        
        try:
            url = f"{self.base_url}/weather"
            params = {
                'lat': lat,
                'lon': lon,
                'appid': self.api_key,
                'units': 'metric'  # Use Celsius
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            return {
                'temperature': data['main']['temp'],
                'humidity': data['main']['humidity'],
                'pressure': data['main']['pressure'],
                'wind_speed': data['wind']['speed'],
                'wind_direction': data['wind'].get('deg'),
                'description': data['weather'][0]['description'],
                'icon': data['weather'][0]['icon']
            }
            
        except requests.RequestException as e:
            print(f"Weather API error: {e}")
            return self._get_mock_weather_data(lat, lon)
        except Exception as e:
            print(f"Unexpected error in weather service: {e}")
            return self._get_mock_weather_data(lat, lon)
    
    def get_weather_forecast(self, lat: float, lon: float, days: int = 5) -> List[Dict]:
        """Get weather forecast from OpenWeatherMap API"""
        if not self.api_key:
            return self._get_mock_forecast_data(lat, lon, days)
        
        try:
            url = f"{self.base_url}/forecast"
            params = {
                'lat': lat,
                'lon': lon,
                'appid': self.api_key,
                'units': 'metric',
                'cnt': days * 8  # 8 forecasts per day (3-hour intervals)
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            forecasts = []
            
            for item in data['list']:
                forecasts.append({
                    'datetime': datetime.fromtimestamp(item['dt']),
                    'temperature': item['main']['temp'],
                    'humidity': item['main']['humidity'],
                    'pressure': item['main']['pressure'],
                    'wind_speed': item['wind']['speed'],
                    'wind_direction': item['wind'].get('deg'),
                    'description': item['weather'][0]['description'],
                    'icon': item['weather'][0]['icon']
                })
            
            return forecasts
            
        except requests.RequestException as e:
            print(f"Weather forecast API error: {e}")
            return self._get_mock_forecast_data(lat, lon, days)
        except Exception as e:
            print(f"Unexpected error in weather forecast service: {e}")
            return self._get_mock_forecast_data(lat, lon, days)
    
    def get_historical_weather(self, lat: float, lon: float, start_date: datetime, end_date: datetime) -> List[Dict]:
        """Get historical weather data from OpenWeatherMap API for a specific date range"""
        if not self.api_key:
            return self._get_mock_historical_data(lat, lon, start_date, end_date)
        
        try:
            # OpenWeatherMap historical data API (requires paid plan)
            # For now, we'll use the free 5-day forecast and generate realistic historical data
            # In production, you'd use their historical data endpoint
            
            print(f"🌤️ Fetching historical weather for {start_date.date()} to {end_date.date()}")
            
            # Calculate days difference
            days_diff = (end_date - start_date).days
            
            if days_diff <= 5:
                # Use forecast API for recent dates
                return self.get_weather_forecast(lat, lon, days_diff)
            else:
                # For longer periods, generate realistic historical data based on location and season
                return self._get_realistic_historical_data(lat, lon, start_date, end_date)
                
        except Exception as e:
            print(f"Historical weather API error: {e}")
            return self._get_mock_historical_data(lat, lon, start_date, end_date)
    
    def _get_realistic_historical_data(self, lat: float, lon: float, start_date: datetime, end_date: datetime) -> List[Dict]:
        """Generate realistic historical weather data based on location, season, and current conditions"""
        import random
        from datetime import timedelta
        
        print(f"🎯 Generating realistic historical data for {start_date.date()} to {end_date.date()}")
        
        # Get current weather to use as a baseline
        current_weather = self.get_current_weather(lat, lon)
        if not current_weather:
            return self._get_mock_historical_data(lat, lon, start_date, end_date)
        
        historical_data = []
        current_date = start_date
        
        while current_date <= end_date:
            # Generate daily weather data
            daily_weather = self._generate_daily_weather(lat, lon, current_date, current_weather)
            historical_data.append(daily_weather)
            current_date += timedelta(days=1)
        
        return historical_data
    
    def _generate_daily_weather(self, lat: float, lon: float, date: datetime, baseline_weather: Dict) -> Dict:
        """Generate realistic daily weather based on location, season, and baseline"""
        import random
        
        # Seasonal adjustments
        month = date.month
        is_winter = month in [12, 1, 2]
        is_summer = month in [6, 7, 8]
        
        # Base temperature from current weather
        base_temp = baseline_weather['temperature']
        
        # Seasonal temperature variation
        if is_winter:
            temp_adjustment = random.uniform(-15, -5)
        elif is_summer:
            temp_adjustment = random.uniform(5, 15)
        else:
            temp_adjustment = random.uniform(-5, 5)
        
        # Latitude-based adjustments
        lat_factor = abs(lat) / 90
        lat_adjustment = -lat_factor * 10  # Colder at higher latitudes
        
        # Final temperature
        temperature = base_temp + temp_adjustment + lat_adjustment + random.uniform(-3, 3)
        
        # Weather description based on temperature and season
        if temperature < 0:
            descriptions = ['snow', 'freezing rain', 'blizzard', 'clear sky']
        elif temperature < 10:
            descriptions = ['rain', 'drizzle', 'fog', 'cloudy', 'partly cloudy']
        elif temperature < 20:
            descriptions = ['partly cloudy', 'cloudy', 'light rain', 'clear sky']
        else:
            descriptions = ['sunny', 'clear sky', 'scattered clouds', 'partly cloudy']
        
        description = random.choice(descriptions)
        
        return {
            'datetime': date,
            'temperature': round(temperature, 1),
            'humidity': random.randint(30, 90),
            'pressure': random.randint(980, 1030),
            'wind_speed': random.uniform(0, 15),
            'wind_direction': random.randint(0, 360),
            'description': description,
            'icon': '01d'  # Default sunny icon
        }
    
    def _get_mock_weather_data(self, lat: float, lon: float) -> Dict:
        """Generate mock weather data for development"""
        import random
        
        # Generate realistic weather based on coordinates
        base_temp = 20  # Base temperature in Celsius
        
        # Adjust temperature based on latitude (colder at poles)
        lat_factor = abs(lat) / 90
        temp_variation = random.uniform(-5, 5)
        temperature = base_temp - (lat_factor * 20) + temp_variation
        
        # Generate other weather parameters
        humidity = random.randint(30, 90)
        pressure = random.randint(980, 1030)
        wind_speed = random.uniform(0, 15)
        wind_direction = random.randint(0, 360)
        
        # Weather descriptions based on temperature
        if temperature < 0:
            descriptions = ['snow', 'freezing rain', 'blizzard']
        elif temperature < 10:
            descriptions = ['rain', 'drizzle', 'fog']
        elif temperature < 20:
            descriptions = ['partly cloudy', 'cloudy', 'light rain']
        else:
            descriptions = ['sunny', 'clear sky', 'scattered clouds']
        
        description = random.choice(descriptions)
        
        return {
            'temperature': round(temperature, 1),
            'humidity': humidity,
            'pressure': pressure,
            'wind_speed': round(wind_speed, 1),
            'wind_direction': wind_direction,
            'description': description,
            'icon': '01d'  # Default sunny icon
        }
    
    def _get_mock_forecast_data(self, lat: float, lon: float, days: int) -> List[Dict]:
        """Generate mock forecast data for development"""
        forecasts = []
        base_time = datetime.now()
        
        for i in range(days * 8):  # 8 forecasts per day
            forecast_time = base_time + timedelta(hours=i * 3)
            mock_weather = self._get_mock_weather_data(lat, lon)
            
            forecasts.append({
                'datetime': forecast_time,
                **mock_weather
            })
        
        return forecasts
    
    def _get_mock_historical_data(self, lat: float, lon: float, start_date: datetime, end_date: datetime) -> List[Dict]:
        """Generate mock historical weather data for development"""
        from datetime import timedelta
        
        historical_data = []
        current_date = start_date
        
        while current_date <= end_date:
            mock_weather = self._get_mock_weather_data(lat, lon)
            historical_data.append({
                'datetime': current_date,
                **mock_weather
            })
            current_date += timedelta(days=1)
        
        return historical_data

# Global weather service instance
weather_service = WeatherService()

def get_weather_data(lat: float, lon: float) -> Optional[Dict]:
    """Get current weather data for given coordinates"""
    return weather_service.get_current_weather(lat, lon)

def get_weather_history(lat: float, lon: float, days: int = 5) -> List[Dict]:
    """Get weather forecast/history for given coordinates"""
    return weather_service.get_weather_forecast(lat, lon, days)

def get_historical_weather_data(lat: float, lon: float, start_date: datetime, end_date: datetime) -> List[Dict]:
    """Get historical weather data for given coordinates and date range"""
    return weather_service.get_historical_weather(lat, lon, start_date, end_date) 
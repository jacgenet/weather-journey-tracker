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

# Global weather service instance
weather_service = WeatherService()

def get_weather_data(lat: float, lon: float) -> Optional[Dict]:
    """Get current weather data for given coordinates"""
    return weather_service.get_current_weather(lat, lon)

def get_weather_history(lat: float, lon: float, days: int = 5) -> List[Dict]:
    """Get weather forecast/history for given coordinates"""
    return weather_service.get_weather_forecast(lat, lon, days) 
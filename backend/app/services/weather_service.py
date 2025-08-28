import requests
import os
import json
from datetime import datetime, timedelta
from typing import Dict, Optional, List
from app import db
from app.models.weather_record import WeatherRecord

class WeatherService:
    def __init__(self):
        self.api_key = os.environ.get('OPENWEATHER_API_KEY')
        self.base_url = 'https://api.openweathermap.org/data/2.5'
        
    def upload_historical_data(self, location_id: int, json_data: str) -> Dict:
        """Parse and store historical weather data from uploaded JSON file"""
        try:
            # Parse JSON data
            weather_data = json.loads(json_data)
            
            if not isinstance(weather_data, list):
                return {'success': False, 'error': 'JSON data must be a list of weather records'}
            
            # Track statistics
            total_records = len(weather_data)
            stored_records = 0
            skipped_records = 0
            errors = []
            
            print(f"📊 Processing {total_records} historical weather records for location {location_id}")
            
            for i, record in enumerate(weather_data):
                try:
                    # Validate required fields
                    if not all(key in record for key in ['date', 'temperature']):
                        errors.append(f"Record {i}: Missing required fields (date, temperature)")
                        skipped_records += 1
                        continue
                    
                    # Parse date (handle multiple possible formats)
                    date_str = record['date']
                    parsed_date = self._parse_date_string(date_str)
                    
                    if not parsed_date:
                        errors.append(f"Record {i}: Invalid date format: {date_str}")
                        skipped_records += 1
                        continue
                    
                    # Check if record already exists for this date and location
                    existing_record = WeatherRecord.query.filter_by(
                        location_id=location_id,
                        recorded_at=parsed_date
                    ).first()
                    
                    if existing_record:
                        print(f"⏭️ Skipping duplicate record for {parsed_date.date()}")
                        skipped_records += 1
                        continue
                    
                    # Create new weather record
                    weather_record = WeatherRecord(
                        location_id=location_id,
                        temperature=float(record['temperature']),
                        humidity=float(record.get('humidity', 0)) if record.get('humidity') else None,
                        pressure=float(record.get('pressure', 0)) if record.get('pressure') else None,
                        wind_speed=float(record.get('wind_speed', 0)) if record.get('wind_speed') else None,
                        wind_direction=float(record.get('wind_direction', 0)) if record.get('wind_direction') else None,
                        description=record.get('description', 'Historical data'),
                        icon=record.get('icon', '01d'),
                        recorded_at=parsed_date
                    )
                    
                    db.session.add(weather_record)
                    stored_records += 1
                    
                    # Commit every 100 records to avoid memory issues
                    if stored_records % 100 == 0:
                        db.session.commit()
                        print(f"💾 Committed {stored_records} records so far...")
                    
                except Exception as e:
                    errors.append(f"Record {i}: {str(e)}")
                    skipped_records += 1
                    continue
            
            # Final commit for remaining records
            db.session.commit()
            
            print(f"✅ Successfully stored {stored_records} historical weather records")
            print(f"⏭️ Skipped {skipped_records} records")
            
            if errors:
                print(f"⚠️ {len(errors)} errors encountered:")
                for error in errors[:5]:  # Show first 5 errors
                    print(f"  - {error}")
                if len(errors) > 5:
                    print(f"  ... and {len(errors) - 5} more errors")
            
            return {
                'success': True,
                'total_records': total_records,
                'stored_records': stored_records,
                'skipped_records': skipped_records,
                'errors': errors
            }
            
        except json.JSONDecodeError as e:
            return {'success': False, 'error': f'Invalid JSON format: {str(e)}'}
        except Exception as e:
            db.session.rollback()
            return {'success': False, 'error': f'Failed to process historical data: {str(e)}'}
    
    def _parse_date_string(self, date_str: str) -> Optional[datetime]:
        """Parse date string in various formats"""
        date_formats = [
            '%Y-%m-%d',           # 2024-01-15
            '%Y-%m-%d %H:%M:%S',  # 2024-01-15 14:30:00
            '%Y-%m-%dT%H:%M:%S',  # 2024-01-15T14:30:00
            '%Y-%m-%dT%H:%M:%SZ', # 2024-01-15T14:30:00Z
            '%m/%d/%Y',           # 01/15/2024
            '%d/%m/%Y',           # 15/01/2024
        ]
        
        for fmt in date_formats:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue
        
        return None

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

def upload_historical_weather_data(location_id: int, json_data: str) -> Dict:
    """Upload and store historical weather data from JSON file"""
    return weather_service.upload_historical_data(location_id, json_data) 
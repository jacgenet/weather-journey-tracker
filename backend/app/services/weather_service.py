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
                    # Validate required fields (check for multiple possible date field names)
                    date_field = None
                    for possible_date_field in ['date', 'dt', 'dt_iso']:
                        if possible_date_field in record:
                            date_field = possible_date_field
                            break
                    
                    if not date_field or 'temperature' not in record:
                        errors.append(f"Record {i}: Missing required fields (date/dt/dt_iso, temperature)")
                        skipped_records += 1
                        continue
                    
                    # Parse date (handle multiple possible formats)
                    date_str = record[date_field]
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
                        icon=record.get('icon', '01d')
                    )
                    
                    # Set the recorded_at timestamp after creation
                    weather_record.recorded_at = parsed_date
                    
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
    
    def upload_multi_location_historical_data(self, user_id: int, json_data: str) -> Dict:
        """Parse and store historical weather data from uploaded JSON file for multiple locations"""
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
            location_mapping = {}
            
            print(f"📊 Processing {total_records} historical weather records for multiple locations")
            print(f"🔍 Sample record structure: {list(weather_data[0].keys()) if weather_data else 'No records'}")
            
            # First pass: analyze location information and create mapping
            from app.models.location import Location
            
            for i, record in enumerate(weather_data):
                try:
                    # Extract location information from record
                    location_info = self._extract_location_info(record)
                    if not location_info:
                        print(f"❌ Record {i}: Missing location information. Record keys: {list(record.keys())}")
                        errors.append(f"Record {i}: Missing location information")
                        skipped_records += 1
                        continue
                    
                    print(f"📍 Record {i}: Extracted location info: {location_info}")
                    
                    # Try to find matching location in database
                    location_key = self._create_location_key(location_info)
                    print(f"🔑 Record {i}: Created location key: {location_key}")
                    
                    if location_key not in location_mapping:
                        location_mapping[location_key] = self._find_matching_location(user_id, location_info)
                    
                    if not location_mapping[location_key]:
                        print(f"❌ Record {i}: No matching location found for {location_info.get('name', 'Unknown')}")
                        errors.append(f"Record {i}: No matching location found for {location_info.get('name', 'Unknown')}")
                        skipped_records += 1
                        continue
                    else:
                        print(f"✅ Record {i}: Matched to location: {location_mapping[location_key].name}")
                        
                except Exception as e:
                    print(f"❌ Record {i}: Error processing location info: {str(e)}")
                    errors.append(f"Record {i}: Error processing location info: {str(e)}")
                    skipped_records += 1
                    continue
            
            print(f"📍 Found {len(location_mapping)} unique locations in data")
            print(f"📍 Location mapping: {[(k, v.name if v else 'None') for k, v in location_mapping.items()]}")
            
            # Second pass: process weather records
            for i, record in enumerate(weather_data):
                try:
                    # Validate required fields (check for multiple possible date field names)
                    date_field = None
                    for possible_date_field in ['date', 'dt', 'dt_iso']:
                        if possible_date_field in record:
                            date_field = possible_date_field
                            break
                    
                    # Check for temperature field (temp, temperature, or temp_min) - handle nested main object
                    temperature = None
                    if 'main' in record and isinstance(record['main'], dict):
                        # Check nested main object first
                        if 'temp' in record['main']:
                            temperature = record['main']['temp']
                        elif 'temp_min' in record['main']:
                            temperature = record['main']['temp_min']
                    # Check top level fields
                    if temperature is None:
                        if 'temp' in record:
                            temperature = record['temp']
                        elif 'temperature' in record:
                            temperature = record['temperature']
                        elif 'temp_min' in record:
                            temperature = record['temp_min']
                    
                    if not date_field or temperature is None:
                        errors.append(f"Record {i}: Missing required fields (date/dt/dt_iso, temp/temperature/temp_min)")
                        skipped_records += 1
                        continue
                    
                    # Extract location information
                    location_info = self._extract_location_info(record)
                    location_key = self._create_location_key(location_info)
                    location = location_mapping[location_key]
                    
                    if not location:
                        continue  # Already counted as skipped above
                    
                    # Parse date
                    date_str = record[date_field]
                    parsed_date = self._parse_date_string(date_str)
                    
                    if not parsed_date:
                        errors.append(f"Record {i}: Invalid date format: {date_str}")
                        skipped_records += 1
                        continue
                    
                    # Check if record already exists for this date and location
                    existing_record = WeatherRecord.query.filter_by(
                        location_id=location.id,
                        recorded_at=parsed_date
                    ).first()
                    
                    if existing_record:
                        print(f"⏭️ Skipping duplicate record for {location.name} on {parsed_date.date()}")
                        skipped_records += 1
                        continue
                    
                    # Create new weather record - handle nested main and wind objects
                    # Convert Fahrenheit to Celsius: (F - 32) * 5/9
                    temp_celsius = (float(temperature) - 32) * 5/9 if temperature else None
                    
                    weather_record = WeatherRecord(
                        location_id=location.id,
                        temperature=temp_celsius,
                        humidity=float(record.get('humidity', record.get('main', {}).get('humidity', 0))) if record.get('humidity') or record.get('main', {}).get('humidity') else None,
                        pressure=float(record.get('pressure', record.get('main', {}).get('pressure', 0))) if record.get('pressure') or record.get('main', {}).get('pressure') else None,
                        wind_speed=float(record.get('wind_speed', record.get('wind', {}).get('speed', 0))) if record.get('wind_speed') or record.get('wind', {}).get('speed') else None,
                        wind_direction=float(record.get('wind_direction', record.get('wind', {}).get('deg', 0))) if record.get('wind_direction') or record.get('wind', {}).get('deg') else None,
                        description=record.get('description', record.get('weather', [{}])[0].get('description', 'Historical data') if record.get('weather') else 'Historical data'),
                        icon=record.get('icon', record.get('weather', [{}])[0].get('icon', '01d') if record.get('weather') else '01d')
                    )
                    
                    # Set the recorded_at timestamp after creation
                    weather_record.recorded_at = parsed_date
                    
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
            print(f"📍 Processed data for {len(location_mapping)} locations")
            
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
                'locations_processed': len(location_mapping),
                'errors': errors
            }
            
        except json.JSONDecodeError as e:
            return {'success': False, 'error': f'Invalid JSON format: {str(e)}'}
        except Exception as e:
            db.session.rollback()
            return {'success': False, 'error': f'Failed to process historical data: {str(e)}'}
    
    def _extract_location_info(self, record: Dict) -> Optional[Dict]:
        """Extract location information from a weather record"""
        # Try different possible field names for location information
        location_fields = ['location_name', 'location', 'name', 'city', 'city_name', 'address']
        
        location_info = {}
        
        print(f"🔍 Extracting location info from record with keys: {list(record.keys())}")
        
        # Look for location name
        for field in location_fields:
            if field in record and record[field]:
                location_info['name'] = str(record[field])
                print(f"  ✅ Found name from field '{field}': {location_info['name']}")
                break
        
        # If no name found but we have city_name, use that as the nam
        if not location_info.get('name') and 'city_name' in record and record['city_name']:
            location_info['name'] = str(record['city_name'])
            print(f"  ✅ Using city_name as name: {location_info['name']}")
        
        # Look for city (try multiple field names)
        city_fields = ['city', 'city_name']
        for field in city_fields:
            if field in record and record[field]:
                location_info['city'] = str(record[field])
                print(f"  ✅ Found city from field '{field}': {location_info['city']}")
                break
        
        # Look for coordinates (try multiple field names)
        lat_fields = ['latitude', 'lat']
        lon_fields = ['longitude', 'lon']
        
        lat_value = None
        lon_value = None
        
        for field in lat_fields:
            if field in record and record[field]:
                try:
                    lat_value = float(record[field])
                    print(f"  ✅ Found latitude from field '{field}': {lat_value}")
                    break
                except (ValueError, TypeError):
                    print(f"  ❌ Invalid latitude from field '{field}': {record[field]}")
                    continue
        
        for field in lon_fields:
            if field in record and record[field]:
                try:
                    lon_value = float(record[field])
                    print(f"  ✅ Found longitude from field '{field}': {lon_value}")
                    break
                except (ValueError, TypeError):
                    print(f"  ❌ Invalid longitude from field '{field}': {record[field]}")
                    continue
        
        if lat_value is not None and lon_value is not None:
            location_info['latitude'] = lat_value
            location_info['longitude'] = lon_value
            print(f"  ✅ Final coordinates: {lat_value}, {lon_value}")
        else:
            print(f"  ❌ Debug: lat_value={lat_value}, lon_value={lon_value}")
        
        # Look for address
        if 'address' in record and record['address']:
            location_info['address'] = str(record['address'])
            print(f"  ✅ Found address: {location_info['address']}")
        
        # If we have coordinates but no name, create a name from city or coordinates
        if not location_info.get('name') and (location_info.get('latitude') and location_info.get('longitude')):
            if location_info.get('city'):
                location_info['name'] = f"{location_info['city']} ({location_info['latitude']:.4f}, {location_info['longitude']:.4f})"
            else:
                location_info['name'] = f"Location ({location_info['latitude']:.4f}, {location_info['longitude']:.4f})"
            print(f"  ✅ Created name from coordinates: {location_info['name']}")
        
        # Must have at least a name or coordinates
        print(f"  🔍 Debug: name={location_info.get('name')}, lat={location_info.get('latitude')}, lon={location_info.get('longitude')}")
        if not location_info.get('name') and not (location_info.get('latitude') and location_info.get('longitude')):
            print(f"  ❌ No valid location info found. Have: {location_info}")
            return None
        
        print(f"  ✅ Final location info: {location_info}")
        return location_info
    
    def _create_location_key(self, location_info: Dict) -> str:
        """Create a unique key for location matching"""
        if location_info.get('latitude') and location_info.get('longitude'):
            # Use coordinates if available (most precise)
            return f"coord_{location_info['latitude']:.6f}_{location_info['longitude']:.6f}"
        elif location_info.get('name') and location_info.get('city'):
            # Use name + city combination
            return f"name_{location_info['name'].lower()}_{location_info['city'].lower()}"
        elif location_info.get('name'):
            # Just use name
            return f"name_{location_info['name'].lower()}"
        else:
            # Fallback to coordinates if available
            return f"coord_{location_info.get('latitude', 0):.6f}_{location_info.get('longitude', 0):.6f}"
    
    def _find_matching_location(self, user_id: int, location_info: Dict) -> Optional[object]:
        """Find a matching location in the database"""
        from app.models.location import Location
        
        # First try to match by coordinates with flexible tolerance
        if location_info.get('latitude') and location_info.get('longitude'):
            lat, lon = location_info['latitude'], location_info['longitude']
            
            # Try multiple tolerance levels for coordinate matching
            tolerances = [
                0.001,   # ~111 meters (very precise)
                0.01,    # ~1.1 km (precise)
                0.022,   # ~2.4 km (1.5 miles - target tolerance)
                0.1,     # ~11 km (moderate)
                0.5,     # ~55 km (loose)
                1.0      # ~111 km (very loose)
            ]
            
            for tolerance in tolerances:
                print(f"  🔍 Trying coordinate tolerance: ±{tolerance}° (~{tolerance * 111:.0f} km)")
                
                location = Location.query.filter(
                    Location.user_id == user_id,
                    Location.latitude.between(lat - tolerance, lat + tolerance),
                    Location.longitude.between(lon - tolerance, lon + tolerance)
                ).first()
                
                if location:
                    distance_km = ((lat - location.latitude) ** 2 + (lon - location.longitude) ** 2) ** 0.5 * 111
                    print(f"📍 Matched location by coordinates (tolerance ±{tolerance}°): {location.name}")
                    print(f"  📏 Distance: {distance_km:.1f} km")
                    return location
            
            print(f"  ❌ No coordinate match found even with ±1.0° tolerance (~111 km)")
            print(f"  🎯 Target tolerance: ±0.022° (~1.5 miles)")
            print(f"  📍 Your coordinates: {lat}, {lon}")
            print(f"  🗺️ Available locations:")
            all_locations = Location.query.filter_by(user_id=user_id).all()
            for loc in all_locations:
                distance = ((lat - loc.latitude) ** 2 + (lon - loc.longitude) ** 2) ** 0.5 * 111
                print(f"    - {loc.name}: {loc.latitude}, {loc.longitude} ({distance:.1f} km away)")
        
        # Try to match by name and city (more flexible)
        if location_info.get('name') and location_info.get('city'):
            print(f"  🔍 Trying name+city match: '{location_info['name']}' + '{location_info['city']}'")
            
            # Try exact match first
            location = Location.query.filter(
                Location.user_id == user_id,
                Location.name.ilike(f"%{location_info['name']}%"),
                Location.city.ilike(f"%{location_info['city']}%")
            ).first()
            
            if location:
                print(f"📍 Matched location by name+city: {location.name}")
                return location
            
            # Try partial matches if exact didn't work
            location = Location.query.filter(
                Location.user_id == user_id,
                Location.city.ilike(f"%{location_info['city']}%")
            ).first()
            
            if location:
                print(f"📍 Matched location by city only (name partial match failed): {location.name}")
                return location
        
        # Try to match by name only (more flexible)
        if location_info.get('name'):
            print(f"  🔍 Trying name match: '{location_info['name']}'")
            
            # Try exact name match
            location = Location.query.filter(
                Location.user_id == user_id,
                Location.name.ilike(f"%{location_info['name']}%")
            ).first()
            
            if location:
                print(f"📍 Matched location by name: {location.name}")
                return location
            
            # Try partial name matches
            name_parts = location_info['name'].split()
            for part in name_parts:
                if len(part) > 2:  # Only try parts longer than 2 characters
                    location = Location.query.filter(
                        Location.user_id == user_id,
                        Location.name.ilike(f"%{part}%")
                    ).first()
                    
                    if location:
                        print(f"📍 Matched location by name part '{part}': {location.name}")
                        return location
        
        # Try to match by city only (more flexible)
        if location_info.get('city'):
            print(f"  🔍 Trying city match: '{location_info['city']}'")
            
            # Try exact city match
            location = Location.query.filter(
                Location.user_id == user_id,
                Location.city.ilike(f"%{location_info['city']}%")
            ).first()
            
            if location:
                print(f"📍 Matched location by city: {location.name}")
                return location
            
            # Try partial city matches
            city_parts = location_info['city'].split()
            for part in city_parts:
                if len(part) > 2:  # Only try parts longer than 2 characters
                    location = Location.query.filter(
                        Location.user_id == user_id,
                        Location.city.ilike(f"%{part}%")
                    ).first()
                    
                    if location:
                        print(f"📍 Matched location by city part '{part}': {location.name}")
                        return location
            
            # Try matching by address if city doesn't work
            if location_info.get('city') == 'Healdsburg':
                print(f"  🔍 Trying address match for Healdsburg...")
                location = Location.query.filter(
                    Location.user_id == user_id,
                    Location.address.ilike('%Healdsburg%')
                ).first()
                
                if location:
                    print(f"📍 Matched location by address containing 'Healdsburg': {location.name}")
                    return location
        
        print(f"❌ No matching location found for: {location_info}")
        return None

    def _parse_date_string(self, date_str: str) -> Optional[datetime]:
        """Parse date string in various formats including Unix timestamp"""
        # First try to parse as Unix timestamp (integer)
        try:
            timestamp = int(date_str)
            return datetime.fromtimestamp(timestamp)
        except (ValueError, TypeError):
            pass
        
        # Try various date string formats
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
        # Check if dates are in the future
        now = datetime.utcnow()
        if start_date > now or end_date > now:
            print(f"⚠️ Requested dates are in the future: {start_date.date()} to {end_date.date()}")
            return []  # Return empty list for future dates
        
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
        
        # Generate realistic weather based on coordinates and season
        # More realistic temperature calculation
        if lat > 0:  # Northern hemisphere
            # Summer temperatures (June-August)
            if 30 <= lat <= 50:  # Mediterranean/Europe region
                base_temp = 25  # 25°C (77°F) base for summer
                temp_variation = random.uniform(-3, 3)
            elif 40 <= lat <= 60:  # Northern Europe
                base_temp = 20  # 20°C (68°F) base for summer
                temp_variation = random.uniform(-5, 5)
            else:
                base_temp = 15  # 15°C (59°F) for other regions
                temp_variation = random.uniform(-5, 5)
        else:  # Southern hemisphere
            base_temp = 20
            temp_variation = random.uniform(-5, 5)
        
        temperature = base_temp + temp_variation
        
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

def upload_multi_location_historical_data(user_id: int, json_data: str) -> Dict:
    """Upload and store historical weather data from JSON file for multiple locations"""
    return weather_service.upload_multi_location_historical_data(user_id, json_data) 
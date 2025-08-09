import requests
import os
from typing import Optional, Tuple

class GeocodingService:
    def __init__(self):
        self.api_key = os.environ.get('GEOCODING_API_KEY')
        self.base_url = 'https://api.openweathermap.org/geo/1.0'
        
    def get_coordinates(self, location_name: str) -> Optional[Tuple[float, float]]:
        """Get coordinates for a location name"""
        if not self.api_key:
            # Return mock coordinates for development
            return self._get_mock_coordinates(location_name)
        
        try:
            url = f"{self.base_url}/direct"
            params = {
                'q': location_name,
                'limit': 1,
                'appid': self.api_key
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if data and len(data) > 0:
                location = data[0]
                return (location['lat'], location['lon'])
            
            return None
            
        except requests.RequestException as e:
            print(f"Geocoding API error: {e}")
            return self._get_mock_coordinates(location_name)
        except Exception as e:
            print(f"Unexpected error in geocoding service: {e}")
            return self._get_mock_coordinates(location_name)
    
    def get_location_name(self, lat: float, lon: float) -> Optional[str]:
        """Get location name from coordinates (reverse geocoding)"""
        if not self.api_key:
            return self._get_mock_location_name(lat, lon)
        
        try:
            url = f"{self.base_url}/reverse"
            params = {
                'lat': lat,
                'lon': lon,
                'limit': 1,
                'appid': self.api_key
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if data and len(data) > 0:
                location = data[0]
                return f"{location.get('name', '')}, {location.get('country', '')}"
            
            return None
            
        except requests.RequestException as e:
            print(f"Reverse geocoding API error: {e}")
            return self._get_mock_location_name(lat, lon)
        except Exception as e:
            print(f"Unexpected error in reverse geocoding service: {e}")
            return self._get_mock_location_name(lat, lon)
    
    def _get_mock_coordinates(self, location_name: str) -> Tuple[float, float]:
        """Generate mock coordinates for development"""
        import hashlib
        
        # Generate deterministic coordinates based on location name
        hash_obj = hashlib.md5(location_name.lower().encode())
        hash_hex = hash_obj.hexdigest()
        
        # Convert hash to coordinates
        lat = (int(hash_hex[:8], 16) / 0xffffffff) * 180 - 90  # -90 to 90
        lon = (int(hash_hex[8:16], 16) / 0xffffffff) * 360 - 180  # -180 to 180
        
        return (lat, lon)
    
    def _get_mock_location_name(self, lat: float, lon: float) -> str:
        """Generate mock location name for development"""
        # Simple mapping based on coordinates
        if lat > 60:
            region = "Northern"
        elif lat > 30:
            region = "Temperate"
        elif lat > 0:
            region = "Tropical"
        else:
            region = "Southern"
        
        if lon > 120:
            continent = "Asia"
        elif lon > 0:
            continent = "Europe/Africa"
        elif lon > -60:
            continent = "Americas"
        else:
            continent = "Pacific"
        
        return f"Mock {region} {continent} Location"

# Global geocoding service instance
geocoding_service = GeocodingService()

def get_coordinates(location_name: str) -> Optional[Tuple[float, float]]:
    """Get coordinates for a location name"""
    return geocoding_service.get_coordinates(location_name)

def get_location_name(lat: float, lon: float) -> Optional[str]:
    """Get location name from coordinates"""
    return geocoding_service.get_location_name(lat, lon) 
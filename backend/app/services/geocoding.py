import requests
import os
from typing import Optional, Tuple

class GeocodingService:
    def __init__(self):
        self.api_key = os.environ.get('GOOGLE_MAPS_API_KEY')
        self.base_url = 'https://maps.googleapis.com/maps/api/geocode/json'
        
    def get_coordinates(self, location_name: str) -> Optional[Tuple[float, float]]:
        """Get coordinates for a location name using Google Geocoding API"""
        if not self.api_key:
            # Return mock coordinates for development
            return self._get_mock_coordinates(location_name)
        
        try:
            params = {
                'address': location_name,
                'key': self.api_key
            }
            
            response = requests.get(self.base_url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if data['status'] == 'OK' and data['results']:
                location = data['results'][0]['geometry']['location']
                return (location['lat'], location['lng'])
            elif data['status'] == 'ZERO_RESULTS':
                print(f"No results found for: {location_name}")
                return None
            else:
                print(f"Google Geocoding API error: {data['status']}")
                return self._get_mock_coordinates(location_name)
            
        except requests.RequestException as e:
            print(f"Google Geocoding API request error: {e}")
            return self._get_mock_coordinates(location_name)
        except Exception as e:
            print(f"Unexpected error in Google geocoding service: {e}")
            return self._get_mock_coordinates(location_name)
    
    def get_location_name(self, lat: float, lon: float) -> Optional[str]:
        """Get location name from coordinates using Google Reverse Geocoding API"""
        if not self.api_key:
            return self._get_mock_location_name(lat, lon)
        
        try:
            params = {
                'latlng': f"{lat},{lon}",
                'key': self.api_key
            }
            
            response = requests.get(self.base_url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if data['status'] == 'OK' and data['results']:
                result = data['results'][0]
                # Get the most specific address component
                formatted_address = result.get('formatted_address', '')
                return formatted_address
            
            return None
            
        except requests.RequestException as e:
            print(f"Google Reverse Geocoding API error: {e}")
            return self._get_mock_location_name(lat, lon)
        except Exception as e:
            print(f"Unexpected error in Google reverse geocoding service: {e}")
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
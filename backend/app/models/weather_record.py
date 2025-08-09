from app import db
from datetime import datetime

class WeatherRecord(db.Model):
    __tablename__ = 'weather_records'
    
    id = db.Column(db.Integer, primary_key=True)
    location_id = db.Column(db.Integer, db.ForeignKey('locations.id'), nullable=False)
    temperature = db.Column(db.Float, nullable=False)  # Temperature in Celsius
    humidity = db.Column(db.Float, nullable=True)     # Humidity percentage
    pressure = db.Column(db.Float, nullable=True)     # Pressure in hPa
    wind_speed = db.Column(db.Float, nullable=True)   # Wind speed in m/s
    wind_direction = db.Column(db.Float, nullable=True)  # Wind direction in degrees
    description = db.Column(db.String(100), nullable=True)  # Weather description
    icon = db.Column(db.String(10), nullable=True)    # Weather icon code
    recorded_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __init__(self, location_id, temperature, humidity=None, pressure=None, 
                 wind_speed=None, wind_direction=None, description=None, icon=None):
        self.location_id = location_id
        self.temperature = temperature
        self.humidity = humidity
        self.pressure = pressure
        self.wind_speed = wind_speed
        self.wind_direction = wind_direction
        self.description = description
        self.icon = icon
    
    def to_dict(self):
        """Convert weather record to dictionary"""
        return {
            'id': self.id,
            'location_id': self.location_id,
            'temperature': self.temperature,
            'humidity': self.humidity,
            'pressure': self.pressure,
            'wind_speed': self.wind_speed,
            'wind_direction': self.wind_direction,
            'description': self.description,
            'icon': self.icon,
            'recorded_at': self.recorded_at.isoformat() if self.recorded_at else None
        }
    
    def temperature_fahrenheit(self):
        """Convert temperature to Fahrenheit"""
        return (self.temperature * 9/5) + 32
    
    def __repr__(self):
        return f'<WeatherRecord {self.temperature}°C at {self.recorded_at}>' 
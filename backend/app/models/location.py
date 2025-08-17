from app import db
from datetime import datetime

class Location(db.Model):
    __tablename__ = 'locations'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    city = db.Column(db.String(100), nullable=False)
    country = db.Column(db.String(100), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    weather_records = db.relationship('WeatherRecord', backref='location', lazy=True, cascade='all, delete-orphan')
    
    def __init__(self, user_id, name, city, country, latitude, longitude, start_date=None, end_date=None, notes=None):
        self.user_id = user_id
        self.name = name
        self.city = city
        self.country = country
        self.latitude = latitude
        self.longitude = longitude
        self.start_date = start_date
        self.end_date = end_date
        self.notes = notes
    
    def to_dict(self):
        """Convert location to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'city': self.city,
            'country': self.country,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'description': self.notes,  # Map notes to description for frontend
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'weather_records_count': len(self.weather_records)
        }
    
    def get_latest_weather(self):
        """Get the most recent weather record for this location"""
        if self.weather_records:
            return max(self.weather_records, key=lambda x: x.recorded_at)
        return None
    
    def __repr__(self):
        return f'<Location {self.name}, {self.city}, {self.country}>' 
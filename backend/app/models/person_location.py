from app import db
from datetime import datetime

class PersonLocation(db.Model):
    __tablename__ = 'person_locations'
    
    id = db.Column(db.Integer, primary_key=True)
    person_id = db.Column(db.Integer, db.ForeignKey('people.id'), nullable=False)
    location_id = db.Column(db.Integer, db.ForeignKey('locations.id'), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=True)  # NULL means ongoing visit
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    location = db.relationship('Location', backref='visitors')
    
    def __init__(self, person_id, location_id, start_date, end_date=None, notes=None):
        self.person_id = person_id
        self.location_id = location_id
        self.start_date = start_date
        self.end_date = end_date
        self.notes = notes
    
    def to_dict(self):
        """Convert person location to dictionary"""
        return {
            'id': self.id,
            'person_id': self.person_id,
            'location_id': self.location_id,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            # Include related data
            'location': self.location.to_dict() if self.location else None,
        }
    
    def __repr__(self):
        return f'<PersonLocation {self.person_id} at {self.location_id}>'

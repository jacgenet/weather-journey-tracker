from app import db
from datetime import datetime

class Person(db.Model):
    __tablename__ = 'people'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    birth_date = db.Column(db.Date, nullable=True)
    home_location = db.Column(db.String(200), nullable=True)  # e.g., "San Francisco, CA"
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='people')
    visits = db.relationship('PersonLocation', backref='person', cascade='all, delete-orphan')
    
    def __init__(self, user_id, first_name, last_name, birth_date=None, home_location=None, notes=None):
        self.user_id = user_id
        self.first_name = first_name
        self.last_name = last_name
        self.birth_date = birth_date
        self.home_location = home_location
        self.notes = notes
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
    
    def to_dict(self):
        """Convert person to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': self.full_name,
            'birth_date': self.birth_date.isoformat() if self.birth_date else None,
            'home_location': self.home_location,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
    
    def __repr__(self):
        return f'<Person {self.full_name}>'

from app import db
from datetime import datetime

class Country(db.Model):
    __tablename__ = 'countries'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    iso_code = db.Column(db.String(3), nullable=False, unique=True)
    iso_code_3 = db.Column(db.String(3), nullable=True)
    phone_code = db.Column(db.String(10), nullable=True)
    currency = db.Column(db.String(10), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    states = db.relationship('State', backref='country', lazy=True)
    cities = db.relationship('City', backref='country', lazy=True)
    
    def __init__(self, name, iso_code, iso_code_3=None, phone_code=None, currency=None):
        self.name = name
        self.iso_code = iso_code
        self.iso_code_3 = iso_code_3
        self.phone_code = phone_code
        self.currency = currency
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'iso_code': self.iso_code,
            'iso_code_3': self.iso_code_3,
            'phone_code': self.phone_code,
            'currency': self.currency,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<Country {self.name} ({self.iso_code})>'

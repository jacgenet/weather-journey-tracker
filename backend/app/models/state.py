from app import db
from datetime import datetime

class State(db.Model):
    __tablename__ = 'states'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    abbreviation = db.Column(db.String(10), nullable=True)
    country_id = db.Column(db.Integer, db.ForeignKey('countries.id'), nullable=False)
    type = db.Column(db.String(20), default='state')  # state, province, region, etc.
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    cities = db.relationship('City', backref='state', lazy=True)
    
    def __init__(self, name, country_id, abbreviation=None, type='state'):
        self.name = name
        self.country_id = country_id
        self.abbreviation = abbreviation
        self.type = type
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'abbreviation': self.abbreviation,
            'country_id': self.country_id,
            'type': self.type,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<State {self.name} ({self.abbreviation})>'

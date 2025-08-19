from app import db
from datetime import datetime
import bcrypt
from flask_jwt_extended import create_access_token, create_refresh_token

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(50), nullable=True)
    last_name = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    locations = db.relationship('Location', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def __init__(self, username, email, password, first_name=None, last_name=None):
        self.username = username
        self.email = email
        self.password_hash = self._hash_password(password)
        self.first_name = first_name
        self.last_name = last_name
    
    def _hash_password(self, password):
        """Hash password using bcrypt"""
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def check_password(self, password):
        """Check if provided password matches the hash"""
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
    
    def generate_tokens(self):
        """Generate access and refresh tokens"""
        print(f"JWT Debug - Creating token for user ID: {self.id}")
        access_token = create_access_token(identity=self.id)
        refresh_token = create_refresh_token(identity=self.id)
        print(f"JWT Debug - Access token created: {access_token[:50]}...")
        
        # Debug: Decode the token to see what's in it
        try:
            import jwt
            decoded = jwt.decode(access_token, options={"verify_signature": False})
            print(f"JWT Debug - Token payload: {decoded}")
        except Exception as e:
            print(f"JWT Debug - Could not decode token: {e}")
        
        return {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': {
                'id': self.id,
                'username': self.username,
                'email': self.email,
                'first_name': self.first_name,
                'last_name': self.last_name
            }
        }
    
    def to_dict(self):
        """Convert user to dictionary"""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<User {self.username}>' 
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from datetime import timedelta
import os
from pathlib import Path
from dotenv import load_dotenv

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()

def create_app(config_name='development'):
    # Load environment variables first
    current_dir = Path(__file__).parent.parent
    env_path = current_dir / '.env'
    load_dotenv(dotenv_path=env_path)
    
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
        'DATABASE_URL', 
        'postgresql://localhost/weather_journey_db'
    )
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Get JWT secret from environment
    jwt_secret_from_env = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key')
    app.config['JWT_SECRET_KEY'] = jwt_secret_from_env
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
    app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)
    
    # Explicit JWT configuration
    app.config['JWT_ALGORITHM'] = 'HS256'
    app.config['JWT_DECODE_ALGORITHMS'] = ['HS256']
    app.config['JWT_TOKEN_LOCATION'] = ['headers']
    app.config['JWT_HEADER_NAME'] = 'Authorization'
    app.config['JWT_HEADER_TYPE'] = 'Bearer'
    
    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    
    # Explicitly configure JWT with the app config
    jwt.secret_key = app.config['JWT_SECRET_KEY']
    
    # Log JWT configuration
    print(f"JWT Debug - SECRET_KEY: {app.config['SECRET_KEY'][:10]}...")
    print(f"JWT Debug - JWT_SECRET_KEY: {app.config['JWT_SECRET_KEY']}")
    print(f"JWT Debug - JWT_ACCESS_TOKEN_EXPIRES: {app.config['JWT_ACCESS_TOKEN_EXPIRES']}")
    print(f"JWT Debug - JWT Manager secret_key: {jwt.secret_key}")
    
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    # Register blueprints
    from .routes.auth import auth_bp
    from .routes.locations import locations_bp
    from .routes.weather import weather_bp
    from .routes.geocoding import geocoding_bp
    from .routes.people import people_bp
    from .routes.location_data import bp as location_data_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(locations_bp, url_prefix='/api/locations')
    app.register_blueprint(weather_bp, url_prefix='/api/weather')
    app.register_blueprint(geocoding_bp, url_prefix='/api')
    app.register_blueprint(people_bp, url_prefix='/api')
    app.register_blueprint(location_data_bp)
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return {'error': 'Not found'}, 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return {'error': 'Internal server error'}, 500
    
    return app 
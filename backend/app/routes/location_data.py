from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.country import Country
from app.models.state import State
from app.models.city import City
from app import db

bp = Blueprint('location_data', __name__, url_prefix='/api/location-data')

@bp.route('/countries', methods=['GET'])
@jwt_required()
def get_countries():
    """Get all countries"""
    try:
        countries = Country.query.order_by(Country.name).all()
        return jsonify([country.to_dict() for country in countries]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/states/<int:country_id>', methods=['GET'])
@jwt_required()
def get_states_by_country(country_id):
    """Get states for a specific country"""
    try:
        states = State.query.filter_by(country_id=country_id).order_by(State.name).all()
        return jsonify([state.to_dict() for state in states]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/cities/<int:country_id>', methods=['GET'])
@jwt_required()
def get_cities_by_country(country_id):
    """Get cities for a specific country"""
    try:
        cities = City.query.filter_by(country_id=country_id).order_by(City.name).all()
        return jsonify([city.to_dict() for city in cities]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/cities/<int:country_id>/<int:state_id>', methods=['GET'])
@jwt_required()
def get_cities_by_state(country_id, state_id):
    """Get cities for a specific state"""
    try:
        cities = City.query.filter_by(country_id=country_id, state_id=state_id).order_by(City.name).all()
        return jsonify([city.to_dict() for city in cities]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/search/cities', methods=['GET'])
@jwt_required()
def search_cities():
    """Search cities by name"""
    try:
        query = request.args.get('q', '').strip()
        if not query:
            return jsonify([]), 200
        
        cities = City.query.filter(City.name.ilike(f'%{query}%')).limit(10).all()
        return jsonify([city.to_dict() for city in cities]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.location import Location
from app.services.geocoding import get_coordinates
from datetime import datetime
import re

locations_bp = Blueprint('locations', __name__)

@locations_bp.route('/', methods=['GET'])
@jwt_required()
def get_locations():
    """Get all locations for the current user"""
    current_user_id = get_jwt_identity()
    
    try:
        locations = Location.query.filter_by(user_id=current_user_id).order_by(Location.visit_date.desc()).all()
        
        return jsonify({
            'locations': [location.to_dict() for location in locations]
        }), 200
    except Exception as e:
        return jsonify({'error': 'Failed to fetch locations'}), 500

@locations_bp.route('/<int:location_id>', methods=['GET'])
@jwt_required()
def get_location(location_id):
    """Get a specific location"""
    current_user_id = get_jwt_identity()
    
    try:
        location = Location.query.filter_by(id=location_id, user_id=current_user_id).first()
        
        if not location:
            return jsonify({'error': 'Location not found'}), 404
        
        return jsonify(location.to_dict()), 200
    except Exception as e:
        return jsonify({'error': 'Failed to fetch location'}), 500

@locations_bp.route('/', methods=['POST'])
@jwt_required()
def create_location():
    """Create a new location"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['name', 'city', 'country', 'visit_date']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400
    
    # Validate date format
    try:
        visit_date = datetime.strptime(data['visit_date'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    # Validate coordinates or get them from geocoding
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    
    if not latitude or not longitude:
        # Try to get coordinates from geocoding service
        try:
            coords = get_coordinates(f"{data['city']}, {data['country']}")
            if coords:
                latitude, longitude = coords
            else:
                return jsonify({'error': 'Could not determine coordinates for this location'}), 400
        except Exception as e:
            return jsonify({'error': 'Could not determine coordinates for this location'}), 400
    
    try:
        location = Location(
            user_id=current_user_id,
            name=data['name'],
            city=data['city'],
            country=data['country'],
            latitude=latitude,
            longitude=longitude,
            visit_date=visit_date,
            notes=data.get('notes')
        )
        
        db.session.add(location)
        db.session.commit()
        
        return jsonify({
            'message': 'Location created successfully',
            'location': location.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to create location'}), 500

@locations_bp.route('/<int:location_id>', methods=['PUT'])
@jwt_required()
def update_location(location_id):
    """Update a location"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    try:
        location = Location.query.filter_by(id=location_id, user_id=current_user_id).first()
        
        if not location:
            return jsonify({'error': 'Location not found'}), 404
        
        # Update fields
        if 'name' in data:
            location.name = data['name']
        if 'city' in data:
            location.city = data['city']
        if 'country' in data:
            location.country = data['country']
        if 'visit_date' in data:
            try:
                visit_date = datetime.strptime(data['visit_date'], '%Y-%m-%d').date()
                location.visit_date = visit_date
            except ValueError:
                return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
        if 'notes' in data:
            location.notes = data['notes']
        
        # Update coordinates if provided or if city/country changed
        if 'latitude' in data and 'longitude' in data:
            location.latitude = data['latitude']
            location.longitude = data['longitude']
        elif 'city' in data or 'country' in data:
            # Try to get updated coordinates
            try:
                coords = get_coordinates(f"{location.city}, {location.country}")
                if coords:
                    location.latitude, location.longitude = coords
            except Exception:
                pass  # Keep existing coordinates if geocoding fails
        
        db.session.commit()
        
        return jsonify({
            'message': 'Location updated successfully',
            'location': location.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update location'}), 500

@locations_bp.route('/<int:location_id>', methods=['DELETE'])
@jwt_required()
def delete_location(location_id):
    """Delete a location"""
    current_user_id = get_jwt_identity()
    
    try:
        location = Location.query.filter_by(id=location_id, user_id=current_user_id).first()
        
        if not location:
            return jsonify({'error': 'Location not found'}), 404
        
        db.session.delete(location)
        db.session.commit()
        
        return jsonify({'message': 'Location deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to delete location'}), 500

@locations_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_location_stats():
    """Get statistics about user's locations"""
    current_user_id = get_jwt_identity()
    
    try:
        locations = Location.query.filter_by(user_id=current_user_id).all()
        
        if not locations:
            return jsonify({
                'total_locations': 0,
                'countries_visited': 0,
                'cities_visited': 0,
                'date_range': None
            }), 200
        
        # Calculate statistics
        countries = set(loc.country for loc in locations)
        cities = set(f"{loc.city}, {loc.country}" for loc in locations)
        visit_dates = [loc.visit_date for loc in locations]
        
        stats = {
            'total_locations': len(locations),
            'countries_visited': len(countries),
            'cities_visited': len(cities),
            'date_range': {
                'earliest': min(visit_dates).isoformat(),
                'latest': max(visit_dates).isoformat()
            } if visit_dates else None
        }
        
        return jsonify(stats), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to fetch location statistics'}), 500 
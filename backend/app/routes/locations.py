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
    print("JWT Debug - About to validate JWT token")
    try:
        print("JWT Debug - JWT validation passed!")
        current_user_id = get_jwt_identity()
        print("JWT Debug - User ID:", current_user_id)
        print("JWT Debug - Token type:", type(current_user_id))
        
        # Get locations for the current user
        locations = Location.query.filter_by(user_id=current_user_id).order_by(Location.start_date.desc(), Location.created_at.desc()).all()
        print("JWT Debug - Found", len(locations), "locations")
        
        return {
            'locations': [location.to_dict() for location in locations]
        }
    except Exception as e:
        print("JWT Debug - Exception in get_locations:", e)
        print("JWT Debug - Exception type:", type(e))
        return {'error': str(e)}, 500

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
    print("JWT Debug - About to validate JWT token in create_location")
    try:
        print("JWT Debug - JWT validation passed in create_location!")
        current_user_id = get_jwt_identity()
        print("JWT Debug - Creating location for user ID:", current_user_id)
        
        data = request.get_json()
        print("JWT Debug - Received data:", data)
        
        # Validate required fields
        required_fields = ['name', 'city', 'country']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Get address if provided
        address = data.get('address')
        
        # Validate date formats if provided
        start_date = None
        end_date = None
        
        if data.get('start_date'):
            try:
                start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'error': 'Invalid start_date format. Use YYYY-MM-DD'}), 400
        
        if data.get('end_date'):
            try:
                end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'error': 'Invalid end_date format. Use YYYY-MM-DD'}), 400
        
        # Validate that end_date is not before start_date
        if start_date and end_date and end_date < start_date:
            return jsonify({'error': 'End date cannot be before start date'}), 400
        
        # Validate coordinates or get them from geocoding
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        
        if not latitude or not longitude:
            # Try to get coordinates from geocoding service
            try:
                # Use address if provided, otherwise use city + country
                geocode_query = address if address else f"{data['city']}, {data['country']}"
                coords = get_coordinates(geocode_query)
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
                address=address,
                city=data['city'],
                country=data['country'],
                latitude=latitude,
                longitude=longitude,
                start_date=start_date,
                end_date=end_date,
                notes=data.get('description') or data.get('notes')  # Accept both description and notes
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
            
    except Exception as e:
        print("JWT Debug - Exception in create_location:", e)
        print("JWT Debug - Exception type:", type(e))
        return jsonify({'error': str(e)}), 500

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
        if 'address' in data:
            location.address = data['address']
        if 'city' in data:
            location.city = data['city']
        if 'country' in data:
            location.country = data['country']
        if 'start_date' in data:
            if data['start_date']:
                try:
                    start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
                    location.start_date = start_date
                except ValueError:
                    return jsonify({'error': 'Invalid start_date format. Use YYYY-MM-DD'}), 400
            else:
                location.start_date = None
        if 'end_date' in data:
            if data['end_date']:
                try:
                    end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
                    location.end_date = end_date
                except ValueError:
                    return jsonify({'error': 'Invalid end_date format. Use YYYY-MM-DD'}), 400
            else:
                location.end_date = None
        if 'description' in data or 'notes' in data:
            # Accept both description and notes fields
            location.notes = data.get('description') or data.get('notes')
        
        # Validate that end_date is not before start_date
        if location.start_date and location.end_date and location.end_date < location.start_date:
            return jsonify({'error': 'End date cannot be before start date'}), 400
        
        # Update coordinates if provided or if address/city/country changed
        if 'latitude' in data and 'longitude' in data:
            location.latitude = data['latitude']
            location.longitude = data['longitude']
        elif 'address' in data or 'city' in data or 'country' in data:
            # Try to get updated coordinates
            try:
                # Use address if provided, otherwise use city + country
                geocode_query = location.address if location.address else f"{location.city}, {location.country}"
                coords = get_coordinates(geocode_query)
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
        
        # Get all valid dates for statistics
        all_dates = []
        for loc in locations:
            if loc.start_date:
                all_dates.append(loc.start_date)
            if loc.end_date:
                all_dates.append(loc.end_date)
        
        stats = {
            'total_locations': len(locations),
            'countries_visited': len(countries),
            'cities_visited': len(cities),
            'date_range': {
                'earliest': min(all_dates).isoformat(),
                'latest': max(all_dates).isoformat()
            } if all_dates else None
        }
        
        return jsonify(stats), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to fetch location statistics'}), 500 
from flask import Blueprint, request, jsonify
from app.services.geocoding import get_coordinates

geocoding_bp = Blueprint('geocoding', __name__)

@geocoding_bp.route('/geocode', methods=['GET'])
def geocode_location():
    """Get coordinates for a location query"""
    query = request.args.get('query')
    
    if not query:
        return jsonify({'error': 'Query parameter is required'}), 400
    
    try:
        coords = get_coordinates(query)
        
        if coords:
            latitude, longitude = coords
            return jsonify({
                'latitude': latitude,
                'longitude': longitude,
                'query': query
            })
        else:
            return jsonify({'error': 'Location not found'}), 404
            
    except Exception as e:
        print(f"Geocoding error: {e}")
        return jsonify({'error': 'Failed to geocode location'}), 500

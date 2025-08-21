from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.location import Location
from app.models.weather_record import WeatherRecord
from app.services.weather_service import get_weather_data, get_weather_history
from datetime import datetime, timedelta
import statistics

weather_bp = Blueprint('weather', __name__)

@weather_bp.route('/<int:location_id>', methods=['GET'])
@jwt_required()
def get_location_weather(location_id):
    """Get current weather for a specific location"""
    current_user_id = get_jwt_identity()
    
    try:
        location = Location.query.filter_by(id=location_id, user_id=current_user_id).first()
        
        if not location:
            return jsonify({'error': 'Location not found'}), 404
        
        # Get current weather data
        weather_data = get_weather_data(location.latitude, location.longitude)
        
        if not weather_data:
            return jsonify({'error': 'Could not fetch weather data'}), 500
        
        # Save weather record to database
        weather_record = WeatherRecord(
            location_id=location.id,
            temperature=weather_data['temperature'],
            humidity=weather_data.get('humidity'),
            pressure=weather_data.get('pressure'),
            wind_speed=weather_data.get('wind_speed'),
            wind_direction=weather_data.get('wind_direction'),
            description=weather_data.get('description'),
            icon=weather_data.get('icon')
        )
        
        db.session.add(weather_record)
        db.session.commit()
        
        return jsonify({
            'location': location.to_dict(),
            'weather': weather_record.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to fetch weather data'}), 500

@weather_bp.route('/history/<int:location_id>', methods=['GET'])
@jwt_required()
def get_weather_history(location_id):
    """Get weather history for a specific location"""
    current_user_id = get_jwt_identity()
    
    try:
        location = Location.query.filter_by(id=location_id, user_id=current_user_id).first()
        
        if not location:
            return jsonify({'error': 'Location not found'}), 404
        
        # Get weather records from database
        weather_records = WeatherRecord.query.filter_by(location_id=location_id).order_by(WeatherRecord.recorded_at.desc()).all()
        
        return jsonify({
            'location': location.to_dict(),
            'weather_history': [record.to_dict() for record in weather_records]
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to fetch weather history'}), 500

@weather_bp.route('/stats/<int:location_id>', methods=['GET'])
@jwt_required()
def get_weather_stats(location_id):
    """Get weather statistics for a specific location"""
    current_user_id = get_jwt_identity()
    
    try:
        location = Location.query.filter_by(id=location_id, user_id=current_user_id).first()
        
        if not location:
            return jsonify({'error': 'Location not found'}), 404
        
        # Get weather records
        weather_records = WeatherRecord.query.filter_by(location_id=location_id).all()
        
        if not weather_records:
            return jsonify({
                'location': location.to_dict(),
                'stats': {
                    'total_records': 0,
                    'average_temperature': None,
                    'temperature_range': None,
                    'most_common_conditions': []
                }
            }), 200
        
        # Calculate statistics
        temperatures = [record.temperature for record in weather_records]
        descriptions = [record.description for record in weather_records if record.description]
        
        stats = {
            'total_records': len(weather_records),
            'average_temperature': round(statistics.mean(temperatures), 1),
            'temperature_range': {
                'min': round(min(temperatures), 1),
                'max': round(max(temperatures), 1)
            },
            'most_common_conditions': []
        }
        
        # Find most common weather conditions
        if descriptions:
            from collections import Counter
            condition_counts = Counter(descriptions)
            stats['most_common_conditions'] = condition_counts.most_common(3)
        
        return jsonify({
            'location': location.to_dict(),
            'stats': stats
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to fetch weather statistics'}), 500

@weather_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def get_weather_dashboard():
    """Get weather dashboard data for all user locations"""
    current_user_id = get_jwt_identity()
    
    try:
        # Get all user locations
        locations = Location.query.filter_by(user_id=current_user_id).all()
        
        if not locations:
            return jsonify({
                'total_locations': 0,
                'average_temperature': None,
                'recent_weather': [],
                'temperature_trends': []
            }), 200
        
        # Get recent weather records for all locations
        recent_weather = []
        all_temperatures = []
        
        for location in locations:
            latest_weather = WeatherRecord.query.filter_by(location_id=location.id).order_by(WeatherRecord.recorded_at.desc()).first()
            
            if latest_weather:
                recent_weather.append({
                    'location': location.to_dict(),
                    'weather': latest_weather.to_dict()
                })
                all_temperatures.append(latest_weather.temperature)
        
        # Calculate overall statistics
        dashboard_data = {
            'total_locations': len(locations),
            'average_temperature': round(statistics.mean(all_temperatures), 1) if all_temperatures else None,
            'recent_weather': recent_weather,
            'temperature_trends': []
        }
        
        # Calculate temperature trends (last 7 days)
        week_ago = datetime.utcnow() - timedelta(days=7)
        recent_records = WeatherRecord.query.filter(
            WeatherRecord.location_id.in_([loc.id for loc in locations]),
            WeatherRecord.recorded_at >= week_ago
        ).order_by(WeatherRecord.recorded_at).all()
        
        if recent_records:
            # Group by date and calculate daily averages
            from collections import defaultdict
            daily_temps = defaultdict(list)
            
            for record in recent_records:
                date_key = record.recorded_at.date().isoformat()
                daily_temps[date_key].append(record.temperature)
            
            dashboard_data['temperature_trends'] = [
                {
                    'date': date,
                    'average_temp': round(statistics.mean(temps), 1)
                }
                for date, temps in sorted(daily_temps.items())
            ]
        
        return jsonify(dashboard_data), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to fetch dashboard data'}), 500

@weather_bp.route('/refresh/<int:location_id>', methods=['POST'])
@jwt_required()
def refresh_weather_data(location_id):
    """Manually refresh weather data for a location"""
    current_user_id = get_jwt_identity()
    
    try:
        location = Location.query.filter_by(id=location_id, user_id=current_user_id).first()
        
        if not location:
            return jsonify({'error': 'Location not found'}), 404
        
        # Get fresh weather data
        weather_data = get_weather_data(location.latitude, location.longitude)
        
        if not weather_data:
            return jsonify({'error': 'Could not fetch weather data'}), 500
        
        # Save new weather record
        weather_record = WeatherRecord(
            location_id=location.id,
            temperature=weather_data['temperature'],
            humidity=weather_data.get('humidity'),
            pressure=weather_data.get('pressure'),
            wind_speed=weather_data.get('wind_speed'),
            wind_direction=weather_data.get('wind_direction'),
            description=weather_data.get('description'),
            icon=weather_data.get('icon')
        )
        
        db.session.add(weather_record)
        db.session.commit()
        
        return jsonify({
            'message': 'Weather data refreshed successfully',
            'weather': weather_record.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to refresh weather data'}), 500 

@weather_bp.route('/period-stats/<int:location_id>', methods=['GET'])
@jwt_required()
def get_weather_period_stats(location_id):
    """Get weather statistics for a specific time period at a location"""
    current_user_id = get_jwt_identity()
    
    try:
        # Get query parameters for date range
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        
        if not start_date_str or not end_date_str:
            return jsonify({'error': 'start_date and end_date parameters are required'}), 400
        
        # Parse dates
        try:
            start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
            end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use ISO format (YYYY-MM-DDTHH:MM:SS)'}), 400
        
        # Verify location belongs to user
        location = Location.query.filter_by(id=location_id, user_id=current_user_id).first()
        if not location:
            return jsonify({'error': 'Location not found'}), 404
        
        # Get weather records for the specified period
        weather_records = WeatherRecord.query.filter(
            WeatherRecord.location_id == location_id,
            WeatherRecord.recorded_at >= start_date,
            WeatherRecord.recorded_at <= end_date
        ).all()
        
        if not weather_records:
            return jsonify({
                'location': location.to_dict(),
                'period_stats': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                    'total_records': 0,
                    'average_temperature': None,
                    'highest_temperature': None,
                    'lowest_temperature': None,
                    'temperature_range': None,
                    'most_common_conditions': []
                }
            }), 200
        
        # Calculate statistics for the period
        temperatures = [record.temperature for record in weather_records]
        descriptions = [record.description for record in weather_records if record.description]
        
        period_stats = {
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'total_records': len(weather_records),
            'average_temperature': round(statistics.mean(temperatures), 1),
            'highest_temperature': round(max(temperatures), 1),
            'lowest_temperature': round(min(temperatures), 1),
            'temperature_range': {
                'min': round(min(temperatures), 1),
                'max': round(max(temperatures), 1)
            },
            'most_common_conditions': []
        }
        
        # Find most common weather conditions
        if descriptions:
            from collections import Counter
            condition_counts = Counter(descriptions)
            period_stats['most_common_conditions'] = condition_counts.most_common(3)
        
        return jsonify({
            'location': location.to_dict(),
            'period_stats': period_stats
        }), 200
        
    except Exception as e:
        print(f"Error in get_weather_period_stats: {e}")
        return jsonify({'error': 'Failed to fetch period weather statistics'}), 500 
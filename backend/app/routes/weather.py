from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.location import Location
from app.models.weather_record import WeatherRecord
from app.services.weather_service import get_weather_data, get_weather_history, upload_historical_weather_data, upload_multi_location_historical_data
from datetime import datetime, timedelta
import statistics
import json
import os

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
    """
    Get weather statistics for a specific time period at a location
    
    ⚠️ IMPORTANT: This endpoint reads from WeatherRecord table.
    Historical weather data (2022-2024) is valuable and should be preserved.
    Do NOT delete weather records without creating a backup first!
    """
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
        
        # If no database records, try to fetch historical weather data
        if not weather_records:
            print(f"🌤️ No database records found for {start_date.date()} to {end_date.date()}, fetching historical data...")
            
            try:
                from app.services.weather_service import get_historical_weather_data
                historical_weather = get_historical_weather_data(
                    location.latitude, 
                    location.longitude, 
                    start_date, 
                    end_date
                )
                
                if historical_weather:
                    print(f"✅ Fetched {len(historical_weather)} historical weather records")
                    # Convert historical data to the format we need
                    temperatures = [record['temperature'] for record in historical_weather]
                    descriptions = [record['description'] for record in historical_weather if record['description']]
                    
                    # Calculate data coverage
                    total_days = (end_date - start_date).days + 1
                    days_with_data = len(historical_weather)
                    coverage_percentage = (days_with_data / total_days) * 100 if total_days > 0 else 0
                    
                    # Determine data coverage quality
                    # Mock data should never be marked as "complete" or "verified"
                    # Check if this is mock data by looking at the source
                    is_mock_data = not os.environ.get('OPENWEATHER_API_KEY')  # No API key = mock data
                    
                    if is_mock_data:
                        data_coverage = 'partial'  # Mock data is always partial
                    elif coverage_percentage >= 80:
                        data_coverage = 'complete'  # Real data can be complete
                    elif coverage_percentage >= 50:
                        data_coverage = 'partial'
                    else:
                        data_coverage = 'partial'
                    
                    return jsonify({
                        'location': location.to_dict(),
                        'period_stats': {
                            'start_date': start_date.isoformat(),
                            'end_date': end_date.isoformat(),
                            'total_records': len(historical_weather),
                            'average_temperature': round(statistics.mean(temperatures), 1),
                            'highest_temperature': round(max(temperatures), 1),
                            'lowest_temperature': round(min(temperatures), 1),
                            'temperature_range': {
                                'min': round(min(temperatures), 1),
                                'max': round(max(temperatures), 1)
                            },
                            'most_common_conditions': [],
                            'data_exists': True,
                            'data_coverage': data_coverage,
                            'days_with_data': days_with_data,
                            'total_days': total_days,
                            'coverage_percentage': round(coverage_percentage, 1)
                        }
                    }), 200
                else:
                    print("❌ Failed to fetch historical weather data")
            except Exception as e:
                print(f"❌ Error fetching historical weather: {e}")
        
        # If still no data, return fallback
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
                    'most_common_conditions': [],
                    'data_exists': False,
                    'data_coverage': 'fallback'
                }
            }), 200
        
        # Calculate statistics for the period
        temperatures = [record.temperature_fahrenheit() for record in weather_records]
        descriptions = [record.description for record in weather_records if record.description]
        
        # Debug: Log the temperature conversion
        print(f"🌡️ DEBUG: Raw Celsius temperatures: {[record.temperature for record in weather_records[:5]]}")
        print(f"🌡️ DEBUG: Converted Fahrenheit temperatures: {temperatures[:5]}")
        print(f"🌡️ DEBUG: Temperature count: {len(temperatures)}")
        print(f"🌡️ DEBUG: Min temp: {min(temperatures) if temperatures else 'None'}")
        print(f"🌡️ DEBUG: Max temp: {max(temperatures) if temperatures else 'None'}")
        print(f"🌡️ DEBUG: Avg temp: {statistics.mean(temperatures) if temperatures else 'None'}")
        
        # Calculate data coverage percentage
        total_days = (end_date - start_date).days + 1
        days_with_data = len(set(record.recorded_at.date() for record in weather_records))
        coverage_percentage = (days_with_data / total_days) * 100 if total_days > 0 else 0
        
        # Determine data existence state
        data_exists = len(weather_records) > 0
        if coverage_percentage >= 80:
            data_coverage = 'complete'
        elif coverage_percentage >= 50:
            data_coverage = 'partial'
        else:
            data_coverage = 'fallback'
        
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
            'most_common_conditions': [],
            'data_exists': data_exists,
            'data_coverage': data_coverage,
            'days_with_data': days_with_data,
            'total_days': total_days,
            'coverage_percentage': round(coverage_percentage, 1)
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

@weather_bp.route('/upload-historical/<int:location_id>', methods=['POST'])
@jwt_required()
def upload_historical_weather(location_id):
    """Upload historical weather data from JSON file for a specific location"""
    current_user_id = get_jwt_identity()
    
    try:
        # Verify location exists and belongs to user
        location = Location.query.filter_by(id=location_id, user_id=current_user_id).first()
        
        if not location:
            return jsonify({'error': 'Location not found'}), 404
        
        # Get JSON data from request
        if not request.is_json:
            return jsonify({'error': 'Request must contain JSON data'}), 400
        
        json_data = request.get_json()
        
        if not json_data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        # Convert JSON data to string for processing
        json_string = json.dumps(json_data)
        
        # Upload and store historical weather data
        result = upload_historical_weather_data(location_id, json_string)
        
        if result['success']:
            return jsonify({
                'message': 'Historical weather data uploaded successfully',
                'location': location.to_dict(),
                'upload_stats': {
                    'total_records': result['total_records'],
                    'stored_records': result['stored_records'],
                    'skipped_records': result['skipped_records'],
                    'errors_count': len(result['errors'])
                }
            }), 200
        else:
            return jsonify({
                'error': 'Failed to upload historical weather data',
                'details': result['error']
            }), 400
            
    except Exception as e:
        print(f"Error in upload_historical_weather: {e}")
        return jsonify({'error': 'Failed to upload historical weather data'}), 500 

@weather_bp.route('/upload-multi-location-historical', methods=['POST'])
@jwt_required()
def upload_multi_location_historical_weather():
    """Upload historical weather data from JSON file for multiple locations"""
    current_user_id = get_jwt_identity()
    
    try:
        # Get JSON data from request
        if not request.is_json:
            return jsonify({'error': 'Request must contain JSON data'}), 400
        
        json_data = request.get_json()
        
        if not json_data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        # Convert JSON data to string for processing
        json_string = json.dumps(json_data)
        
        # Upload and store historical weather data for multiple locations
        result = upload_multi_location_historical_data(current_user_id, json_string)
        
        if result['success']:
            return jsonify({
                'message': 'Historical weather data uploaded successfully for multiple locations',
                'upload_stats': {
                    'total_records': result['total_records'],
                    'stored_records': result['stored_records'],
                    'skipped_records': result['skipped_records'],
                    'locations_processed': result['locations_processed'],
                    'errors_count': len(result['errors'])
                }
            }), 200
        else:
            return jsonify({
                'error': 'Failed to upload historical weather data',
                'details': result['error']
            }), 400
            
    except Exception as e:
        print(f"Error in upload_multi_location_historical_weather: {e}")
        return jsonify({'error': 'Failed to upload historical weather data'}), 500
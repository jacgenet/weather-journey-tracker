#!/usr/bin/env python3
"""
Weather Data Backup Script

This script creates a backup of all weather records in the database.
Run this before making any changes that might affect weather data.

Usage:
    python3 backup_weather_data.py

The backup will be saved as: weather_data_backup_YYYY-MM-DD_HH-MM-SS.json
"""

import sys
import os
import json
from datetime import datetime

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models.weather_record import WeatherRecord
from app.models.location import Location

def backup_weather_data():
    """Create a backup of all weather records"""
    app = create_app()
    
    with app.app_context():
        try:
            # Get all weather records
            weather_records = WeatherRecord.query.all()
            print(f"Found {len(weather_records)} weather records to backup")
            
            if len(weather_records) == 0:
                print("No weather records found to backup")
                return
            
            # Create backup data structure
            backup_data = {
                "backup_info": {
                    "created_at": datetime.utcnow().isoformat(),
                    "total_records": len(weather_records),
                    "description": "Full weather data backup"
                },
                "weather_records": []
            }
            
            # Convert records to dictionary format
            for record in weather_records:
                record_data = {
                    "id": record.id,
                    "location_id": record.location_id,
                    "temperature": record.temperature,
                    "humidity": record.humidity,
                    "pressure": record.pressure,
                    "wind_speed": record.wind_speed,
                    "wind_direction": record.wind_direction,
                    "description": record.description,
                    "icon": record.icon,
                    "recorded_at": record.recorded_at.isoformat() if record.recorded_at else None
                }
                backup_data["weather_records"].append(record_data)
            
            # Create filename with timestamp
            timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
            filename = f"weather_data_backup_{timestamp}.json"
            
            # Save backup file
            with open(filename, 'w') as f:
                json.dump(backup_data, f, indent=2)
            
            print(f"✅ Backup created successfully: {filename}")
            print(f"📊 Total records backed up: {len(weather_records)}")
            
            # Show date range
            dates = [record.recorded_at.date() for record in weather_records if record.recorded_at]
            if dates:
                print(f"📅 Date range: {min(dates)} to {max(dates)}")
            
            return filename
            
        except Exception as e:
            print(f"❌ Error creating backup: {e}")
            return None

def restore_weather_data(backup_filename):
    """Restore weather data from backup file"""
    app = create_app()
    
    with app.app_context():
        try:
            # Read backup file
            with open(backup_filename, 'r') as f:
                backup_data = json.load(f)
            
            print(f"📖 Reading backup: {backup_filename}")
            print(f"📊 Records to restore: {backup_data['backup_info']['total_records']}")
            
            # Clear existing weather records
            print("🗑️ Clearing existing weather records...")
            WeatherRecord.query.delete()
            db.session.commit()
            
            # Restore records
            restored_count = 0
            for record_data in backup_data["weather_records"]:
                # Parse dates
                recorded_at = None
                if record_data.get("recorded_at"):
                    recorded_at = datetime.fromisoformat(record_data["recorded_at"].replace('Z', '+00:00'))
                
                # Create new record
                record = WeatherRecord(
                    location_id=record_data["location_id"],
                    temperature=record_data["temperature"],
                    humidity=record_data.get("humidity"),
                    pressure=record_data.get("pressure"),
                    wind_speed=record_data.get("wind_speed"),
                    wind_direction=record_data.get("wind_direction"),
                    description=record_data.get("description"),
                    icon=record_data.get("icon")
                )
                
                # Set recorded_at if available
                if recorded_at:
                    record.recorded_at = recorded_at
                
                db.session.add(record)
                restored_count += 1
            
            db.session.commit()
            print(f"✅ Successfully restored {restored_count} weather records")
            
        except Exception as e:
            print(f"❌ Error restoring backup: {e}")
            db.session.rollback()

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "restore":
        if len(sys.argv) > 2:
            restore_weather_data(sys.argv[2])
        else:
            print("Usage: python3 backup_weather_data.py restore <backup_filename>")
    else:
        backup_weather_data()

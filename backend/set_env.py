#!/usr/bin/env python3
"""
Script to set environment variables for Alembic database operations.
This can be used when running Alembic commands outside of the Flask app context.
"""

import os
import sys

def set_environment():
    """Set environment variables for database operations"""
    env_vars = {
        'DATABASE_URL': 'postgresql://jacquelinewallace:1719Zadie@localhost:5432/weather_journey_db',
        'SECRET_KEY': '67e8db98d3fe2a1178602e4469ecedf6dfd12fafc5a4cdef',
        'JWT_SECRET_KEY': 'your-jwt-secret-key-change-this',
        'OPENWEATHER_API_KEY': 'f029ca54ca9e5b1d1dbf3de67833aecb',
        'GEOCODING_API_KEY': 'AIzaSyAC7Lxy4ChFbsxsBUsCa2QA3QikQ64ygHc'
    }
    
    for key, value in env_vars.items():
        os.environ[key] = value
        print(f"Set {key}: {value}")
    
    print("\nEnvironment variables set successfully!")
    print("You can now run Alembic commands.")

if __name__ == '__main__':
    set_environment()

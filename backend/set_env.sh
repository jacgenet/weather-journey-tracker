#!/bin/bash

# Set environment variables for Alembic database operations
export DATABASE_URL="postgresql://jacquelinewallace:1719Zadie@localhost:5432/weather_journey_db"
export SECRET_KEY="67e8db98d3fe2a1178602e4469ecedf6dfd12fafc5a4cdef"
export JWT_SECRET_KEY="your-jwt-secret-key-change-this"
export OPENWEATHER_API_KEY="f029ca54ca9e5b1d1dbf3de67833aecb"
export GEOCODING_API_KEY="AIzaSyAC7Lxy4ChFbsxsBUsCa2QA3QikQ64ygHc"

echo "Environment variables set for database operations:"
echo "DATABASE_URL: $DATABASE_URL"
echo "SECRET_KEY: $SECRET_KEY"
echo "JWT_SECRET_KEY: $JWT_SECRET_KEY"
echo "OPENWEATHER_API_KEY: $OPENWEATHER_API_KEY"
echo "GEOCODING_API_KEY: $GEOCODING_API_KEY"
echo ""
echo "You can now run Alembic commands like:"
echo "source set_env.sh && alembic upgrade head"
echo "source set_env.sh && alembic revision --autogenerate -m 'description'"

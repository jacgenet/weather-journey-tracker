# Alembic Database Migration Setup

This document explains how to set up and use Alembic for database migrations with your PostgreSQL database.

## Database Connection

The Alembic configuration has been updated to handle database connections in multiple ways:

1. **Environment Variables** (Recommended)
2. **Flask App Context** (When running within Flask)
3. **Fallback Configuration** (Hardcoded defaults)

## Setting Up Environment Variables

### Option 1: Shell Script (Unix/Mac)
```bash
# Navigate to the backend directory
cd backend

# Source the environment variables
source set_env.sh

# Now you can run Alembic commands
alembic upgrade head
alembic revision --autogenerate -m "description"
```

### Option 2: Python Script
```bash
# Navigate to the backend directory
cd backend

# Run the Python script to set environment variables
python set_env.py

# In a new terminal, the environment variables will be available
alembic upgrade head
```

### Option 3: Manual Export (Unix/Mac)
```bash
export DATABASE_URL="postgresql://jacquelinewallace:1719Zadie@localhost:5432/weather_journey_db"
export SECRET_KEY="67e8db98d3fe2a1178602e4469ecedf6dfd12fafc5a4cdef"
export JWT_SECRET_KEY="your-jwt-secret-key-change-this"
export OPENWEATHER_API_KEY="f029ca54ca9e5b1d1dbf3de67833aecb"
export GEOCODING_API_KEY="AIzaSyAC7Lxy4ChFbsxsBUsCa2QA3QikQ64ygHc"
```

### Option 4: Windows Command Prompt
```cmd
set DATABASE_URL=postgresql://jacquelinewallace:1719Zadie@localhost:5432/weather_journey_db
set SECRET_KEY=67e8db98d3fe2a1178602e4469ecedf6dfd12fafc5a4cdef
set JWT_SECRET_KEY=your-jwt-secret-key-change-this
set OPENWEATHER_API_KEY=f029ca54ca9e5b1d1dbf3de67833aecb
set GEOCODING_API_KEY=AIzaSyAC7Lxy4ChFbsxsBUsCa2QA3QikQ64ygHc
```

## Running Alembic Commands

### Initialize Database (First Time)
```bash
# Create initial migration
alembic revision --autogenerate -m "Initial migration"

# Apply the migration
alembic upgrade head
```

### Create New Migration
```bash
# Generate migration for model changes
alembic revision --autogenerate -m "Add new field to User model"

# Apply the migration
alembic upgrade head
```

### View Migration History
```bash
# Show current migration
alembic current

# Show migration history
alembic history

# Show migration history with details
alembic history --verbose
```

### Rollback Migrations
```bash
# Rollback one migration
alembic downgrade -1

# Rollback to specific migration
alembic downgrade <revision_id>

# Rollback all migrations
alembic downgrade base
```

## Troubleshooting

### Common Issues

1. **"No database URL found" error**
   - Make sure environment variables are set
   - Check that PostgreSQL is running
   - Verify database credentials

2. **"Could not get metadata" error**
   - Ensure models are properly imported
   - Check that the Flask app can be imported

3. **Connection refused errors**
   - Verify PostgreSQL is running on localhost:5432
   - Check firewall settings
   - Ensure database exists

### Testing Database Connection

```bash
# Test if you can connect to PostgreSQL
psql -h localhost -U jacquelinewallace -d weather_journey_db

# Or test with Python
python -c "
import psycopg2
conn = psycopg2.connect('postgresql://jacquelinewallace:1719Zadie@localhost:5432/weather_journey_db')
print('Connection successful!')
conn.close()
"
```

## File Structure

```
backend/
├── migrations/
│   ├── alembic.ini          # Alembic configuration
│   ├── env.py               # Migration environment setup
│   └── versions/            # Migration files
├── set_env.sh               # Shell script for environment variables
├── set_env.py               # Python script for environment variables
└── ALEMBIC_SETUP.md         # This file
```

## Security Notes

- The database credentials in these scripts are for development only
- In production, use environment variables or secure configuration management
- Never commit actual database passwords to version control
- Consider using a `.env` file for local development (not committed to git)

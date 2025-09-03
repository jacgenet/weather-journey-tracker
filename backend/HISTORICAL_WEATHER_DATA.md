# Historical Weather Data Documentation

## ⚠️ IMPORTANT: Data Protection

This document describes the historical weather data in the system and how to protect it from accidental deletion.

## Data Overview

The system contains **81,816 historical weather records** from 2022-2024 that were uploaded from external sources. This data is valuable and should be preserved.

### Current Data Status (as of August 27, 2025)

- **Total Records**: 104,647 weather records
- **Historical Records (2022-2024)**: 81,816 records ✅
- **Future Records (2025+)**: 22,779 records (mock data)
- **Date Range**: 2022-08-31 to 2025-09-03

### Locations with Historical Data

1. **San Francisco Home**: 20,454 historical records
   - Coordinates: 37.7547447, -122.4982381
   
2. **Healdsburg Harmon Guest House**: 20,454 historical records
   - Coordinates: 38.6094534, -122.8707298
   
3. **Amy Colt's Pool**: 20,454 historical records
   - Coordinates: 37.8036848, -122.2032066
   
4. **Santa Rosa Fairgrounds**: 20,454 historical records
   - Coordinates: 38.4332572, -122.6972282

### Missing Historical Data

- **Healdsburg Grey House**: 0 historical records (location matching failed during upload)

## Data Protection Measures

### 1. Backup Script

Use the backup script before making any changes:

```bash
# Create backup
python3 backup_weather_data.py

# Restore from backup
python3 backup_weather_data.py restore weather_data_backup_YYYY-MM-DD_HH-MM-SS.json
```

### 2. Code Warnings

The following functions now include warnings about data protection:

- `_get_mock_historical_data()` - Warns that mock data should not be stored
- `get_weather_period_stats()` - Warns about preserving historical data

### 3. Data Types

- **Historical Data (2022-2024)**: Real weather data from external sources
- **Mock Data (2025+)**: Generated for development/testing purposes
- **Future Data**: Should be labeled as "Simulated Data" in the UI

## Database Schema

### WeatherRecord Table

```sql
CREATE TABLE weather_records (
    id INTEGER PRIMARY KEY,
    location_id INTEGER NOT NULL,
    temperature FLOAT NOT NULL,
    humidity FLOAT,
    pressure FLOAT,
    description TEXT,
    recorded_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations (id)
);
```

## Location Matching

The system uses flexible location matching with these tolerance levels:

- 0.001° (~111 meters) - Very precise
- 0.01° (~1.1 km) - Precise  
- 0.022° (~2.4 km) - **1.5 miles (target tolerance)**
- 0.1° (~11 km) - Moderate
- 0.5° (~55 km) - Loose
- 1.0° (~111 km) - Very loose

## Troubleshooting

### If Historical Data is Missing

1. Check if the location coordinates match within 1.5 miles
2. Verify the location name matches exactly
3. Check the upload logs for matching errors
4. Consider re-uploading with adjusted coordinates

### If Data is Accidentally Deleted

1. Use the backup script to restore: `python3 backup_weather_data.py restore <backup_file>`
2. Re-upload the original JSON file if no backup exists
3. Check the backup files in the backend directory

## Best Practices

1. **Always create a backup** before making changes to weather data
2. **Test changes** on a copy of the database first
3. **Document any data modifications** in this file
4. **Use the backup script** regularly to create snapshots
5. **Never delete weather records** without explicit confirmation

## File Locations

- **Backup Script**: `backend/backup_weather_data.py`
- **Weather Service**: `backend/app/services/weather_service.py`
- **Weather Routes**: `backend/app/routes/weather.py`
- **Weather Model**: `backend/app/models/weather_record.py`
- **This Documentation**: `backend/HISTORICAL_WEATHER_DATA.md`

---

**Last Updated**: August 27, 2025  
**Data Upload Date**: August 27, 2025  
**Total Historical Records**: 81,816

#!/usr/bin/env python3
"""
Script to migrate existing home location data to use the new home_location_id field.
This script will:
1. Create a "San Francisco Home" location if it doesn't exist
2. Update existing people to reference this location by ID
3. Keep the legacy home_location field for backward compatibility
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models.person import Person
from app.models.location import Location
from datetime import datetime

def migrate_home_locations():
    """Migrate existing home location data to use home_location_id"""
    app = create_app()
    
    with app.app_context():
        try:
            print("🔍 Starting home location migration...")
            
            # Step 1: Create "San Francisco Home" location if it doesn't exist
            san_francisco_home = Location.query.filter_by(
                name="San Francisco Home"
            ).first()
            
            if not san_francisco_home:
                print("🏠 Creating 'San Francisco Home' location...")
                san_francisco_home = Location(
                    user_id=1,  # Assuming user ID 1, adjust if needed
                    name="San Francisco Home",
                    address="1719 39th Ave, San Francisco, CA 94122",
                    city="San Francisco",
                    country="USA",
                    latitude=37.7272,
                    longitude=-122.4973,
                    notes="Home location for people in San Francisco"
                )
                db.session.add(san_francisco_home)
                db.session.commit()
                print(f"✅ Created San Francisco Home location with ID: {san_francisco_home.id}")
            else:
                print(f"✅ San Francisco Home location already exists with ID: {san_francisco_home.id}")
            
            # Step 2: Update existing people who have home_location matching the address
            people_to_update = Person.query.filter(
                Person.home_location.like("%1719 39th Ave%")
            ).all()
            
            print(f"🔍 Found {len(people_to_update)} people with San Francisco home address")
            
            for person in people_to_update:
                if not person.home_location_id:
                    print(f"🏠 Updating person {person.full_name} (ID: {person.id})")
                    person.home_location_id = san_francisco_home.id
                    print(f"   - Set home_location_id to {san_francisco_home.id}")
                    print(f"   - Kept legacy home_location: {person.home_location}")
                else:
                    print(f"⏭️ Person {person.full_name} already has home_location_id: {person.home_location_id}")
            
            # Commit all changes
            db.session.commit()
            print("✅ Migration completed successfully!")
            
            # Step 3: Show summary
            print("\n📊 Migration Summary:")
            print(f"   - San Francisco Home location ID: {san_francisco_home.id}")
            print(f"   - People updated: {len(people_to_update)}")
            
            # Show all people and their home location status
            all_people = Person.query.all()
            print(f"\n👥 All people status:")
            for person in all_people:
                home_status = "✅ Has home_location_id" if person.home_location_id else "❌ Missing home_location_id"
                print(f"   - {person.full_name}: {home_status}")
                if person.home_location_id:
                    home_loc = Location.query.get(person.home_location_id)
                    print(f"     Home: {home_loc.name if home_loc else 'Unknown'} (ID: {person.home_location_id})")
                if person.home_location:
                    print(f"     Legacy: {person.home_location}")
            
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            db.session.rollback()
            raise

if __name__ == "__main__":
    migrate_home_locations()

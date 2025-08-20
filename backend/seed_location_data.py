#!/usr/bin/env python3
"""
Seed script to populate countries, states, and cities tables with standard data
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models.country import Country
from app.models.state import State
from app.models.city import City

def seed_countries():
    """Seed countries with ISO standard data"""
    countries_data = [
        # Major countries with full data
        {'name': 'United States', 'iso_code': 'US', 'iso_code_3': 'USA', 'phone_code': '+1', 'currency': 'USD'},
        {'name': 'Canada', 'iso_code': 'CA', 'iso_code_3': 'CAN', 'phone_code': '+1', 'currency': 'CAD'},
        {'name': 'United Kingdom', 'iso_code': 'GB', 'iso_code_3': 'GBR', 'phone_code': '+44', 'currency': 'GBP'},
        {'name': 'Germany', 'iso_code': 'DE', 'iso_code_3': 'DEU', 'phone_code': '+49', 'currency': 'EUR'},
        {'name': 'France', 'iso_code': 'FR', 'iso_code_3': 'FRA', 'phone_code': '+33', 'currency': 'EUR'},
        {'name': 'Italy', 'iso_code': 'IT', 'iso_code_3': 'ITA', 'phone_code': '+39', 'currency': 'EUR'},
        {'name': 'Spain', 'iso_code': 'ES', 'iso_code_3': 'ESP', 'phone_code': '+34', 'currency': 'EUR'},
        {'name': 'Japan', 'iso_code': 'JP', 'iso_code_3': 'JPN', 'phone_code': '+81', 'currency': 'JPY'},
        {'name': 'Australia', 'iso_code': 'AU', 'iso_code_3': 'AUS', 'phone_code': '+61', 'currency': 'AUD'},
        {'name': 'Mexico', 'iso_code': 'MX', 'iso_code_3': 'MEX', 'phone_code': '+52', 'currency': 'MXN'},
        {'name': 'Brazil', 'iso_code': 'BR', 'iso_code_3': 'BRA', 'phone_code': '+55', 'currency': 'BRL'},
        {'name': 'India', 'iso_code': 'IN', 'iso_code_3': 'IND', 'phone_code': '+91', 'currency': 'INR'},
        {'name': 'China', 'iso_code': 'CN', 'iso_code_3': 'CHN', 'phone_code': '+86', 'currency': 'CNY'},
        {'name': 'South Korea', 'iso_code': 'KR', 'iso_code_3': 'KOR', 'phone_code': '+82', 'currency': 'KRW'},
        {'name': 'Netherlands', 'iso_code': 'NL', 'iso_code_3': 'NLD', 'phone_code': '+31', 'currency': 'EUR'},
    ]
    
    print("🌍 Seeding countries...")
    for country_data in countries_data:
        country = Country(**country_data)
        db.session.add(country)
    db.session.commit()
    print(f"✅ Added {len(countries_data)} countries")

def seed_us_states():
    """Seed US states"""
    us = Country.query.filter_by(iso_code='US').first()
    if not us:
        print("❌ United States not found in countries table")
        return
    
    states_data = [
        {'name': 'Alabama', 'abbreviation': 'AL', 'country_id': us.id},
        {'name': 'Alaska', 'abbreviation': 'AK', 'country_id': us.id},
        {'name': 'Arizona', 'abbreviation': 'AZ', 'country_id': us.id},
        {'name': 'Arkansas', 'abbreviation': 'AR', 'country_id': us.id},
        {'name': 'California', 'abbreviation': 'CA', 'country_id': us.id},
        {'name': 'Colorado', 'abbreviation': 'CO', 'country_id': us.id},
        {'name': 'Connecticut', 'abbreviation': 'CT', 'country_id': us.id},
        {'name': 'Delaware', 'abbreviation': 'DE', 'country_id': us.id},
        {'name': 'Florida', 'abbreviation': 'FL', 'country_id': us.id},
        {'name': 'Georgia', 'abbreviation': 'GA', 'country_id': us.id},
        {'name': 'Hawaii', 'abbreviation': 'HI', 'country_id': us.id},
        {'name': 'Idaho', 'abbreviation': 'ID', 'country_id': us.id},
        {'name': 'Illinois', 'abbreviation': 'IL', 'country_id': us.id},
        {'name': 'Indiana', 'abbreviation': 'IN', 'country_id': us.id},
        {'name': 'Iowa', 'abbreviation': 'IA', 'country_id': us.id},
        {'name': 'Kansas', 'abbreviation': 'KS', 'country_id': us.id},
        {'name': 'Kentucky', 'abbreviation': 'KY', 'country_id': us.id},
        {'name': 'Louisiana', 'abbreviation': 'LA', 'country_id': us.id},
        {'name': 'Maine', 'abbreviation': 'ME', 'country_id': us.id},
        {'name': 'Maryland', 'abbreviation': 'MD', 'country_id': us.id},
        {'name': 'Massachusetts', 'abbreviation': 'MA', 'country_id': us.id},
        {'name': 'Michigan', 'abbreviation': 'MI', 'country_id': us.id},
        {'name': 'Minnesota', 'abbreviation': 'MN', 'country_id': us.id},
        {'name': 'Mississippi', 'abbreviation': 'MS', 'country_id': us.id},
        {'name': 'Missouri', 'abbreviation': 'MO', 'country_id': us.id},
        {'name': 'Montana', 'abbreviation': 'MT', 'country_id': us.id},
        {'name': 'Nebraska', 'abbreviation': 'NE', 'country_id': us.id},
        {'name': 'Nevada', 'abbreviation': 'NV', 'country_id': us.id},
        {'name': 'New Hampshire', 'abbreviation': 'NH', 'country_id': us.id},
        {'name': 'New Jersey', 'abbreviation': 'NJ', 'country_id': us.id},
        {'name': 'New Mexico', 'abbreviation': 'NM', 'country_id': us.id},
        {'name': 'New York', 'abbreviation': 'NY', 'country_id': us.id},
        {'name': 'North Carolina', 'abbreviation': 'NC', 'country_id': us.id},
        {'name': 'North Dakota', 'abbreviation': 'ND', 'country_id': us.id},
        {'name': 'Ohio', 'abbreviation': 'OH', 'country_id': us.id},
        {'name': 'Oklahoma', 'abbreviation': 'OK', 'country_id': us.id},
        {'name': 'Oregon', 'abbreviation': 'OR', 'country_id': us.id},
        {'name': 'Pennsylvania', 'abbreviation': 'PA', 'country_id': us.id},
        {'name': 'Rhode Island', 'abbreviation': 'RI', 'country_id': us.id},
        {'name': 'South Carolina', 'abbreviation': 'SC', 'country_id': us.id},
        {'name': 'South Dakota', 'abbreviation': 'SD', 'country_id': us.id},
        {'name': 'Tennessee', 'abbreviation': 'TN', 'country_id': us.id},
        {'name': 'Texas', 'abbreviation': 'TX', 'country_id': us.id},
        {'name': 'Utah', 'abbreviation': 'UT', 'country_id': us.id},
        {'name': 'Vermont', 'abbreviation': 'VT', 'country_id': us.id},
        {'name': 'Virginia', 'abbreviation': 'VA', 'country_id': us.id},
        {'name': 'Washington', 'abbreviation': 'WA', 'country_id': us.id},
        {'name': 'West Virginia', 'abbreviation': 'WV', 'country_id': us.id},
        {'name': 'Wisconsin', 'abbreviation': 'WI', 'country_id': us.id},
        {'name': 'Wyoming', 'abbreviation': 'WY', 'country_id': us.id},
    ]
    
    print("🏛️ Seeding US states...")
    for state_data in states_data:
        state = State(**state_data)
        db.session.add(state)
    db.session.commit()
    print(f"✅ Added {len(states_data)} US states")

def main():
    """Main seeding function"""
    app = create_app()
    with app.app_context():
        try:
            print("🚀 Starting location data seeding...")
            
            # Seed countries first
            seed_countries()
            
            # Seed US states
            seed_us_states()
            
            print("✅ Location data seeding completed successfully!")
            
        except Exception as e:
            print(f"❌ Seeding failed: {e}")
            db.session.rollback()
            raise

if __name__ == "__main__":
    main()

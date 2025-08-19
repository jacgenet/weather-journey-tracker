from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.person import Person
from app.models.person_location import PersonLocation
from app.models.location import Location
from datetime import datetime

people_bp = Blueprint('people', __name__)

@people_bp.route('/people', methods=['GET'])
@jwt_required()
def get_people():
    """Get all people for the current user with visit counts"""
    current_user_id = get_jwt_identity()
    
    try:
        people = Person.query.filter_by(user_id=current_user_id).order_by(Person.last_name, Person.first_name).all()
        
        # Add visit counts to each person
        people_with_visits = []
        for person in people:
            person_data = person.to_dict()
            # Get visit count for this person
            visit_count = PersonLocation.query.filter_by(person_id=person.id).count()
            person_data['visit_count'] = visit_count
            people_with_visits.append(person_data)
        
        return jsonify(people_with_visits), 200
    except Exception as e:
        print(f"Error fetching people: {e}")
        return jsonify({'error': 'Failed to fetch people'}), 500

@people_bp.route('/people/<int:person_id>', methods=['GET'])
@jwt_required()
def get_person(person_id):
    """Get a specific person by ID with their location visits"""
    current_user_id = get_jwt_identity()
    
    try:
        person = Person.query.filter_by(id=person_id, user_id=current_user_id).first()
        
        if not person:
            return jsonify({'error': 'Person not found'}), 404
        
        # Get person data with visits
        person_data = person.to_dict()
        
        # Get all visits for this person
        visits = PersonLocation.query.filter_by(person_id=person_id).order_by(PersonLocation.start_date.desc()).all()
        person_data['visits'] = [visit.to_dict() for visit in visits]
        
        return jsonify(person_data), 200
    except Exception as e:
        print(f"Error fetching person: {e}")
        return jsonify({'error': 'Failed to fetch person'}), 500

@people_bp.route('/people', methods=['POST'])
@jwt_required()
def create_person():
    """Create a new person"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    # Validate required fields
    if not data.get('first_name') or not data.get('last_name'):
        return jsonify({'error': 'First name and last name are required'}), 400
    
    try:
        # Parse birth date if provided
        birth_date = None
        if data.get('birth_date'):
            try:
                birth_date = datetime.strptime(data['birth_date'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'error': 'Invalid birth_date format. Use YYYY-MM-DD'}), 400
        
        # Create new person
        person = Person(
            user_id=current_user_id,
            first_name=data['first_name'],
            last_name=data['last_name'],
            birth_date=birth_date,
            home_location=data.get('home_location'),
            notes=data.get('notes')
        )
        
        db.session.add(person)
        db.session.commit()
        
        return jsonify({
            'message': 'Person created successfully',
            'person': person.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error creating person: {e}")
        return jsonify({'error': 'Failed to create person'}), 500

@people_bp.route('/people/<int:person_id>', methods=['PUT'])
@jwt_required()
def update_person(person_id):
    """Update an existing person"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    try:
        person = Person.query.filter_by(id=person_id, user_id=current_user_id).first()
        
        if not person:
            return jsonify({'error': 'Person not found'}), 404
        
        # Update fields
        if 'first_name' in data:
            person.first_name = data['first_name']
        if 'last_name' in data:
            person.last_name = data['last_name']
        if 'home_location' in data:
            person.home_location = data['home_location']
        if 'notes' in data:
            person.notes = data['notes']
        
        # Update birth date if provided
        if 'birth_date' in data:
            if data['birth_date']:
                try:
                    person.birth_date = datetime.strptime(data['birth_date'], '%Y-%m-%d').date()
                except ValueError:
                    return jsonify({'error': 'Invalid birth_date format. Use YYYY-MM-DD'}), 400
            else:
                person.birth_date = None
        
        db.session.commit()
        
        return jsonify({
            'message': 'Person updated successfully',
            'person': person.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating person: {e}")
        return jsonify({'error': 'Failed to update person'}), 500

@people_bp.route('/people/<int:person_id>', methods=['DELETE'])
@jwt_required()
def delete_person(person_id):
    """Delete a person"""
    current_user_id = get_jwt_identity()
    
    try:
        person = Person.query.filter_by(id=person_id, user_id=current_user_id).first()
        
        if not person:
            return jsonify({'error': 'Person not found'}), 404
        
        db.session.delete(person)
        db.session.commit()
        
        return jsonify({'message': 'Person deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting person: {e}")
        return jsonify({'error': 'Failed to delete person'}), 500

@people_bp.route('/people/<int:person_id>/visits', methods=['POST'])
@jwt_required()
def add_person_visit(person_id):
    """Add a location visit for a person"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    # Validate required fields
    if not data.get('location_id') or not data.get('start_date'):
        return jsonify({'error': 'Location ID and start date are required'}), 400
    
    try:
        # Verify person belongs to current user
        person = Person.query.filter_by(id=person_id, user_id=current_user_id).first()
        if not person:
            return jsonify({'error': 'Person not found'}), 404
        
        # Verify location exists
        location = Location.query.get(data['location_id'])
        if not location:
            return jsonify({'error': 'Location not found'}), 404
        
        # Parse dates
        start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        end_date = None
        if data.get('end_date'):
            try:
                end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'error': 'Invalid end_date format. Use YYYY-MM-DD'}), 400
        
        # Create visit
        visit = PersonLocation(
            person_id=person_id,
            location_id=data['location_id'],
            start_date=start_date,
            end_date=end_date,
            notes=data.get('notes')
        )
        
        db.session.add(visit)
        db.session.commit()
        
        return jsonify({
            'message': 'Visit added successfully',
            'visit': visit.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error adding visit: {e}")
        return jsonify({'error': 'Failed to add visit'}), 500

@people_bp.route('/people/<int:person_id>/visits/<int:visit_id>', methods=['PUT'])
@jwt_required()
def update_person_visit(person_id, visit_id):
    """Update a person's location visit"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    try:
        # Verify person belongs to current user
        person = Person.query.filter_by(id=person_id, user_id=current_user_id).first()
        if not person:
            return jsonify({'error': 'Person not found'}), 404
        
        # Get the visit
        visit = PersonLocation.query.filter_by(id=visit_id, person_id=person_id).first()
        if not visit:
            return jsonify({'error': 'Visit not found'}), 404
        
        # Update fields
        if 'start_date' in data:
            visit.start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        if 'end_date' in data:
            if data['end_date']:
                visit.end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
            else:
                visit.end_date = None
        if 'notes' in data:
            visit.notes = data['notes']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Visit updated successfully',
            'visit': visit.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating visit: {e}")
        return jsonify({'error': 'Failed to update visit'}), 500

@people_bp.route('/people/<int:person_id>/visits/<int:visit_id>', methods=['DELETE'])
@jwt_required()
def delete_person_visit(person_id, visit_id):
    """Delete a person's location visit"""
    current_user_id = get_jwt_identity()
    
    try:
        # Verify person belongs to current user
        person = Person.query.filter_by(id=person_id, user_id=current_user_id).first()
        if not person:
            return jsonify({'error': 'Person not found'}), 404
        
        # Get the visit
        visit = PersonLocation.query.filter_by(id=visit_id, person_id=person_id).first()
        if not visit:
            return jsonify({'error': 'Visit not found'}), 404
        
        db.session.delete(visit)
        db.session.commit()
        
        return jsonify({'message': 'Visit deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting visit: {e}")
        return jsonify({'error': 'Failed to delete visit'}), 500

@people_bp.route('/people/search', methods=['GET'])
@jwt_required()
def search_people():
    """Search people by name"""
    current_user_id = get_jwt_identity()
    query = request.args.get('q', '').strip()
    
    if not query:
        return jsonify({'error': 'Search query is required'}), 400
    
    try:
        # Search in first name and last name
        people = Person.query.filter(
            Person.user_id == current_user_id,
            db.or_(
                Person.first_name.ilike(f'%{query}%'),
                Person.last_name.ilike(f'%{query}%')
            )
        ).order_by(Person.last_name, Person.first_name).all()
        
        return jsonify([person.to_dict() for person in people]), 200
        
    except Exception as e:
        print(f"Error searching people: {e}")
        return jsonify({'error': 'Failed to search people'}), 500

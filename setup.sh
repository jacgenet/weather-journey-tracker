#!/bin/bash

# Weather Journey Tracker Setup Script
# This script will help you set up the complete application

echo "🌤️  Weather Journey Tracker Setup"
echo "=================================="

# Check if required tools are installed
check_requirements() {
    echo "Checking requirements..."
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        echo "❌ Python 3 is not installed. Please install Python 3.9+ first."
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    # Check PostgreSQL
    if ! command -v psql &> /dev/null; then
        echo "❌ PostgreSQL is not installed. Please install PostgreSQL 13+ first."
        exit 1
    fi
    
    echo "✅ All requirements are met!"
}

# Setup backend
setup_backend() {
    echo "Setting up backend..."
    cd backend
    
    # Create virtual environment
    echo "Creating Python virtual environment..."
    python3 -m venv venv
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Install dependencies
    echo "Installing Python dependencies..."
    pip install --upgrade pip
    pip install -r requirements.txt
    
    # Create .env file if it doesn't exist
    if [ ! -f .env ]; then
        echo "Creating .env file..."
        cat > .env << EOF
# Flask Configuration
SECRET_KEY=your-super-secret-key-change-this
FLASK_ENV=development
FLASK_DEBUG=1

# Database Configuration
DATABASE_URL=postgresql://localhost/weather_journey_db

# JWT Configuration
JWT_SECRET_KEY=your-jwt-secret-key-change-this

# API Keys (Optional for development)
OPENWEATHER_API_KEY=your-openweather-api-key-here
GEOCODING_API_KEY=your-geocoding-api-key-here
EOF
        echo "⚠️  Please edit backend/.env with your actual configuration"
    fi
    
    # Set Flask app
    export FLASK_APP=run.py
    
    # Initialize database
    echo "Initializing database..."
    flask db init
    flask db migrate -m "Initial migration"
    flask db upgrade
    
    cd ..
    echo "✅ Backend setup complete!"
}

# Setup frontend
setup_frontend() {
    echo "Setting up frontend..."
    cd frontend
    
    # Install dependencies
    echo "Installing Node.js dependencies..."
    npm install
    
    # Create .env file if it doesn't exist
    if [ ! -f .env ]; then
        echo "Creating .env file..."
        cat > .env << EOF
REACT_APP_API_URL=http://localhost:5001/api
REACT_APP_MAP_API_KEY=your-map-api-key-here
EOF
        echo "⚠️  Please edit frontend/.env with your actual configuration"
    fi
    
    cd ..
    echo "✅ Frontend setup complete!"
}

# Create database
create_database() {
    echo "Setting up database..."
    
    # Try to create database
    if createdb weather_journey_db 2>/dev/null; then
        echo "✅ Database created successfully"
    else
        echo "⚠️  Database creation failed. You may need to:"
        echo "   1. Start PostgreSQL service"
        echo "   2. Create database manually: createdb weather_journey_db"
        echo "   3. Or connect as postgres user: sudo -u postgres createdb weather_journey_db"
    fi
}

# Start services
start_services() {
    echo "Starting services..."
    
    echo "To start the application:"
    echo ""
    echo "1. Start backend (in one terminal):"
    echo "   cd backend"
    echo "   source venv/bin/activate"
    echo "   python run.py"
    echo ""
    echo "2. Start frontend (in another terminal):"
    echo "   cd frontend"
    echo "   npm start"
    echo ""
    echo "3. Access the application:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend API: http://localhost:5001"
}

# Main setup
main() {
    check_requirements
    create_database
    setup_backend
    setup_frontend
    start_services
    
    echo ""
    echo "🎉 Setup complete!"
    echo ""
    echo "Next steps:"
    echo "1. Edit backend/.env with your configuration"
    echo "2. Edit frontend/.env with your configuration"
    echo "3. Start the services as shown above"
    echo "4. Create your first account at http://localhost:3000"
    echo ""
    echo "For detailed instructions, see INSTALLATION_GUIDE.md"
}

# Run setup
main 
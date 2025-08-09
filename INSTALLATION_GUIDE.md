# Weather Journey Tracker - Installation Guide

This guide will walk you through setting up the complete weather tracking application on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software
- **Python 3.9+** - [Download from python.org](https://www.python.org/downloads/)
- **Node.js 18+** - [Download from nodejs.org](https://nodejs.org/)
- **PostgreSQL 13+** - [Download from postgresql.org](https://www.postgresql.org/download/)
- **Git** - [Download from git-scm.com](https://git-scm.com/)

### Verify Installations
```bash
# Check Python version
python --version  # Should be 3.9 or higher

# Check Node.js version
node --version    # Should be 18 or higher

# Check npm version
npm --version     # Should be 8 or higher

# Check PostgreSQL
psql --version    # Should be 13 or higher
```

## Step 1: Clone and Setup Project

### 1.1 Clone the Repository
```bash
# Navigate to your desired directory
cd /path/to/your/projects

# Clone the repository
git clone <repository-url>
cd weather-journey-tracker
```

### 1.2 Verify Project Structure
You should see the following structure:
```
weather-journey-tracker/
├── backend/
│   ├── app/
│   ├── requirements.txt
│   └── run.py
├── frontend/
├── README.md
└── INSTALLATION_GUIDE.md
```

## Step 2: Database Setup

### 2.1 Install PostgreSQL
**macOS (using Homebrew):**
```bash
brew install postgresql
brew services start postgresql
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Windows:**
- Download and install from [postgresql.org](https://www.postgresql.org/download/windows/)
- Add PostgreSQL to your PATH

### 2.2 Create Database
```bash
# Connect to PostgreSQL as superuser
sudo -u postgres psql

# Create a new user (replace 'your_username' with your desired username)
CREATE USER your_username WITH PASSWORD 'your_password';

# Create the database
CREATE DATABASE weather_journey_db OWNER your_username;

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE weather_journey_db TO your_username;

# Exit PostgreSQL
\q
```

### 2.3 Alternative: Using psql directly
```bash
# Create database using createdb command
createdb weather_journey_db
```

## Step 3: Backend Setup

### 3.1 Navigate to Backend Directory
```bash
cd backend
```

### 3.2 Create Virtual Environment
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate

# On Windows:
venv\Scripts\activate
```

### 3.3 Install Python Dependencies
```bash
# Upgrade pip
pip install --upgrade pip

# Install requirements
pip install -r requirements.txt
```

### 3.4 Environment Configuration
```bash
# Create environment file
cp env.example .env
```

Edit the `.env` file with your configuration:
```env
# Flask Configuration
SECRET_KEY=your-super-secret-key-change-this
FLASK_ENV=development
FLASK_DEBUG=1

# Database Configuration
DATABASE_URL=postgresql://your_username:your_password@localhost/weather_journey_db

# JWT Configuration
JWT_SECRET_KEY=your-jwt-secret-key-change-this

# API Keys (Optional for development)
OPENWEATHER_API_KEY=your-openweather-api-key-here
GEOCODING_API_KEY=your-geocoding-api-key-here
```

**Note**: If you prefer not to create a `.env` file, you can use the provided scripts:
```bash
# Set environment variables for database operations
source set_env.sh
# or
python set_env.py
```

### 3.5 Alembic Migration Setup
The project uses Alembic for database migrations, which provides better control and flexibility than Flask-Migrate.

**Key Benefits of Alembic:**
- More granular control over migrations
- Better handling of complex database changes
- Can run migrations outside of Flask context
- More detailed migration history and rollback capabilities

**Available Migration Scripts:**
- `set_env.sh` - Shell script to set environment variables (Unix/Mac)
- `set_env.py` - Python script to set environment variables (Cross-platform)
- `ALEMBIC_SETUP.md` - Detailed Alembic documentation

### 3.6 Initialize Database
```bash
# Set Flask app
export FLASK_APP=run.py

# Option 1: Using Alembic (Recommended)
# Set environment variables for database connection
source set_env.sh

# Initialize migrations (if not already done)
alembic init migrations

# Create initial migration
alembic revision --autogenerate -m "Initial migration"

# Apply migrations
alembic upgrade head

# Option 2: Using Flask-Migrate (Alternative)
# flask db init
# flask db migrate -m "Initial migration"
# flask db upgrade
```

### 3.6 Test Backend
```bash
# Run the Flask application
python run.py
```

You should see output like:
```
 * Running on http://0.0.0.0:5000
 * Debug mode: on
```

Visit `http://localhost:5000` to verify the backend is running.

## Step 4: Frontend Setup

### 4.1 Navigate to Frontend Directory
```bash
# From project root
cd frontend
```

### 4.2 Install Node.js Dependencies
```bash
# Install dependencies
npm install
```

### 4.3 Environment Configuration
```bash
# Create environment file
cp .env.example .env
```

Edit the `.env` file:
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_MAP_API_KEY=your-map-api-key-here
```

### 4.4 Test Frontend
```bash
# Start development server
npm start
```

The application should open automatically at `http://localhost:3000`.

## Step 5: API Keys Setup (Optional)

### 5.1 OpenWeatherMap API
1. Go to [OpenWeatherMap](https://openweathermap.org/)
2. Sign up for a free account
3. Get your API key from your account dashboard
4. Add it to your backend `.env` file:
   ```env
   OPENWEATHER_API_KEY=your-api-key-here
   ```

### 5.2 Map API (Optional)
For enhanced map features, you can add:
- **Google Maps API** - [Google Cloud Console](https://console.cloud.google.com/)
- **Mapbox API** - [Mapbox](https://www.mapbox.com/)

Add to frontend `.env`:
```env
REACT_APP_MAP_API_KEY=your-map-api-key-here
```

## Step 6: Running the Application

### 6.1 Start Backend
```bash
# From backend directory
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
python run.py
```

### 6.2 Start Frontend
```bash
# From frontend directory (in a new terminal)
cd frontend
npm start
```

### 6.3 Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Step 7: First-Time Setup

### 7.1 Create Your Account
1. Open http://localhost:3000
2. Click "Register" to create your account
3. Fill in your details and create your account

### 7.2 Add Your First Location
1. After logging in, click "Add Location"
2. Enter location details:
   - Name: "My First Trip"
   - City: "New York"
   - Country: "USA"
   - Visit Date: Select a date
3. Click "Save"

### 7.3 View Weather Data
1. Click on your location to view weather data
2. The app will fetch current weather for that location
3. View your weather timeline and statistics

## Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Test database connection
psql -h localhost -U your_username -d weather_journey_db
```

#### Alembic Migration Issues
```bash
# Check if environment variables are set
echo $DATABASE_URL

# Set environment variables if needed
source set_env.sh

# Check Alembic configuration
alembic current

# View migration history
alembic history

# If you get "No database URL found" error:
# 1. Ensure environment variables are set
# 2. Check that PostgreSQL is running
# 3. Verify database credentials in set_env.sh
```

#### Python Virtual Environment Issues
```bash
# If venv activation fails
python -m venv venv --clear
source venv/bin/activate
pip install -r requirements.txt
```

#### Node.js Issues
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Port Already in Use
```bash
# Check what's using the port
lsof -i :5000  # For backend
lsof -i :3000  # For frontend

# Kill the process
kill -9 <PID>
```

### Environment-Specific Issues

#### macOS Issues
```bash
# If you get permission errors with PostgreSQL
sudo chown -R $(whoami) /usr/local/var/postgres

# If Python installation issues
brew install python@3.9
```

#### Windows Issues
```bash
# If psql is not found, add to PATH
# Add C:\Program Files\PostgreSQL\13\bin to your PATH

# If virtual environment issues
python -m venv venv --clear
venv\Scripts\activate
```

#### Linux Issues
```bash
# If PostgreSQL service won't start
sudo systemctl enable postgresql
sudo systemctl start postgresql

# If permission issues
sudo chown -R postgres:postgres /var/lib/postgresql
```

## Development Workflow

### Making Changes
1. **Backend Changes**: Edit files in `backend/app/`
2. **Frontend Changes**: Edit files in `frontend/src/`
3. **Database Changes**: Create new migrations:
   ```bash
   # Using Alembic (Recommended)
   cd backend
   source set_env.sh
   alembic revision --autogenerate -m "Description of changes"
   alembic upgrade head
   
   # Alternative: Using Flask-Migrate
   flask db migrate -m "Description of changes"
   flask db upgrade
   ```

### Testing
```bash
# Backend tests (when implemented)
cd backend
python -m pytest

# Frontend tests (when implemented)
cd frontend
npm test
```

## Production Deployment

### Backend Deployment
1. **Heroku**:
   ```bash
   heroku create your-app-name
   heroku addons:create heroku-postgresql:hobby-dev
   git push heroku main
   ```

2. **AWS EC2**:
   - Launch EC2 instance
   - Install dependencies
   - Use gunicorn for production
   - Set up nginx as reverse proxy

### Frontend Deployment
1. **Vercel**:
   ```bash
   npm install -g vercel
   vercel
   ```

2. **Netlify**:
   - Connect GitHub repository
   - Build command: `npm run build`
   - Publish directory: `build`

### Database Deployment
1. **AWS RDS**: Managed PostgreSQL
2. **Heroku Postgres**: Add-on for Heroku apps
3. **DigitalOcean Managed Databases**

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all prerequisites are installed correctly
3. Ensure all environment variables are set
4. Check the console for error messages
5. Verify database connection and permissions
6. For Alembic-specific issues, see `backend/ALEMBIC_SETUP.md`

## Next Steps

After successful installation:
1. Explore the dashboard features
2. Add multiple locations to test the timeline
3. Customize the application for your needs
4. Consider adding additional weather data sources
5. Implement advanced features like weather alerts

Congratulations! Your weather journey tracker is now ready to use! 🌤️ 
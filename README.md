# Weather Journey Tracker

A secure, password-protected web application that allows users to track and visualize weather patterns in locations visited throughout life. Built with React frontend, Python Flask backend, and PostgreSQL database.

## Features

- **User Authentication**: Secure login/registration with password protection
- **Location Management**: Add, edit, and delete visited locations
- **Weather Data Integration**: Real-time weather data via OpenWeatherMap API
- **Interactive Timeline**: Visual timeline of weather patterns and locations
- **Dashboard Interface**: Clean, responsive dashboard with average temperature display
- **Interactive Map**: Map visualization showing all visited locations
- **Data Security**: Encrypted data storage and secure API communication

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Material-UI (MUI)** for modern UI components
- **React Router** for navigation
- **Axios** for API communication
- **Chart.js** for data visualization
- **Leaflet** for interactive maps

### Backend
- **Python Flask** with RESTful API
- **SQLAlchemy** ORM
- **Flask-JWT-Extended** for authentication
- **Flask-CORS** for cross-origin requests
- **bcrypt** for password hashing

### Database
- **PostgreSQL** for data persistence
- **Alembic** for database migrations

### External APIs
- **OpenWeatherMap API** for weather data
- **Geocoding API** for location coordinates

## Project Structure

```
weather-journey-tracker/
├── frontend/                 # React application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── hooks/          # Custom React hooks
│   │   ├── types/          # TypeScript type definitions
│   │   └── utils/          # Utility functions
│   ├── public/             # Static assets
│   └── package.json
├── backend/                 # Flask application
│   ├── app/
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Utility functions
│   │   └── config.py       # Configuration
│   ├── migrations/         # Database migrations
│   └── requirements.txt
├── docker-compose.yml      # Development environment
└── README.md
```

## Development Timeline

### Phase 1: Project Setup & Backend Foundation (Week 1)
- [x] Project structure setup
- [x] Database schema design
- [x] Flask backend with basic authentication
- [x] PostgreSQL database configuration
- [x] API endpoints for user management

### Phase 2: Frontend Foundation (Week 2)
- [x] React application setup
- [x] Authentication components
- [x] Dashboard layout
- [x] Navigation and routing
- [x] Basic UI components

### Phase 3: Core Features (Week 3)
- [x] Location management
- [x] Weather API integration
- [x] Interactive map implementation
- [x] Timeline visualization
- [x] Data visualization components

### Phase 4: Advanced Features & Polish (Week 4)
- [x] Advanced weather analytics
- [x] Export functionality
- [x] Performance optimization
- [x] Security enhancements
- [x] Testing and documentation

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.9+
- PostgreSQL 13+
- Docker (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd weather-journey-tracker
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Database Setup**
   ```bash
   # Create PostgreSQL database
   createdb weather_journey_db
   
   # Run migrations
   flask db upgrade
   ```

4. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```

5. **Environment Configuration**
   - Copy `.env.example` to `.env` in both frontend and backend
   - Add your OpenWeatherMap API key
   - Configure database connection

6. **Run the Application**
   ```bash
   # Backend (from backend directory)
   flask run
   
   # Frontend (from frontend directory)
   npm start
   ```

## API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile

### Location Endpoints
- `GET /api/locations` - Get user's locations
- `POST /api/locations` - Add new location
- `PUT /api/locations/<id>` - Update location
- `DELETE /api/locations/<id>` - Delete location

### Weather Endpoints
- `GET /api/weather/<location_id>` - Get weather data for location
- `GET /api/weather/history/<location_id>` - Get weather history

## Security Features

- JWT token-based authentication
- Password hashing with bcrypt
- CORS configuration
- Input validation and sanitization
- SQL injection prevention
- XSS protection

## Deployment

### Recommended Hosting Solutions

**Frontend:**
- Vercel (recommended for React apps)
- Netlify
- AWS S3 + CloudFront

**Backend:**
- Heroku
- AWS EC2
- DigitalOcean App Platform

**Database:**
- AWS RDS PostgreSQL
- Heroku Postgres
- DigitalOcean Managed Databases

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details 
from app import create_app, db
from app.models import User, Location, WeatherRecord

app = create_app()

@app.shell_context_processor
def make_shell_context():
    return {
        'db': db,
        'User': User,
        'Location': Location,
        'WeatherRecord': WeatherRecord
    }

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=9000, debug=False) 
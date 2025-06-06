# Campus Events Platform

A web platform for managing campus events at INPT, allowing students and organizers to create, view, and manage events.
 
github link = https://github.com/afif-main/event_campus
report of the project is listed in moodle platform

## Features

- User Authentication (Login/Register)
- Event Management (Create, Read, Update, Delete)
- Profile Management
- Event Browsing and Filtering
- Secure Session Handling

## Technical Requirements

Before you begin, ensure you have the following installed:

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm (Node Package Manager)

## Database Configuration

The application uses PostgreSQL as its database. You can configure the database connection in `src/config/database.js`. The default configuration is:

```javascript
{
  development: {
    username: 'postgres',
    password: 'axel',
    database: 'campus_events_dev',
    host: '127.0.0.1',
    dialect: 'postgres'
  }
}
```

You can modify these settings if needed, or use the default values if your PostgreSQL installation matches these settings.

## Installation and Setup

1. Clone the repository:
```bash
git clone https://github.com/afif-main/event_campus.git
cd event_campus
```

2. Install project dependencies:
```bash
npm install
```

3. Set up the database:
```bash
# Create the database
createdb campus_events_dev

# Run database migrations
npx sequelize-cli db:migrate
```

4. Start the development server:
```bash
npm run dev
```

The application will start on http://localhost:3000

## Project Structure

- `/public` - Frontend files (HTML, CSS, JavaScript)
- `/src` - Backend code
  - `/config` - Configuration files
  - `/models` - Database models
  - `/routes` - API routes
  - `/middleware` - Middleware functions

## User Roles

- Student: Can view events and register for events
- Organizer: Can create, manage, and view their own events


## API Documentation

### Authentication
- POST /api/auth/register - Register new user
- POST /api/auth/login - Login user
- GET /api/auth/me - Get current user profile

### Events
- GET /api/events - Get all events (with filtering)
- POST /api/events - Create new event
- GET /api/events/:id - Get single event
- PUT /api/events/:id - Update event
- DELETE /api/events/:id - Delete event

## Development

The project uses nodemon for development with hot reload. Start the development server:
```bash
npm run dev
```



## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to your branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.
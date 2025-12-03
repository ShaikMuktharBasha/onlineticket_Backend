# TravelSathi Backend

A Node.js backend API for the TravelSathi travel booking platform with MySQL database integration.

## Features

- User authentication with JWT
- Car, flight, and hotel booking
- MySQL database integration
- RESTful API endpoints
- CORS enabled for frontend integration

## Prerequisites

- Node.js (v18.x recommended)
- MySQL Server
- npm or yarn

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up MySQL database:
   - Create a MySQL database named `travelsathi`
   - Update database credentials in `.env` file

4. Configure environment variables:
   Copy `.env` file and update the values:
   ```env
   DB_HOST=localhost
   DB_USER=your_mysql_username
   DB_PASSWORD=your_mysql_password
   DB_NAME=travelsathi
   JWT_SECRET=your_jwt_secret_key
   ```

5. Start the server:
   ```bash
   npm start
   ```

The server will automatically:
- Connect to MySQL database
- Create all necessary tables
- Insert sample data
- Start listening on port 3000

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Locations
- `GET /api/locations` - Get all locations

### Cars
- `GET /api/cars` - Get all cars
- `GET /api/cars/search?location=&maxPrice=` - Search cars
- `GET /api/cars/:id` - Get car by ID

### Flights
- `GET /api/flights` - Get all flights
- `GET /api/flights/search?origin=&destination=&date=` - Search flights
- `GET /api/flights/:id` - Get flight by ID

### Hotels
- `GET /api/hotels` - Get all hotels
- `GET /api/hotels/search?location=&maxPrice=` - Search hotels
- `GET /api/hotels/:id` - Get hotel by ID

### Bookings (Authenticated)
- `GET /api/bookings` - Get user bookings
- `POST /api/bookings` - Create booking

### Payments (Authenticated)
- `GET /api/payments` - Get user payments
- `POST /api/payments` - Process payment

## Database Schema

The application automatically creates the following tables:
- `users` - User accounts
- `locations` - Available locations
- `cars` - Car listings
- `flights` - Flight listings
- `hotels` - Hotel listings
- `bookings` - User bookings
- `payments` - Payment records

## Development

For development with auto-restart:
```bash
npm run dev
```

## Deployment

This application is configured for Vercel deployment. The database connection will work with any MySQL-compatible service (PlanetScale, AWS RDS, etc.).

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | MySQL host | localhost |
| `DB_USER` | MySQL username | root |
| `DB_PASSWORD` | MySQL password | (empty) |
| `DB_NAME` | Database name | travelsathi |
| `JWT_SECRET` | JWT signing secret | your-secret-key |
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |

## Sample Data

The application includes sample data for:
- 16 locations
- 5 cars
- 4 flights
- 5 hotels

All sample data is automatically inserted when the server starts for the first time.
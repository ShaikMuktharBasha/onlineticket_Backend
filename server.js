require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool, testConnection, initializeDatabase, query } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for now to ensure deployment works
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Root Route
app.get('/', (req, res) => {
  res.json({ message: 'TravelSathi Backend is running 🚀' });
});

// Initialize database connection and tables
const startServer = async () => {
  try {
    // Test database connection
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('❌ Failed to connect to database. Server will start with limited functionality.');
    } else {
      // Initialize database tables and sample data
      await initializeDatabase();
    }

    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Database: ${isConnected ? 'Connected' : 'Disconnected'}`);
    });
  } catch (error) {
    console.error('❌ Server startup failed:', error.message);
    process.exit(1);
  }
};

startServer();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check if user exists
    const existingUsers = await query('users', 'findWhere', { where: { email } });
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userId = uuidv4();
    await query('users', 'insert', {
      data: {
        id: userId,
        name,
        email,
        phone: phone || null,
        password: hashedPassword,
        role: 'USER'
      }
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: { id: userId, name, email, role: 'USER' }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const users = await query('users', 'findWhere', { where: { email } });
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Location Routes
app.get('/api/locations', async (req, res) => {
  try {
    const locations = await query('locations', 'findAll');
    const locationNames = locations.map(loc => loc.name);
    res.json(locationNames);
  } catch (error) {
    console.error('Locations fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// Car Routes
app.get('/api/cars', async (req, res) => {
  try {
    const cars = await query('cars', 'findAll');
    res.json(cars);
  } catch (error) {
    console.error('Cars fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch cars' });
  }
});

app.get('/api/cars/search', async (req, res) => {
  try {
    const { location, maxPrice } = req.query;
    let where = {};
    let like = {};

    if (location) {
      like.location = location;
    }

    // For price filtering, we'll need to get all cars and filter manually
    let cars = await query('cars', 'findWhere', { where, like });

    if (maxPrice) {
      cars = cars.filter(car => car.price_per_day <= parseFloat(maxPrice));
    }

    res.json(cars);
  } catch (error) {
    console.error('Cars search error:', error);
    res.status(500).json({ error: 'Failed to search cars' });
  }
});

app.get('/api/cars/:id', async (req, res) => {
  try {
    const car = await query('cars', 'findById', { id: req.params.id });
    if (!car) {
      return res.status(404).json({ error: 'Car not found' });
    }
    res.json(car);
  } catch (error) {
    console.error('Car fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch car' });
  }
});



// Booking Routes
app.get('/api/bookings', authenticateToken, async (req, res) => {
  try {
    const bookings = await query('bookings', 'findWhere', { where: { user_id: req.user.id }, orderBy: 'booking_date DESC' });
    res.json(bookings);
  } catch (error) {
    console.error('Bookings fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

app.post('/api/bookings', authenticateToken, async (req, res) => {
  try {
    const { type, itemId, numPersons, totalAmount } = req.body;
    const bookingId = uuidv4();

    await query('bookings', 'insert', {
      data: {
        id: bookingId,
        user_id: req.user.id,
        type,
        item_id: itemId,
        num_persons: numPersons || 1,
        total_amount: totalAmount,
        status: 'CONFIRMED'
      }
    });

    // Return the created booking
    const booking = await query('bookings', 'findById', { id: bookingId });
    res.status(201).json(booking);
  } catch (error) {
    console.error('Booking creation error:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Payment Routes
app.get('/api/payments', authenticateToken, async (req, res) => {
  try {
    const payments = await query('payments', 'findWhere', { where: { user_id: req.user.id }, orderBy: 'payment_date DESC' });
    res.json(payments);
  } catch (error) {
    console.error('Payments fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

app.post('/api/payments', authenticateToken, async (req, res) => {
  try {
    const { bookingId, amount, paymentMethod } = req.body;
    const paymentId = uuidv4();

    await query('payments', 'insert', {
      data: {
        id: paymentId,
        booking_id: bookingId,
        user_id: req.user.id,
        amount,
        payment_method: paymentMethod,
        status: 'SUCCESS'
      }
    });

    // Return the created payment
    const payment = await query('payments', 'findById', { id: paymentId });
    res.status(201).json(payment);
  } catch (error) {
    console.error('Payment creation error:', error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

// Flight Routes
app.get('/api/flights', async (req, res) => {
  try {
    const flights = await query('flights', 'findAll');
    res.json(flights);
  } catch (error) {
    console.error('Flights fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch flights' });
  }
});

app.get('/api/flights/search', async (req, res) => {
  try {
    const { origin, destination, date } = req.query;
    let where = {};
    let like = {};

    if (origin) {
      like.origin = origin;
    }

    if (destination) {
      like.destination = destination;
    }

    let flights = await query('flights', 'findWhere', { where, like, orderBy: 'departure_time' });

    if (date) {
      // Filter by date manually since our query function doesn't support DATE() function
      flights = flights.filter(flight => {
        const flightDate = new Date(flight.departure_time).toISOString().split('T')[0];
        return flightDate === date;
      });
    }

    res.json(flights);
  } catch (error) {
    console.error('Flights search error:', error);
    res.status(500).json({ error: 'Failed to search flights' });
  }
});

app.get('/api/flights/:id', async (req, res) => {
  try {
    const flight = await query('flights', 'findById', { id: req.params.id });
    if (!flight) {
      return res.status(404).json({ error: 'Flight not found' });
    }
    res.json(flight);
  } catch (error) {
    console.error('Flight fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch flight' });
  }
});

// Hotel Routes
app.get('/api/hotels', async (req, res) => {
  try {
    const hotels = await query('hotels', 'findAll');
    res.json(hotels);
  } catch (error) {
    console.error('Hotels fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch hotels' });
  }
});

app.get('/api/hotels/search', async (req, res) => {
  try {
    const { location, maxPrice } = req.query;
    let where = {};
    let like = {};

    if (location) {
      like.location = location;
    }

    let hotels = await query('hotels', 'findWhere', { where, like, orderBy: 'price_per_night' });

    if (maxPrice) {
      hotels = hotels.filter(hotel => hotel.price_per_night <= parseFloat(maxPrice));
    }

    res.json(hotels);
  } catch (error) {
    console.error('Hotels search error:', error);
    res.status(500).json({ error: 'Failed to search hotels' });
  }
});

app.get('/api/hotels/:id', async (req, res) => {
  try {
    const hotel = await query('hotels', 'findById', { id: req.params.id });
    if (!hotel) {
      return res.status(404).json({ error: 'Hotel not found' });
    }
    res.json(hotel);
  } catch (error) {
    console.error('Hotel fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch hotel' });
  }
});

// Admin Routes - Require authentication and admin role
app.post('/api/hotels', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const hotelData = req.body;
    const result = await query('hotels', 'insert', { data: hotelData });
    res.status(201).json(result);
  } catch (error) {
    console.error('Hotel creation error:', error);
    res.status(500).json({ error: 'Failed to create hotel' });
  }
});

app.delete('/api/hotels/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await query('hotels', 'delete', { id: req.params.id });
    res.json({ message: 'Hotel deleted successfully' });
  } catch (error) {
    console.error('Hotel deletion error:', error);
    res.status(500).json({ error: 'Failed to delete hotel' });
  }
});

// Admin Routes for Flights
app.post('/api/flights', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const flightData = req.body;
    const result = await query('flights', 'insert', { data: flightData });
    res.status(201).json(result);
  } catch (error) {
    console.error('Flight creation error:', error);
    res.status(500).json({ error: 'Failed to create flight' });
  }
});

app.delete('/api/flights/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await query('flights', 'delete', { id: req.params.id });
    res.json({ message: 'Flight deleted successfully' });
  } catch (error) {
    console.error('Flight deletion error:', error);
    res.status(500).json({ error: 'Failed to delete flight' });
  }
});

// Admin Routes for Cars
app.post('/api/cars', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const carData = req.body;
    const result = await query('cars', 'insert', { data: carData });
    res.status(201).json(result);
  } catch (error) {
    console.error('Car creation error:', error);
    res.status(500).json({ error: 'Failed to create car' });
  }
});

app.delete('/api/cars/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await query('cars', 'delete', { id: req.params.id });
    res.json({ message: 'Car deleted successfully' });
  } catch (error) {
    console.error('Car deletion error:', error);
    res.status(500).json({ error: 'Failed to delete car' });
  }
});

// Admin Route for Users
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await query('users', 'findAll');
    // Remove passwords from response
    const safeUsers = users.map(({ password, ...user }) => user);
    res.json(safeUsers);
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// For Vercel serverless functions
module.exports = app;
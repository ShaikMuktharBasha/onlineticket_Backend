const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'travelvibe',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create connection pool
let pool;
let useInMemory = false;

try {
  pool = mysql.createPool(dbConfig);
} catch (error) {
  console.log('⚠️  MySQL not available, using in-memory storage');
  useInMemory = true;
}

// In-memory storage fallback
let memoryStorage = {
  users: [],
  locations: [
    "New York", "Los Angeles", "Chicago", "Houston", "Phoenix",
    "Philadelphia", "San Antonio", "San Diego", "Dallas", "San Jose",
    "Austin", "Jacksonville", "Fort Worth", "Columbus", "Charlotte",
    "San Francisco", "Indianapolis", "Seattle", "Denver", "Boston"
  ],
  cars: [
    { id: 1, model: 'Camry', brand: 'Toyota', location: 'New York', pricePerDay: 45.00, carType: 'Sedan', description: 'Comfortable sedan for city driving', seatingCapacity: 5, availableCars: 10 },
    { id: 2, model: 'Civic', brand: 'Honda', location: 'Los Angeles', pricePerDay: 42.00, carType: 'Sedan', description: 'Reliable and fuel-efficient', seatingCapacity: 5, availableCars: 8 },
    { id: 3, model: 'Mustang', brand: 'Ford', location: 'Chicago', pricePerDay: 85.00, carType: 'Sports', description: 'Powerful sports car', seatingCapacity: 4, availableCars: 3 },
    { id: 4, model: 'Explorer', brand: 'Ford', location: 'Houston', pricePerDay: 75.00, carType: 'SUV', description: 'Spacious family SUV', seatingCapacity: 7, availableCars: 5 },
    { id: 5, model: 'Model 3', brand: 'Tesla', location: 'Phoenix', pricePerDay: 65.00, carType: 'Electric', description: 'Electric vehicle with autopilot', seatingCapacity: 5, availableCars: 7 }
  ],
  flights: [
    { id: 1, airline: 'American Airlines', flightNumber: 'AA101', origin: 'New York', destination: 'Los Angeles', departureTime: '2025-12-15T08:00:00Z', arrivalTime: '2025-12-15T11:30:00Z', price: 299.99, availableSeats: 150 },
    { id: 2, airline: 'Delta Airlines', flightNumber: 'DL202', origin: 'Chicago', destination: 'Miami', departureTime: '2025-12-20T14:00:00Z', arrivalTime: '2025-12-20T18:00:00Z', price: 189.99, availableSeats: 120 },
    { id: 3, airline: 'United Airlines', flightNumber: 'UA303', origin: 'Los Angeles', destination: 'Seattle', departureTime: '2025-12-18T09:00:00Z', arrivalTime: '2025-12-18T11:30:00Z', price: 159.99, availableSeats: 180 },
    { id: 4, airline: 'Southwest Airlines', flightNumber: 'SW404', origin: 'Dallas', destination: 'Las Vegas', departureTime: '2025-12-22T16:00:00Z', arrivalTime: '2025-12-22T17:30:00Z', price: 89.99, availableSeats: 200 }
  ],
  hotels: [
    { id: 1, name: 'Grand Plaza Hotel', location: 'New York', rating: 4.5, pricePerNight: 199.99, description: 'Luxury hotel in the heart of Manhattan', image: '/images/hotels/grand-plaza.jpg' },
    { id: 2, name: 'Sunset Beach Resort', location: 'Los Angeles', rating: 4.2, pricePerNight: 249.99, description: 'Beachfront resort with ocean views', image: '/images/hotels/sunset-beach.jpg' },
    { id: 3, name: 'Downtown Business Hotel', location: 'Chicago', rating: 4.0, pricePerNight: 179.99, description: 'Modern hotel perfect for business travelers', image: '/images/hotels/downtown-business.jpg' },
    { id: 4, name: 'Mountain View Lodge', location: 'Denver', rating: 4.3, pricePerNight: 159.99, description: 'Cozy lodge with mountain views', image: '/images/hotels/mountain-view.jpg' },
    { id: 5, name: 'City Center Inn', location: 'Miami', rating: 3.8, pricePerNight: 129.99, description: 'Affordable hotel in the city center', image: '/images/hotels/city-center.jpg' }
  ],
  bookings: [],
  payments: []
};
// Initialize database tables
const initializeDatabase = async () => {
  try {
    const connection = await pool.getConnection();

    // Create users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        password VARCHAR(255) NOT NULL,
        role ENUM('USER', 'ADMIN') DEFAULT 'USER',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create locations table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS locations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create cars table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS cars (
        id INT AUTO_INCREMENT PRIMARY KEY,
        model VARCHAR(255) NOT NULL,
        brand VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        price_per_day DECIMAL(10,2) NOT NULL,
        car_type VARCHAR(50) NOT NULL,
        description TEXT,
        seating_capacity INT NOT NULL,
        available_cars INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create flights table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS flights (
        id INT AUTO_INCREMENT PRIMARY KEY,
        airline VARCHAR(255) NOT NULL,
        flight_number VARCHAR(20) NOT NULL,
        origin VARCHAR(255) NOT NULL,
        destination VARCHAR(255) NOT NULL,
        departure_time DATETIME NOT NULL,
        arrival_time DATETIME NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        available_seats INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create hotels table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS hotels (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        rating DECIMAL(3,2),
        price_per_night DECIMAL(10,2) NOT NULL,
        description TEXT,
        image VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create bookings table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS bookings (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        type ENUM('CAR', 'FLIGHT', 'HOTEL') NOT NULL,
        item_id INT NOT NULL,
        num_persons INT DEFAULT 1,
        total_amount DECIMAL(10,2) NOT NULL,
        booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status ENUM('CONFIRMED', 'CANCELLED', 'PENDING') DEFAULT 'PENDING',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create payments table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS payments (
        id VARCHAR(36) PRIMARY KEY,
        booking_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status ENUM('SUCCESS', 'FAILED', 'PENDING') DEFAULT 'PENDING',
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Insert sample data
    await insertSampleData(connection);

    connection.release();
    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
  }
};

// Insert sample data
const insertSampleData = async (connection) => {
  try {
    // Insert locations
    const locations = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco'];
    for (const location of locations) {
      await connection.execute('INSERT IGNORE INTO locations (name) VALUES (?)', [location]);
    }

    // Insert sample cars
    const cars = [
      { model: 'Camry', brand: 'Toyota', location: 'New York', price_per_day: 45.00, car_type: 'Sedan', description: 'Comfortable sedan for city driving', seating_capacity: 5, available_cars: 10 },
      { model: 'Civic', brand: 'Honda', location: 'Los Angeles', price_per_day: 42.00, car_type: 'Sedan', description: 'Reliable and fuel-efficient', seating_capacity: 5, available_cars: 8 },
      { model: 'Mustang', brand: 'Ford', location: 'Chicago', price_per_day: 85.00, car_type: 'Sports', description: 'Powerful sports car', seating_capacity: 4, available_cars: 3 },
      { model: 'Explorer', brand: 'Ford', location: 'Houston', price_per_day: 75.00, car_type: 'SUV', description: 'Spacious family SUV', seating_capacity: 7, available_cars: 5 },
      { model: 'Accord', brand: 'Honda', location: 'Phoenix', price_per_day: 48.00, car_type: 'Sedan', description: 'Luxury sedan with advanced features', seating_capacity: 5, available_cars: 7 }
    ];

    for (const car of cars) {
      await connection.execute(`
        INSERT IGNORE INTO cars (model, brand, location, price_per_day, car_type, description, seating_capacity, available_cars)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [car.model, car.brand, car.location, car.price_per_day, car.car_type, car.description, car.seating_capacity, car.available_cars]);
    }

    // Insert sample flights
    const flights = [
      { airline: 'American Airlines', flight_number: 'AA101', origin: 'New York', destination: 'Los Angeles', departure_time: '2025-12-15 08:00:00', arrival_time: '2025-12-15 11:30:00', price: 299.99, available_seats: 150 },
      { airline: 'Delta Airlines', flight_number: 'DL202', origin: 'Chicago', destination: 'Miami', departure_time: '2025-12-20 14:00:00', arrival_time: '2025-12-20 18:00:00', price: 189.99, available_seats: 120 },
      { airline: 'United Airlines', flight_number: 'UA303', origin: 'Los Angeles', destination: 'Seattle', departure_time: '2025-12-18 09:00:00', arrival_time: '2025-12-18 11:30:00', price: 159.99, available_seats: 180 },
      { airline: 'Southwest Airlines', flight_number: 'SW404', origin: 'Dallas', destination: 'Las Vegas', departure_time: '2025-12-22 16:00:00', arrival_time: '2025-12-22 17:30:00', price: 89.99, available_seats: 200 }
    ];

    for (const flight of flights) {
      await connection.execute(`
        INSERT IGNORE INTO flights (airline, flight_number, origin, destination, departure_time, arrival_time, price, available_seats)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [flight.airline, flight.flight_number, flight.origin, flight.destination, flight.departure_time, flight.arrival_time, flight.price, flight.available_seats]);
    }

    // Insert sample hotels
    const hotels = [
      { name: 'Grand Plaza Hotel', location: 'New York', rating: 4.5, price_per_night: 199.99, description: 'Luxury hotel in the heart of Manhattan', image: '/images/hotels/grand-plaza.jpg' },
      { name: 'Sunset Beach Resort', location: 'Los Angeles', rating: 4.2, price_per_night: 249.99, description: 'Beachfront resort with ocean views', image: '/images/hotels/sunset-beach.jpg' },
      { name: 'Downtown Business Hotel', location: 'Chicago', rating: 4.0, price_per_night: 179.99, description: 'Modern hotel perfect for business travelers', image: '/images/hotels/downtown-business.jpg' },
      { name: 'Mountain View Lodge', location: 'Denver', rating: 4.3, price_per_night: 159.99, description: 'Cozy lodge with mountain views', image: '/images/hotels/mountain-view.jpg' },
      { name: 'City Center Inn', location: 'Miami', rating: 3.8, price_per_night: 129.99, description: 'Affordable hotel in the city center', image: '/images/hotels/city-center.jpg' }
    ];

    for (const hotel of hotels) {
      await connection.execute(`
        INSERT IGNORE INTO hotels (name, location, rating, price_per_night, description, image)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [hotel.name, hotel.location, hotel.rating, hotel.price_per_night, hotel.description, hotel.image]);
    }

    console.log('✅ Sample data inserted successfully');
  } catch (error) {
    console.error('❌ Failed to insert sample data:', error.message);
  }
};

// Test database connection
const testConnection = async () => {
  if (useInMemory) {
    console.log('📊 Using in-memory storage (MySQL not available)');
    return false;
  }

  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('⚠️  Falling back to in-memory storage');
    useInMemory = true;
    return false;
  }
};

// Generic query function that works with both database and in-memory storage
const query = async (table, operation, params = {}) => {
  if (useInMemory) {
    return memoryQuery(table, operation, params);
  } else {
    return databaseQuery(table, operation, params);
  }
};

// Database query function
const databaseQuery = async (table, operation, params) => {
  try {
    switch (operation) {
      case 'findAll':
        const [rows] = await pool.execute(`SELECT * FROM ${table} ORDER BY id`);
        return rows;

      case 'findById':
        const [rows2] = await pool.execute(`SELECT * FROM ${table} WHERE id = ?`, [params.id]);
        return rows2.length > 0 ? rows2[0] : null;

      case 'findWhere':
        let query = `SELECT * FROM ${table} WHERE 1=1`;
        let queryParams = [];
        Object.keys(params.where || {}).forEach(key => {
          query += ` AND ${key} = ?`;
          queryParams.push(params.where[key]);
        });
        if (params.like) {
          Object.keys(params.like).forEach(key => {
            query += ` AND ${key} LIKE ?`;
            queryParams.push(`%${params.like[key]}%`);
          });
        }
        if (params.orderBy) {
          query += ` ORDER BY ${params.orderBy}`;
        }
        const [rows3] = await pool.execute(query, queryParams);
        return rows3;

      case 'insert':
        const columns = Object.keys(params.data);
        const values = Object.values(params.data);
        const placeholders = columns.map(() => '?').join(', ');
        const [result] = await pool.execute(
          `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
          values
        );
        return { id: result.insertId, ...params.data };

      case 'update':
        const updateColumns = Object.keys(params.data);
        const updateValues = Object.values(params.data);
        const setClause = updateColumns.map(col => `${col} = ?`).join(', ');
        updateValues.push(params.id);
        await pool.execute(
          `UPDATE ${table} SET ${setClause} WHERE id = ?`,
          updateValues
        );
        return params.data;

      case 'delete':
        await pool.execute(`DELETE FROM ${table} WHERE id = ?`, [params.id]);
        return true;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  } catch (error) {
    console.error(`Database ${operation} error on ${table}:`, error);
    throw error;
  }
};

// In-memory query function
const memoryQuery = (table, operation, params) => {
  const data = memoryStorage[table];
  if (!data) throw new Error(`Table ${table} not found`);

  switch (operation) {
    case 'findAll':
      return [...data];

    case 'findById':
      return data.find(item => item.id == params.id) || null;

    case 'findWhere':
      let filtered = [...data];
      if (params.where) {
        Object.keys(params.where).forEach(key => {
          filtered = filtered.filter(item => item[key] == params.where[key]);
        });
      }
      if (params.like) {
        Object.keys(params.like).forEach(key => {
          filtered = filtered.filter(item =>
            item[key] && item[key].toLowerCase().includes(params.like[key].toLowerCase())
          );
        });
      }
      if (params.orderBy) {
        // Simple sorting - you can enhance this
        filtered.sort((a, b) => a[params.orderBy] > b[params.orderBy] ? 1 : -1);
      }
      return filtered;

    case 'insert':
      const newItem = { id: data.length + 1, ...params.data };
      data.push(newItem);
      return newItem;

    case 'update':
      const index = data.findIndex(item => item.id == params.id);
      if (index === -1) throw new Error('Item not found');
      data[index] = { ...data[index], ...params.data };
      return data[index];

    case 'delete':
      const deleteIndex = data.findIndex(item => item.id == params.id);
      if (deleteIndex === -1) throw new Error('Item not found');
      data.splice(deleteIndex, 1);
      return true;

    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
};

module.exports = {
  pool,
  testConnection,
  initializeDatabase,
  query
};
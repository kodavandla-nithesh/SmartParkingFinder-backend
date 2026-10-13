const mysql = require('mysql2/promise');

let pool;
let initializationPromise;

async function initializeDatabase() {
  const dbName = process.env.DB_NAME || 'smart_parking_finder';

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  await connection.end();

  pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: dbName,
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
    multipleStatements: true,
  });

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS parkings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      address VARCHAR(255) NOT NULL,
      city VARCHAR(100) NOT NULL,
      area VARCHAR(100) NOT NULL,
      latitude DECIMAL(9,6) NOT NULL,
      longitude DECIMAL(9,6) NOT NULL,
      total_slots INT NOT NULL,
      available_slots INT NOT NULL,
      price_per_hour DECIMAL(10,2) NOT NULL,
      parking_type ENUM('Open', 'Covered', 'EV', 'Valet') NOT NULL DEFAULT 'Open',
      vehicle_type VARCHAR(50) NOT NULL DEFAULT 'Car',
      description TEXT,
      is_demo_data BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  const [vehicleColumn] = await pool.query('SHOW COLUMNS FROM parkings LIKE ?', ['vehicle_type']);
  if (!vehicleColumn.length) {
    await pool.query('ALTER TABLE parkings ADD COLUMN vehicle_type VARCHAR(50) NOT NULL DEFAULT "Car"');
  }

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      booking_id VARCHAR(50) NOT NULL UNIQUE,
      user_id INT NOT NULL,
      parking_id INT NOT NULL,
      slot_id VARCHAR(100) DEFAULT 'demo-slot',
      booking_date DATE NOT NULL,
      start_time VARCHAR(10) NOT NULL,
      end_time VARCHAR(10) NOT NULL,
      start_time_minutes INT NOT NULL,
      end_time_minutes INT NOT NULL,
      duration_hours DECIMAL(4,2) NOT NULL,
      total_price DECIMAL(10,2) NOT NULL,
      status ENUM('confirmed', 'cancelled', 'completed') NOT NULL DEFAULT 'confirmed',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (parking_id) REFERENCES parkings(id) ON DELETE CASCADE
    )
  `);
}

async function connectDB() {
  if (pool) {
    return pool;
  }

  if (!initializationPromise) {
    initializationPromise = initializeDatabase().catch((error) => {
      initializationPromise = null;
      throw error;
    });
  }

  await initializationPromise;
  console.log('MySQL connected');
  return pool;
}

async function query(sql, params = []) {
  if (!pool) {
    await connectDB();
  }

  const [rows] = await pool.execute(sql, params);
  return rows;
}

function getPool() {
  return pool;
}

module.exports = { connectDB, query, getPool };

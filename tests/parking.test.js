const test = require('node:test');
const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');
const request = require('supertest');
const app = require('../app');
const { connectDB, query } = require('../config/db');

process.env.JWT_SECRET = 'test-secret';
process.env.DB_NAME = 'smart_parking_finder_test';

async function mysqlAvailable() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
    });
    await connection.ping();
    await connection.end();
    return true;
  } catch (error) {
    return false;
  }
}

test.before(async () => {
  if (!(await mysqlAvailable())) {
    return;
  }

  await connectDB();
  await query('DELETE FROM bookings');
  await query('DELETE FROM parkings');
  await query('DELETE FROM users');

  await query(
    'INSERT INTO parkings (name, address, city, area, latitude, longitude, total_slots, available_slots, price_per_hour, parking_type, vehicle_type, description, is_demo_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      'Dilsukhnagar Smart Lot',
      'Near Dilsukhnagar Bus Stand',
      'Hyderabad',
      'Dilsukhnagar',
      17.3687,
      78.5246,
      80,
      15,
      35,
      'Covered',
      'Car',
      'Demo parking.',
      true,
    ]
  );
});

test('returns parking locations based on search and filters', async (t) => {
  if (!(await mysqlAvailable())) {
    t.skip('MySQL is not available in this environment.');
    return;
  }

  const response = await request(app)
    .get('/api/parking')
    .query({ search: 'Dilsukhnagar', type: 'Covered', vehicleType: 'Car', sort: 'price' });

  assert.equal(response.status, 200);
  assert.ok(response.body.data.length >= 1);
  assert.equal(response.body.data[0].area, 'Dilsukhnagar');
  assert.equal(response.body.data[0].vehicleType, 'Car');
});

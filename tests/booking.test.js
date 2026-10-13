const test = require('node:test');
const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');
const request = require('supertest');
const app = require('../app');
const { connectDB, query } = require('../config/db');

process.env.JWT_SECRET = 'test-secret';
process.env.DB_NAME = 'smart_parking_finder_test';

let token;
let parkingId;

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

  const registerResponse = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Booking User', email: 'booking@example.com', password: 'Password123' });

  token = registerResponse.body.token;

  const parkingResult = await query(
    'INSERT INTO parkings (name, address, city, area, latitude, longitude, total_slots, available_slots, price_per_hour, parking_type, description, is_demo_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      'Booking Test Lot',
      'Sample Street',
      'Hyderabad',
      'HITEC City',
      17.4474,
      78.3772,
      1,
      1,
      40,
      'Covered',
      'Demo test lot',
      true,
    ]
  );

  parkingId = parkingResult.insertId;
});

test('rejects overlapping bookings for the same parking slot', async (t) => {
  if (!(await mysqlAvailable())) {
    t.skip('MySQL is not available in this environment.');
    return;
  }

  const bookingPayload = {
    parkingId,
    bookingDate: '2026-11-15',
    startTime: '10:00',
    endTime: '12:00',
    durationHours: 2,
  };

  const firstBooking = await request(app)
    .post('/api/bookings')
    .set('Authorization', `Bearer ${token}`)
    .send(bookingPayload);

  assert.equal(firstBooking.status, 201);

  const secondBooking = await request(app)
    .post('/api/bookings')
    .set('Authorization', `Bearer ${token}`)
    .send(bookingPayload);

  assert.equal(secondBooking.status, 409);
  assert.match(secondBooking.body.message, /No matching parking slots/i);
});

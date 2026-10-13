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
});

test('registers a new user', async (t) => {
  if (!(await mysqlAvailable())) {
    t.skip('MySQL is not available in this environment.');
    return;
  }

  const response = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Test User', email: 'test@example.com', password: 'Password123' });

  assert.equal(response.status, 201);
  assert.ok(response.body.token);
  assert.equal(response.body.user.email, 'test@example.com');
});

test('logs in an existing user', async (t) => {
  if (!(await mysqlAvailable())) {
    t.skip('MySQL is not available in this environment.');
    return;
  }

  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: 'test@example.com', password: 'Password123' });

  assert.equal(response.status, 200);
  assert.ok(response.body.token);
});

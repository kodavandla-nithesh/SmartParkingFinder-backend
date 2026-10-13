const { query } = require('../config/db');

const mapUser = (row) => {
  if (!row) return null;

  return {
    _id: row.id,
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

async function find(filter = {}) {
  const rows = await query('SELECT * FROM users');

  let results = rows;

  if (filter.id !== undefined) {
    results = results.filter((row) => row.id === Number(filter.id));
  }

  if (filter._id !== undefined) {
    results = results.filter((row) => row.id === Number(filter._id));
  }

  if (filter.email) {
    results = results.filter((row) => row.email === String(filter.email).toLowerCase());
  }

  return results.map(mapUser);
}

async function findOne(filter = {}) {
  const rows = await find(filter);
  return rows[0] || null;
}

async function findById(id) {
  return findOne({ id: Number(id) });
}

async function create(data) {
  const normalizedData = {
    name: String(data.name || '').trim(),
    email: String(data.email || '').trim().toLowerCase(),
    password: String(data.password || ''),
    role: data.role || 'user',
  };

  const result = await query(
    'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
    [normalizedData.name, normalizedData.email, normalizedData.password, normalizedData.role]
  );

  return findById(result.insertId);
}

async function countDocuments(filter = {}) {
  const rows = await find(filter);
  return rows.length;
}

module.exports = { find, findOne, findById, create, countDocuments };

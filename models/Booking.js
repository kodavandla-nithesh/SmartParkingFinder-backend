const { query } = require('../config/db');

const mapBooking = (row) => {
  if (!row) return null;

  return {
    _id: row.id,
    id: row.id,
    bookingId: row.booking_id,
    user: row.user_id,
    parking: row.parking_id,
    slotId: row.slot_id,
    bookingDate: row.booking_date,
    startTime: row.start_time,
    endTime: row.end_time,
    startTimeMinutes: Number(row.start_time_minutes),
    endTimeMinutes: Number(row.end_time_minutes),
    durationHours: Number(row.duration_hours),
    totalPrice: Number(row.total_price),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

async function find(filter = {}) {
  const rows = await query('SELECT * FROM bookings');

  let results = rows;

  if (filter.user !== undefined) {
    results = results.filter((row) => row.user_id === Number(filter.user));
  }

  if (filter.parking !== undefined) {
    results = results.filter((row) => row.parking_id === Number(filter.parking));
  }

  if (filter.bookingDate) {
    results = results.filter((row) => row.booking_date.toISOString ? row.booking_date.toISOString().slice(0, 10) === String(filter.bookingDate).slice(0, 10) : String(row.booking_date) === String(filter.bookingDate));
  }

  if (filter.status) {
    results = results.filter((row) => row.status === filter.status);
  }

  return results.map(mapBooking);
}

async function findById(id) {
  const rows = await query('SELECT * FROM bookings WHERE id = ?', [Number(id)]);
  return mapBooking(rows[0] || null);
}

async function create(data) {
  const result = await query(
    'INSERT INTO bookings (booking_id, user_id, parking_id, slot_id, booking_date, start_time, end_time, start_time_minutes, end_time_minutes, duration_hours, total_price, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      data.bookingId,
      Number(data.user),
      Number(data.parking),
      data.slotId || 'demo-slot',
      data.bookingDate,
      data.startTime,
      data.endTime,
      Number(data.startTimeMinutes),
      Number(data.endTimeMinutes),
      Number(data.durationHours),
      Number(data.totalPrice),
      data.status || 'confirmed',
    ]
  );

  return findById(result.insertId);
}

async function countDocuments(filter = {}) {
  const rows = await find(filter);
  return rows.length;
}

async function deleteMany(filter = {}) {
  if (filter.parking !== undefined) {
    const result = await query('DELETE FROM bookings WHERE parking_id = ?', [Number(filter.parking)]);
    return { deletedCount: result.affectedRows || 0 };
  }

  if (filter.user !== undefined) {
    const result = await query('DELETE FROM bookings WHERE user_id = ?', [Number(filter.user)]);
    return { deletedCount: result.affectedRows || 0 };
  }

  const result = await query('DELETE FROM bookings');
  return { deletedCount: result.affectedRows || 0 };
}

module.exports = { find, findById, create, countDocuments, deleteMany };

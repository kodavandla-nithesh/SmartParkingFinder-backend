const { query } = require('../config/db');

const mapParking = (row) => {
  if (!row) return null;

  return {
    _id: row.id,
    id: row.id,
    name: row.name,
    address: row.address,
    city: row.city,
    area: row.area,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    totalSlots: Number(row.total_slots),
    availableSlots: Number(row.available_slots),
    pricePerHour: Number(row.price_per_hour),
    parkingType: row.parking_type,
    vehicleType: row.vehicle_type || 'Car',
    description: row.description || '',
    isDemoData: Boolean(row.is_demo_data),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

async function find(filter = {}) {
  const rows = await query('SELECT * FROM parkings');

  let results = rows;

  if (filter.name) {
    results = results.filter((row) => row.name.toLowerCase().includes(String(filter.name).toLowerCase()));
  }

  if (filter.address) {
    results = results.filter((row) => row.address.toLowerCase().includes(String(filter.address).toLowerCase()));
  }

  if (filter.city) {
    results = results.filter((row) => row.city.toLowerCase().includes(String(filter.city).toLowerCase()));
  }

  if (filter.area) {
    results = results.filter((row) => row.area.toLowerCase().includes(String(filter.area).toLowerCase()));
  }

  if (filter.parkingType) {
    results = results.filter((row) => row.parking_type === filter.parkingType);
  }

  if (filter.vehicleType) {
    const vehicleType = String(filter.vehicleType).trim();
    if (vehicleType !== 'all') {
      results = results.filter((row) => String(row.vehicle_type || 'Car') === vehicleType);
    }
  }

  if (filter.availableSlots !== undefined) {
    const value = Number(filter.availableSlots);
    if (value > 0) {
      results = results.filter((row) => Number(row.available_slots) > 0);
    }
  }

  if (filter.$or) {
    const regexList = filter.$or;
    results = results.filter((row) =>
      regexList.some((criterion) => {
        const field = Object.keys(criterion)[0];
        const value = criterion[field];
        const cell = String(row[field === 'name' ? 'name' : field === 'address' ? 'address' : field === 'city' ? 'city' : 'area'] || '').toLowerCase();
        return cell.includes(String(value).toLowerCase());
      })
    );
  }

  return results.map(mapParking);
}

async function findById(id) {
  const rows = await query('SELECT * FROM parkings WHERE id = ?', [Number(id)]);
  return mapParking(rows[0] || null);
}

async function findOne(filter = {}) {
  const rows = await find(filter);
  return rows[0] || null;
}

async function create(data) {
  const result = await query(
    'INSERT INTO parkings (name, address, city, area, latitude, longitude, total_slots, available_slots, price_per_hour, parking_type, vehicle_type, description, is_demo_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      String(data.name || '').trim(),
      String(data.address || '').trim(),
      String(data.city || '').trim(),
      String(data.area || '').trim(),
      Number(data.latitude),
      Number(data.longitude),
      Number(data.totalSlots),
      Number(data.availableSlots ?? data.totalSlots),
      Number(data.pricePerHour),
      data.parkingType || 'Open',
      data.vehicleType || 'Car',
      data.description || '',
      data.isDemoData === undefined ? true : Boolean(data.isDemoData),
    ]
  );

  return findById(result.insertId);
}

async function countDocuments(filter = {}) {
  const rows = await find(filter);
  return rows.length;
}

async function deleteOne(id) {
  const result = await query('DELETE FROM parkings WHERE id = ?', [Number(id)]);
  return { deletedCount: result.affectedRows || 0 };
}

module.exports = { find, findOne, findById, create, countDocuments, deleteOne };

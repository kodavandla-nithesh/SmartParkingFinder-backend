const Parking = require('../models/Parking');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { query } = require('../config/db');

exports.getDashboard = async (req, res) => {
  try {
    const parkingList = await Parking.find({});
    const bookingList = await Booking.find({});
    const usersList = await User.find({});

    const summary = {
      parkingLocations: parkingList.length,
      totalSlots: parkingList.reduce((sum, parking) => sum + Number(parking.totalSlots), 0),
      bookings: bookingList.length,
      users: usersList.length,
    };

    const recentBookings = await Promise.all(
      bookingList
        .slice(-10)
        .reverse()
        .map(async (booking) => ({
          ...booking,
          parking: await Parking.findById(booking.parking),
          user: await User.findById(booking.user),
        }))
    );

    res.status(200).json({
      summary,
      bookings: recentBookings,
      parking: parkingList,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to load admin dashboard.' });
  }
};

exports.createParking = async (req, res) => {
  try {
    const {
      name,
      address,
      city,
      area,
      latitude,
      longitude,
      totalSlots,
      pricePerHour,
      parkingType,
      vehicleType,
      description,
    } = req.body;

    if (!name || !address || !city || !area || !latitude || !longitude || !totalSlots || !pricePerHour) {
      return res.status(400).json({ message: 'Please provide all required parking details.' });
    }

    const parking = await Parking.create({
      name,
      address,
      city,
      area,
      latitude: Number(latitude),
      longitude: Number(longitude),
      totalSlots: Number(totalSlots),
      availableSlots: Number(totalSlots),
      pricePerHour: Number(pricePerHour),
      parkingType: parkingType || 'Open',
      vehicleType: vehicleType || 'Car',
      description: description || '',
      isDemoData: true,
    });

    res.status(201).json({ message: 'Parking location added successfully.', data: parking });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to create parking location.' });
  }
};

exports.updateParking = async (req, res) => {
  try {
    const parking = await Parking.findById(req.params.id);

    if (!parking) {
      return res.status(404).json({ message: 'Parking location not found.' });
    }

    const updates = {
      name: req.body.name ?? parking.name,
      address: req.body.address ?? parking.address,
      city: req.body.city ?? parking.city,
      area: req.body.area ?? parking.area,
      latitude: Number(req.body.latitude ?? parking.latitude),
      longitude: Number(req.body.longitude ?? parking.longitude),
      total_slots: Number(req.body.totalSlots ?? parking.totalSlots),
      price_per_hour: Number(req.body.pricePerHour ?? parking.pricePerHour),
      parking_type: req.body.parkingType ?? parking.parkingType,
      vehicle_type: req.body.vehicleType ?? parking.vehicleType,
      description: req.body.description ?? parking.description,
    };

    if (updates.total_slots < 0) {
      return res.status(400).json({ message: 'Total slots must be greater than zero.' });
    }

    const activeBookings = await Booking.find({ parking: parking._id || parking.id, status: 'confirmed' });
    updates.available_slots = Math.max(0, Number(updates.total_slots) - activeBookings.length);

    await query(
      `UPDATE parkings SET name = ?, address = ?, city = ?, area = ?, latitude = ?, longitude = ?, total_slots = ?, available_slots = ?, price_per_hour = ?, parking_type = ?, vehicle_type = ?, description = ? WHERE id = ?`,
      [
        updates.name,
        updates.address,
        updates.city,
        updates.area,
        updates.latitude,
        updates.longitude,
        updates.total_slots,
        updates.available_slots,
        updates.price_per_hour,
        updates.parking_type,
        updates.vehicle_type,
        updates.description,
        Number(req.params.id),
      ]
    );

    const updatedParking = await Parking.findById(req.params.id);
    res.status(200).json({ message: 'Parking location updated successfully.', data: updatedParking });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to update parking location.' });
  }
};

exports.deleteParking = async (req, res) => {
  try {
    const parking = await Parking.findById(req.params.id);

    if (!parking) {
      return res.status(404).json({ message: 'Parking location not found.' });
    }

    await Booking.deleteMany({ parking: Number(req.params.id) });
    await Parking.deleteOne(req.params.id);

    res.status(200).json({ message: 'Parking location deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to delete parking location.' });
  }
};

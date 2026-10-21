
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
      totalSlots: parkingList.reduce(
        (sum, parking) => sum + Number(parking.totalSlots || 0),
        0
      ),
      bookings: bookingList.length,
      users: usersList.length,
    };

    const recentBookings = await Promise.all(
      bookingList.slice(-10).reverse().map(async (booking) => {
        const parkingId = booking.parking ?? booking.parking_id;
        const userId = booking.user ?? booking.user_id;

        let parking = null;
        let user = null;

        if (parkingId != null) {
          parking = await Parking.findById(parkingId);
        }

        if (userId != null) {
          user = await User.findById(userId);
        }

        return {
          ...booking,
          parking,
          user,
        };
      })
    );

    return res.status(200).json({
      summary,
      bookings: recentBookings,
      parking: parkingList,
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return res.status(500).json({
      message: error.message || 'Unable to load admin dashboard.',
    });
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

    if (
      !name ||
      !address ||
      !city ||
      !area ||
      latitude == null ||
      longitude == null ||
      totalSlots == null ||
      pricePerHour == null
    ) {
      return res.status(400).json({
        message: 'Please provide all required parking details.',
      });
    }

    const slots = Number(totalSlots);
    const price = Number(pricePerHour);
    const lat = Number(latitude);
    const lng = Number(longitude);

    if (
      !Number.isFinite(slots) ||
      slots <= 0 ||
      !Number.isFinite(price) ||
      price < 0 ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return res.status(400).json({
        message: 'Enter valid coordinates, a positive slot count, and a valid price.',
      });
    }

    const parking = await Parking.create({
      name,
      address,
      city,
      area,
      latitude: lat,
      longitude: lng,
      totalSlots: slots,
      availableSlots: slots,
      pricePerHour: price,
      parkingType: parkingType || 'Open',
      vehicleType: vehicleType || 'Car',
      description: description || '',
      isDemoData: true,
    });

    return res.status(201).json({
      message: 'Parking location added successfully.',
      data: parking,
    });
  } catch (error) {
    console.error('Create parking error:', error);
    return res.status(500).json({
      message: error.message || 'Unable to create parking location.',
    });
  }
};

exports.updateParking = async (req, res) => {
  try {
    const parking = await Parking.findById(req.params.id);

    if (!parking) {
      return res.status(404).json({
        message: 'Parking location not found.',
      });
    }

    const totalSlots = Number(
      req.body.totalSlots ?? parking.totalSlots
    );

    const pricePerHour = Number(
      req.body.pricePerHour ?? parking.pricePerHour
    );

    if (
      !Number.isFinite(totalSlots) ||
      totalSlots <= 0 ||
      !Number.isFinite(pricePerHour) ||
      pricePerHour < 0
    ) {
      return res.status(400).json({
        message: 'Total slots must be positive and price cannot be negative.',
      });
    }

    const updates = {
      name: req.body.name ?? parking.name,
      address: req.body.address ?? parking.address,
      city: req.body.city ?? parking.city,
      area: req.body.area ?? parking.area,
      latitude: Number(req.body.latitude ?? parking.latitude),
      longitude: Number(req.body.longitude ?? parking.longitude),
      total_slots: totalSlots,
      price_per_hour: pricePerHour,
      parking_type: req.body.parkingType ?? parking.parkingType,
      vehicle_type: req.body.vehicleType ?? parking.vehicleType,
      description: req.body.description ?? parking.description,
    };

    const activeBookings = await Booking.find({
      parking: parking._id ?? parking.id,
      status: 'confirmed',
    });

    const availableSlots = Math.max(
      0,
      totalSlots - activeBookings.length
    );

    await query(
      `UPDATE parkings
       SET name = ?, address = ?, city = ?, area = ?,
           latitude = ?, longitude = ?, total_slots = ?,
           available_slots = ?, price_per_hour = ?,
           parking_type = ?, vehicle_type = ?, description = ?
       WHERE id = ?`,
      [
        updates.name,
        updates.address,
        updates.city,
        updates.area,
        updates.latitude,
        updates.longitude,
        updates.total_slots,
        availableSlots,
        updates.price_per_hour,
        updates.parking_type,
        updates.vehicle_type,
        updates.description,
        Number(req.params.id),
      ]
    );

    const updatedParking = await Parking.findById(req.params.id);

    return res.status(200).json({
      message: 'Parking location updated successfully.',
      data: updatedParking,
    });
  } catch (error) {
    console.error('Update parking error:', error);
    return res.status(500).json({
      message: error.message || 'Unable to update parking location.',
    });
  }
};

exports.deleteParking = async (req, res) => {
  try {
    const parking = await Parking.findById(req.params.id);

    if (!parking) {
      return res.status(404).json({
        message: 'Parking location not found.',
      });
    }

    await Booking.deleteMany({
      parking: Number(req.params.id),
    });

    await Parking.deleteOne(req.params.id);

    return res.status(200).json({
      message: 'Parking location deleted successfully.',
    });
  } catch (error) {
    console.error('Delete parking error:', error);
    return res.status(500).json({
      message: error.message || 'Unable to delete parking location.',
    });
  }
};

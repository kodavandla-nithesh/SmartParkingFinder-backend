const { randomUUID } = require('crypto');
const Booking = require('../models/Booking');
const Parking = require('../models/Parking');
const { query } = require('../config/db');

const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const syncParkingAvailability = async (parkingId) => {
  const parking = await Parking.findById(parkingId);

  if (!parking) return;

  const activeBookings = await Booking.find({ parking: parkingId, status: 'confirmed' });
  const availableSlots = Math.max(0, Number(parking.totalSlots) - activeBookings.length);

  await query('UPDATE parkings SET available_slots = ? WHERE id = ?', [availableSlots, Number(parkingId)]);
};

exports.createBooking = async (req, res) => {
  try {
    const { parkingId, bookingDate, startTime, endTime, durationHours, slotId } = req.body;

    if (!parkingId || !bookingDate || !startTime || !endTime) {
      return res.status(400).json({ message: 'Parking selection, date, and time are required.' });
    }

    const parking = await Parking.findById(parkingId);

    if (!parking) {
      return res.status(404).json({ message: 'Parking location not found.' });
    }

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    if (endMinutes <= startMinutes) {
      return res.status(400).json({ message: 'End time must be later than the start time.' });
    }

    const duration = Number(durationHours || (endMinutes - startMinutes) / 60);

    if (duration <= 0) {
      return res.status(400).json({ message: 'Booking duration must be greater than zero.' });
    }

    const dateObject = new Date(bookingDate);

    if (Number.isNaN(dateObject.getTime())) {
      return res.status(400).json({ message: 'Please provide a valid booking date.' });
    }

    const allBookings = await Booking.find({ parking: parkingId, status: 'confirmed' });
    const overlappingBookings = allBookings.filter((booking) => {
      const bookingDate = booking.bookingDate ? new Date(booking.bookingDate).toISOString().slice(0, 10) : '';
      return bookingDate === dateObject.toISOString().slice(0, 10) && Number(booking.startTimeMinutes) < endMinutes && Number(booking.endTimeMinutes) > startMinutes;
    });

    if (overlappingBookings.length >= Number(parking.totalSlots)) {
      return res.status(409).json({ message: 'No matching parking slots are available for the selected time.' });
    }

    const totalPrice = Number((Number(parking.pricePerHour) * duration).toFixed(2));
    const booking = await Booking.create({
      bookingId: `SPF-${randomUUID().slice(0, 8).toUpperCase()}`,
      user: req.user._id || req.user.id,
      parking: parkingId,
      slotId: slotId || `slot-${Date.now()}`,
      bookingDate: dateObject.toISOString().slice(0, 10),
      startTime,
      endTime,
      startTimeMinutes: startMinutes,
      endTimeMinutes: endMinutes,
      durationHours: duration,
      totalPrice,
      status: 'confirmed',
    });

    await syncParkingAvailability(parkingId);

    res.status(201).json({
      message: 'Booking confirmed successfully.',
      data: {
        ...booking,
        parking,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to create booking.' });
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id || req.user.id });

    const detailedBookings = await Promise.all(
      bookings
        .sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate))
        .map(async (booking) => ({
          ...booking,
          parking: await Parking.findById(booking.parking),
        }))
    );

    res.status(200).json({ count: detailedBookings.length, data: detailedBookings });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to fetch bookings.' });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    if (String(booking.user) !== String(req.user._id || req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You cannot cancel this booking.' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ message: 'This booking has already been cancelled.' });
    }

    await query('UPDATE bookings SET status = ? WHERE id = ?', ['cancelled', Number(req.params.id)]);
    await syncParkingAvailability(booking.parking);

    const updatedBooking = { ...booking, status: 'cancelled' };

    res.status(200).json({ message: 'Booking cancelled successfully.', data: updatedBooking });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to cancel booking.' });
  }
};

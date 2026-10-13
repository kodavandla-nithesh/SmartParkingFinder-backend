const express = require('express');
const { protect } = require('../middleware/auth');
const { createBooking, getMyBookings, cancelBooking } = require('../controllers/bookingController');

const router = express.Router();

router.use(protect);
router.post('/', createBooking);
router.get('/my', getMyBookings);
router.patch('/:id/cancel', cancelBooking);

module.exports = router;

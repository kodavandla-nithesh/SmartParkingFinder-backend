const express = require('express');
const { getParkings, getParkingById } = require('../controllers/parkingController');

const router = express.Router();

router.get('/', getParkings);
router.get('/:id', getParkingById);

module.exports = router;

const express = require('express');
const { protect, adminOnly } = require('../middleware/auth');
const { getDashboard, createParking, updateParking, deleteParking } = require('../controllers/adminController');

const router = express.Router();

router.use(protect, adminOnly);
router.get('/dashboard', getDashboard);
router.post('/parking', createParking);
router.put('/parking/:id', updateParking);
router.delete('/parking/:id', deleteParking);

module.exports = router;

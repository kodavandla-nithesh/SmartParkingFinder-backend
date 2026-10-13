require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectDB, query } = require('../config/db');
const User = require('../models/User');
const Parking = require('../models/Parking');

const sampleParkings = [
  { name: 'Dilsukhnagar Central Parking', address: 'Near Dilsukhnagar Bus Stand', city: 'Hyderabad', area: 'Dilsukhnagar', latitude: 17.3687, longitude: 78.5246, totalSlots: 120, availableSlots: 32, pricePerHour: 35, parkingType: 'Covered', vehicleType: 'Car', description: 'Demo parking facility near Dilsukhnagar main bus stand.' },
  { name: 'Ameerpet Metro Parking', address: 'Ameerpet Road', city: 'Hyderabad', area: 'Ameerpet', latitude: 17.4374, longitude: 78.4484, totalSlots: 95, availableSlots: 24, pricePerHour: 40, parkingType: 'Open', vehicleType: 'Car', description: 'Demo parking facility near Metro and commercial area.' },
  { name: 'HITEC City Smart Bay', address: 'Cyber Towers Road', city: 'Hyderabad', area: 'HITEC City', latitude: 17.4474, longitude: 78.3772, totalSlots: 180, availableSlots: 41, pricePerHour: 55, parkingType: 'Covered', vehicleType: 'Car', description: 'Demo parking for office commuters and visitors.' },
  { name: 'Gachibowli Green Plaza', address: 'Financial District Road', city: 'Hyderabad', area: 'Gachibowli', latitude: 17.4401, longitude: 78.3489, totalSlots: 150, availableSlots: 38, pricePerHour: 50, parkingType: 'EV', vehicleType: 'EV', description: 'Demo EV-friendly parking in a business district.' },
  { name: 'Secunderabad Station Parking', address: 'Station Road', city: 'Hyderabad', area: 'Secunderabad', latitude: 17.4399, longitude: 78.4983, totalSlots: 210, availableSlots: 58, pricePerHour: 45, parkingType: 'Open', vehicleType: 'Bike', description: 'Demo parking for commuters and station visitors.' },
  { name: 'Madhapur Tech Park Lot', address: 'Madhapur Main Road', city: 'Hyderabad', area: 'Madhapur', latitude: 17.4399, longitude: 78.3912, totalSlots: 140, availableSlots: 27, pricePerHour: 60, parkingType: 'Covered', vehicleType: 'Car', description: 'Demo lot for office visitors and tech park employees.' },
  { name: 'Kukatpally Center Parking', address: 'Kukatpally Banjara Hills Road', city: 'Hyderabad', area: 'Kukatpally', latitude: 17.4845, longitude: 78.4136, totalSlots: 130, availableSlots: 29, pricePerHour: 38, parkingType: 'Open', vehicleType: 'Bike', description: 'Demo parking for retail and residential zones.' },
  { name: 'Banjara Hills Premium Lot', address: 'Road No 12', city: 'Hyderabad', area: 'Banjara Hills', latitude: 17.4136, longitude: 78.4271, totalSlots: 100, availableSlots: 16, pricePerHour: 70, parkingType: 'Valet', vehicleType: 'Car', description: 'Demo premium parking for visitors and residents.' },
  { name: 'Begumpet Commercial Garage', address: 'Begumpet Airport Road', city: 'Hyderabad', area: 'Begumpet', latitude: 17.4473, longitude: 78.4679, totalSlots: 110, availableSlots: 22, pricePerHour: 52, parkingType: 'Covered', vehicleType: 'Truck', description: 'Demo parking close to commercial and medical institutions.' },
  { name: 'Nampally Market Parking', address: 'Nampally Cross Road', city: 'Hyderabad', area: 'Nampally', latitude: 17.3878, longitude: 78.4728, totalSlots: 90, availableSlots: 20, pricePerHour: 36, parkingType: 'Open', vehicleType: 'Car', description: 'Demo lot near market activity and transit access points.' },
  { name: 'Tarnaka Freight Bay', address: 'Railway Colony Road', city: 'Hyderabad', area: 'Tarnaka', latitude: 17.4281, longitude: 78.5311, totalSlots: 70, availableSlots: 14, pricePerHour: 48, parkingType: 'Open', vehicleType: 'Truck', description: 'Heavy vehicle parking for logistics and transport needs.' },
  { name: 'Miyapur EV Hub', address: 'Miyapur Main Road', city: 'Hyderabad', area: 'Miyapur', latitude: 17.4938, longitude: 78.3577, totalSlots: 80, availableSlots: 18, pricePerHour: 42, parkingType: 'EV', vehicleType: 'EV', description: 'Dedicated EV charging and parking zone near residential corridors.' },
];

async function seedData() {
  await connectDB();

  const existingUsers = await User.find({});
  if (existingUsers.length === 0) {
    await User.create({
      name: 'Admin User',
      email: 'admin@smartparking.com',
      password: await bcrypt.hash('Admin@123', 10),
      role: 'admin',
    });

    await User.create({
      name: 'Demo User',
      email: 'demo@smartparking.com',
      password: await bcrypt.hash('Demo@123', 10),
      role: 'user',
    });
  }

  const existingParkings = await Parking.countDocuments();
  const shouldResetDemoData = process.env.RESET_DEMO_DATA === 'true';

  if (existingParkings === 0 || shouldResetDemoData) {
    if (shouldResetDemoData) {
      await query('DELETE FROM bookings');
      await query('DELETE FROM parkings');
    }

    for (const item of sampleParkings) {
      await Parking.create({
        ...item,
        availableSlots: item.availableSlots,
        vehicleType: item.vehicleType || 'Car',
        isDemoData: true,
      });
    }
  }

  console.log('Seed data inserted successfully.');
  process.exit(0);
}

seedData().catch((error) => {
  console.error('Seed failed:', error.message);
  process.exit(1);
});

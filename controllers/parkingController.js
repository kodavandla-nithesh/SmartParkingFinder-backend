const Parking = require('../models/Parking');

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

exports.getParkings = async (req, res) => {
  try {
    const {
      search = '',
      minPrice = 0,
      maxPrice = 9999,
      type = 'all',
      vehicleType = 'all',
      availableOnly = 'false',
      sort = 'recommended',
      lat = 17.385,
      lng = 78.4867,
    } = req.query;

    const priceMin = Number(minPrice) || 0;
    const priceMax = Number(maxPrice) || 9999;

    let parkings = await Parking.find({});

    parkings = parkings.filter((parking) => {
      const matchesSearch = !search || [parking.name, parking.address, parking.city, parking.area, parking.vehicleType].some((text) =>
        String(text).toLowerCase().includes(String(search).toLowerCase())
      );
      const matchesType = type === 'all' || parking.parkingType === type;
      const matchesVehicle = vehicleType === 'all' || parking.vehicleType === vehicleType;
      const matchesPrice = Number(parking.pricePerHour) >= priceMin && Number(parking.pricePerHour) <= priceMax;
      const matchesAvailability = availableOnly !== 'true' || Number(parking.availableSlots) > 0;
      return matchesSearch && matchesType && matchesVehicle && matchesPrice && matchesAvailability;
    });

    parkings = parkings.map((parking) => {
      const distance = calculateDistanceKm(
        Number(lat),
        Number(lng),
        Number(parking.latitude),
        Number(parking.longitude)
      );

      return {
        ...parking,
        distance: Number(distance.toFixed(1)),
      };
    });

    if (sort === 'price') {
      parkings.sort((a, b) => a.pricePerHour - b.pricePerHour || b.availableSlots - a.availableSlots || a.distance - b.distance);
    } else if (sort === 'distance') {
      parkings.sort((a, b) => a.distance - b.distance || b.availableSlots - a.availableSlots || a.pricePerHour - b.pricePerHour);
    } else {
      parkings.sort((a, b) => Number(b.availableSlots) - Number(a.availableSlots) || a.distance - b.distance || a.pricePerHour - b.pricePerHour);
    }

    res.status(200).json({ count: parkings.length, data: parkings });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to fetch parking locations.' });
  }
};

exports.getParkingById = async (req, res) => {
  try {
    const parking = await Parking.findById(req.params.id);

    if (!parking) {
      return res.status(404).json({ message: 'Parking location not found.' });
    }

    res.status(200).json({ data: parking });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to fetch parking details.' });
  }
};

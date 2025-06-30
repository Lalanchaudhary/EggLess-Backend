const Admin = require('../models/admin');

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

// Find the nearest admin based on user location
async function findNearestAdmin(userLatitude, userLongitude) {
  try {
    // Get all active admins with location data
    const admins = await Admin.find({
      isActive: true,
      'location.latitude': { $exists: true, $ne: null },
      'location.longitude': { $exists: true, $ne: null }
    });

    if (admins.length === 0) {
      return null; // No admins with location data
    }

    let nearestAdmin = null;
    let shortestDistance = Infinity;

    for (const admin of admins) {
      const distance = calculateDistance(
        userLatitude,
        userLongitude,
        admin.location.latitude,
        admin.location.longitude
      );

      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearestAdmin = admin;
      }
    }

    return {
      admin: nearestAdmin,
      distance: shortestDistance
    };
  } catch (error) {
    console.error('Error finding nearest admin:', error);
    return null;
  }
}

module.exports = {
  calculateDistance,
  findNearestAdmin
}; 
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import RideCard from "../components/RideCard";
import { calculateDistance } from "../utils/distanceUtils";
import "../styles/Home.css";

// Same data and generation logic as before
const locations = [
  { name: "Hitech City", coords: { lat: 17.4474, lng: 78.3762 } },
  { name: "Gachibowli", coords: { lat: 17.4401, lng: 78.3498 } },
  { name: "Kondapur", coords: { lat: 17.4948, lng: 78.3996 } },
  { name: "Jubilee Hills", coords: { lat: 17.4335, lng: 78.4039 } },
  { name: "Banjara Hills", coords: { lat: 17.4162, lng: 78.4455 } },
  { name: "Secunderabad", coords: { lat: 17.4399, lng: 78.4983 } },
];
const AVG_SPEED_KMH = 40;
const PRICE_BASE = 25;
const PRICE_PER_KM = 15;

const generateRandomRide = () => {
  let fromIndex, toIndex;
  do {
    fromIndex = Math.floor(Math.random() * locations.length);
    toIndex = Math.floor(Math.random() * locations.length);
  } while (fromIndex === toIndex);
  const fromLocation = locations[fromIndex];
  const toLocation = locations[toIndex];
  const distance = calculateDistance(fromLocation.coords, toLocation.coords);
  const price = PRICE_BASE + distance * PRICE_PER_KM;
  const eta = (distance / AVG_SPEED_KMH) * 60;
  return {
    id: `R${Math.floor(1000 + Math.random() * 9000)}`,
    from: fromLocation.name,
    to: toLocation.name,
    price: parseFloat(price.toFixed(2)),
    userLocation: toLocation.coords,
    driverStartLocation: fromLocation.coords,
    distance: distance.toFixed(2),
    eta: Math.round(eta),
  };
};

const Home = () => {
  const [rides, setRides] = useState([]);

  useEffect(() => {
    const initialRides = Array.from({ length: 4 }, generateRandomRide);
    setRides(initialRides);
    const rideInterval = setInterval(() => {
      setRides((prevRides) => [...prevRides.slice(1), generateRandomRide()]);
    }, 8000);
    return () => clearInterval(rideInterval);
  }, []);

  return (
    //  --- NEW: Main wrapper to center the content on the page ---
    <div className="home-page-container">
      <div className="home-header">
        <h1 className="home-title">Available Rides</h1>
        <p className="home-subtitle">Showing a live feed of rides near you.</p>
      </div>
      <div className="rides-list">
        {rides.map((ride) => (
          <Link
            to={`/ride/${ride.id}`}
            key={ride.id}
            state={{ ride }}
            className="ride-link"
          >
            <RideCard ride={ride} />
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Home;

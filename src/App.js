import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./utils/leafletIconFix";

import Booking from "./pages/Booking";
import RideRequest from "./pages/RideRequest";
import Tracking from "./pages/Tracking";

const AppNavbar = () => {
  const location = useLocation();
  if (location.pathname.startsWith("/tracking")) return null;

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container-fluid">
        <Link className="navbar-brand" to="/">
          Booking
        </Link>
        <div className="navbar-nav">
          <Link className="nav-link" to="/">
            Book a Ride
          </Link>
          <Link className="nav-link" to="/request/RIDE-XYZ">
            passenger
          </Link>
        </div>
      </div>
    </nav>
  );
};

function App() {
  return (
    <Router>
      <AppNavbar />
      <div className="App">
        <Routes>
          <Route path="/" element={<Booking />} />
          <Route path="/request/:rideId" element={<RideRequest />} />
          <Route path="/tracking/:rideId" element={<Tracking />} />
          <Route path="/tracking" element={<Tracking />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

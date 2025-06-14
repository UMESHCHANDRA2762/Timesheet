import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/RideRequest.css";

// --- SVG Icons (Self-contained for simplicity) ---
const PinIcon = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
);
const RupeeIcon = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M6 3h12M6 8h12M4 13h16M7 13c0 4.418-3.134 8-7 8" />
    <path d="M7 8v1.333c0 2.946 2.012 5.334 4.5 5.334h.5a4.5 4.5 0 0 0 4.5-4.5V8" />
  </svg>
);
const SpinnerIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="spinner"
  >
    <line x1="12" y1="2" x2="12" y2="6"></line>
    <line x1="12" y1="18" x2="12" y2="22"></line>
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
    <line x1="2" y1="12" x2="6" y2="12"></line>
    <line x1="18" y1="12" x2="22" y2="12"></line>
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
  </svg>
);

const RideRequest = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  // Get ride data from the booking page navigation
  const { ride } = state || {};

  const [status, setStatus] = useState("pending");

  const handleAccept = () => {
    setStatus("accepted");
    // After a 2-second delay, navigate to the tracking page with ride data
    setTimeout(() => {
      navigate("/tracking", { state: { ride: ride } });
    }, 2000);
  };

  const handleReject = () => {
    setStatus("rejected");
    // After a 2-second delay, navigate back to the home/booking page
    setTimeout(() => {
      navigate("/");
    }, 2000);
  };

  // Show a loading state if the page is accessed without ride data
  if (!ride) {
    return (
      <div className="ride-request-page">
        <div className="ride-request-container">
          <div className="alert-card">
            <SpinnerIcon />
            <span style={{ marginLeft: "1rem" }}>Loading ride details...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ride-request-page">
      <div className="ride-request-container">
        <header className="request-header">
          <h3>New Ride Request</h3>
        </header>
        <main className="request-body">
          <div className="location-info">
            <div className="route-line">
              <PinIcon className="icon-pin" />
              <div className="dotted-line"></div>
              <PinIcon className="icon-pin destination" />
            </div>
            <div style={{ width: "100%" }}>
              <div className="location-text">
                <div className="label">Pickup</div>
                <div className="address">{ride.from}</div>
              </div>
              <hr
                style={{
                  margin: "1rem 0",
                  border: "none",
                  borderTop: "1px solid #e9ecef",
                }}
              />
              <div className="location-text">
                <div className="label">Destination</div>
                <div className="address">{ride.to}</div>
              </div>
            </div>
          </div>
          <div className="fare-details">
            <div className="fare-amount">
              <RupeeIcon className="icon-rupee" />
              {ride.price.toFixed(2)}
            </div>
          </div>
        </main>
        <footer className="action-footer">
          {status === "pending" && (
            <div className="action-grid">
              <button className="action-btn btn-reject" onClick={handleReject}>
                Reject
              </button>
              <button className="action-btn btn-accept" onClick={handleAccept}>
                Accept Ride
              </button>
            </div>
          )}
          {status === "accepted" && (
            <div className="status-feedback accepted">
              Ride Accepted! Preparing trip...
            </div>
          )}
          {status === "rejected" && (
            <div className="status-feedback rejected">Ride Rejected.</div>
          )}
        </footer>
      </div>
    </div>
  );
};

export default RideRequest;

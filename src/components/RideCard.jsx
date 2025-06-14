import React from "react";

const RideCard = ({ ride }) => {
  return (
    <div>
      <h5>
        {ride.from} → {ride.to}
      </h5>
      <p className="mb-0">
        Fare: <strong>₹{ride.price}</strong>
      </p>
    </div>
  );
};

export default RideCard;

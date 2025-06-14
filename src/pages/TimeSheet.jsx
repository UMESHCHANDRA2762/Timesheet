import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const TimeSheet = () => {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const savedHistory = JSON.parse(localStorage.getItem("rideHistory")) || [];
    // Display the most recent rides first
    setHistory(savedHistory.reverse());
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-4">Ride History</h1>
      {history.length === 0 ? (
        <p>You have no completed rides.</p>
      ) : (
        <div className="space-y-4">
          {history.map((ride, index) => (
            <div
              key={index}
              className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow"
            >
              <div className="flex justify-between items-center mb-2">
                <p className="font-bold text-lg">Ride ID: {ride.id}</p>
                <p className="text-sm text-gray-500">{ride.date}</p>
              </div>
              <div className="flex justify-between text-sm mb-4">
                <p>
                  Duration: <strong>{ride.duration}</strong>
                </p>
                <p>
                  Status:{" "}
                  <span className="text-green-500 font-semibold">
                    {ride.status}
                  </span>
                </p>
              </div>

              {/* --- NEW: Display the detailed timesheet for the ride --- */}
              {ride.timesheet && ride.timesheet.length > 0 && (
                <div>
                  <h4 className="font-bold mb-2 border-t pt-2">Journey Log:</h4>
                  <ul className="list-disc list-inside pl-2 space-y-1">
                    {ride.timesheet.map((entry, idx) => (
                      <li key={idx}>
                        <strong>{entry.time}:</strong> Reached{" "}
                        <em>{entry.location}</em>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <Link
        to="/"
        className="block mt-6 text-center text-blue-500 hover:underline"
      >
        Back to Home
      </Link>
    </div>
  );
};

export default TimeSheet;

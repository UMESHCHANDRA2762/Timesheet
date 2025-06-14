import React from "react";
import {
  MapPinIcon,
  StarIcon,
  UserCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/solid";
import { FaCarSide } from "react-icons/fa"; // Using react-icons for a car icon

// Enhanced MapMock Component
const MapMock = ({
  stage = "Accepted",
  startLocation = "Kondapur",
  endLocation = "Gachibowli",
  driver = { name: "Ravi Kumar", rating: 4.9 },
  vehicle = { model: "Maruti Swift Dzire", number: "TS 09 AB 1234" },
  eta = "12 mins",
  StartIcon = MapPinIcon, // Allow custom start icon
  EndIcon = StarIcon, // Allow custom end icon
}) => {
  // The progress mapping remains the same, a solid implementation
  const progressPercentage = {
    Accepted: 0,
    Started: 10,
    "In Transit": 50,
    Arrived: 90,
    Completed: 100,
  }[stage];

  return (
    // Main container with a slightly more refined look
    <div className="w-full p-4 sm:p-6 mt-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
      {/* 1. Dynamic Top Section with ETA */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white">
          {stage}
        </h3>
        <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/50 rounded-full">
          <ClockIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
            {eta} away
          </span>
        </div>
      </div>

      {/* 2. Enhanced Map Visualization */}
      <div className="relative w-full h-40">
        {/* Location Labels */}
        <div className="absolute top-0 left-0 text-sm font-medium text-gray-600 dark:text-gray-300">
          From: <span className="font-bold">{startLocation}</span>
        </div>
        <div className="absolute top-0 right-0 text-sm font-medium text-gray-600 dark:text-gray-300">
          To: <span className="font-bold">{endLocation}</span>
        </div>

        {/* The path and markers container */}
        <div className="absolute top-1/2 left-0 w-full -translate-y-1/2">
          {/* The gray background path */}
          <div className="w-full h-2 bg-gray-300 dark:bg-gray-600 rounded-full"></div>

          {/* 3. Animated Progress Bar */}
          <div
            className="absolute top-0 left-0 h-2 bg-gradient-to-r from-green-400 to-blue-500 dark:from-green-500 dark:to-blue-600 rounded-full transition-all duration-1000 ease-in-out"
            style={{ width: `${progressPercentage}%` }}
          ></div>

          {/* Start Pin with Custom Icon Prop */}
          <div className="absolute top-1/2 left-0 -translate-y-1/2">
            <StartIcon className="w-8 h-8 text-green-600 drop-shadow-md" />
          </div>

          {/* End Pin with Custom Icon Prop */}
          <div className="absolute top-1/2 right-0 -translate-x-1/2 -translate-y-1/2">
            <EndIcon className="w-8 h-8 text-yellow-500 drop-shadow-md" />
          </div>

          {/* 4. Improved Moving Vehicle Icon */}
          <div
            className="absolute top-1/2 transition-all duration-1000 ease-in-out"
            style={{ left: `calc(${progressPercentage}% - 16px)` }}
          >
            <div className="relative -translate-y-1/2">
              <FaCarSide className="w-8 h-8 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 p-1 rounded-full shadow-xl" />
              {/* Pulsing animation to indicate "live" status */}
              <span className="absolute top-0 left-0 w-full h-full bg-blue-500 rounded-full animate-ping -z-10 opacity-75"></span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Driver & Vehicle Information Card */}
      <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <UserCircleIcon className="w-14 h-14 text-gray-400 dark:text-gray-500" />
          <div className="flex-grow">
            <div className="flex justify-between items-center">
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {driver.name}
              </p>
              <div className="flex items-center gap-1">
                <StarIcon className="w-5 h-5 text-yellow-400" />
                <span className="font-bold text-gray-700 dark:text-gray-200">
                  {driver.rating}
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {vehicle.model}
            </p>
            <p className="mt-1 px-2 py-0.5 bg-gray-200 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-mono text-sm rounded-md inline-block">
              {vehicle.number}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapMock;

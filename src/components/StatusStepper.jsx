import React from "react";
import { CheckIcon } from "@heroicons/react/24/solid"; // Using solid icons

const StatusStepper = ({ stages, currentStageIndex }) => {
  return (
    <div className="w-full px-2 sm:px-4">
      <div className="flex items-center">
        {stages.map((stage, index) => {
          const isCompleted = index < currentStageIndex;
          const isActive = index === currentStageIndex;

          return (
            <React.Fragment key={stage}>
              {/* The Step Circle and Label */}
              <div className="flex flex-col items-center">
                <div
                  className={`
    w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-white // ✨ SMALLER CIRCLE
    transition-all duration-500
    ${isCompleted ? "bg-green-500" : ""}
    ${isActive ? "bg-blue-500 scale-110" : ""}
    ${!isCompleted && !isActive ? "bg-gray-400" : ""}
  `}
                >
                  {isCompleted ? (
                    <CheckIcon className="w-4 h-4" />
                  ) : (
                    /* Show number for non-completed */ <span className="text-xs font-bold">
                      {index + 1}
                    </span>
                  )}
                </div>
                <p
                  className={`
                    text-xs sm:text-sm text-center mt-2 font-semibold
                    transition-all duration-500
                    ${
                      isActive
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-500 dark:text-gray-400"
                    }
                  `}
                >
                  {stage}
                </p>
              </div>

              {/* The Connector Line (not shown after the last step) */}
              {index < stages.length - 1 && (
                <div
                  className={`
                    flex-1 h-1 mx-2 transition-all duration-500
                    ${isCompleted ? "bg-green-500" : "bg-gray-300"}
                  `}
                ></div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default StatusStepper;

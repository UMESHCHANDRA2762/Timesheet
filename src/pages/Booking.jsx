import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Form,
  Card,
  Button,
  ListGroup,
  Spinner,
  InputGroup,
  Alert,
} from "react-bootstrap";
import { calculateDistance } from "../utils/distanceUtils";
import "../styles/Booking.css";
import {
  X,
  RecordCircleFill,
  CheckCircleFill,
  GeoAltFill,
} from "react-bootstrap-icons";

const PRICE_BASE = 25;
const PRICE_PER_KM = 15;
// --- MODIFIED: Use Geoapify API ---
const GEOAPIFY_API_KEY = "03a175bc0c42441180e543cad39c5749"; // <-- Add your API key here
const GEOAPIFY_SEARCH_URL = "https://api.geoapify.com/v1/geocode/search";
const GEOAPIFY_REVERSE_URL = "https://api.geoapify.com/v1/geocode/reverse";
const DEBOUNCE_DELAY = 500;
const FETCH_TIMEOUT = 10000;

// Custom hook to handle location searching logic
const useLocationSearch = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  const searchLocation = useCallback(async (searchQuery, signal) => {
    if (searchQuery.length < 3) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);

    const cacheKey = `search_${searchQuery.toLowerCase()}`;
    const cachedResults = sessionStorage.getItem(cacheKey);
    if (cachedResults) {
      setResults(JSON.parse(cachedResults));
      setLoading(false);
      return;
    }

    // --- MODIFIED: Use Geoapify Search API ---
    const params = new URLSearchParams({
      text: searchQuery,
      apiKey: GEOAPIFY_API_KEY,
      filter: "countrycode:in",
      bias: "proximity:78.4867,17.3850", // Hyderabad for local results
    });

    const timeoutId = setTimeout(() => {
      if (signal && !signal.aborted) {
        abortControllerRef.current.abort();
        setError("Network request timed out.");
      }
    }, FETCH_TIMEOUT);

    try {
      const response = await fetch(
        `${GEOAPIFY_SEARCH_URL}?${params.toString()}`,
        { signal }
      );
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      // --- MODIFIED: Adapt to Geoapify response format ---
      if (data.features && data.features.length > 0) {
        const formattedResults = data.features.map((feature) => ({
          place_id: feature.properties.place_id,
          display_name: feature.properties.formatted,
          lat: feature.properties.lat,
          lon: feature.properties.lon,
        }));
        sessionStorage.setItem(cacheKey, JSON.stringify(formattedResults));
        setResults(formattedResults);
      } else {
        setError("No results found for your search.");
        setResults([]);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name !== "AbortError") setError("Could not fetch locations.");
    } finally {
      setLoading(false);
    }
  }, []);

  const triggerSearch = useCallback(
    (searchQuery) => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();
      searchLocation(searchQuery, abortControllerRef.current.signal);
    },
    [searchLocation]
  );

  const getCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      throw new Error("Geolocation not supported.");
    }
    setLoading(true);
    setError(null);
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: FETCH_TIMEOUT,
        });
      });

      const { latitude, longitude } = position.coords;
      // --- MODIFIED: Use Geoapify Reverse Geocoding API ---
      const url = `${GEOAPIFY_REVERSE_URL}?lat=${latitude}&lon=${longitude}&apiKey=${GEOAPIFY_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();

      // --- MODIFIED: Adapt to Geoapify response format ---
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        return {
          display_name: feature.properties.formatted,
          lat: feature.properties.lat,
          lon: feature.properties.lon,
        };
      } else {
        throw new Error("Could not determine address from coordinates.");
      }
    } catch (err) {
      setError(
        "Unable to retrieve your location. Please enable location services."
      );
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    query,
    setQuery,
    results,
    setResults,
    loading,
    error,
    triggerSearch,
    getCurrentLocation,
  };
};

const Booking = () => {
  // --- Component State and Hooks ---
  const [activeInput, setActiveInput] = useState(null);
  const [isBooking, setIsBooking] = useState(false);
  const [selectedPickup, setSelectedPickup] = useState(null);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [rideDetails, setRideDetails] = useState(null);
  const navigate = useNavigate();
  const pickupInputRef = useRef(null);
  const destinationInputRef = useRef(null);

  const pickupSearch = useLocationSearch();
  const destinationSearch = useLocationSearch();

  // --- useEffect Hooks ---

  // Debounced search for the pickup location
  useEffect(() => {
    // FIX: Only search if the query text does not match the already selected pickup location
    if (
      activeInput === "pickup" &&
      pickupSearch.query &&
      pickupSearch.query !== selectedPickup?.name
    ) {
      const handler = setTimeout(
        () => pickupSearch.triggerSearch(pickupSearch.query),
        DEBOUNCE_DELAY
      );
      return () => clearTimeout(handler);
    }
  }, [pickupSearch.query, activeInput, pickupSearch, selectedPickup]);

  // Debounced search for the destination location
  useEffect(() => {
    // FIX: Only search if the query text does not match the already selected destination
    if (
      activeInput === "destination" &&
      destinationSearch.query &&
      destinationSearch.query !== selectedDestination?.name
    ) {
      const handler = setTimeout(
        () => destinationSearch.triggerSearch(destinationSearch.query),
        DEBOUNCE_DELAY
      );
      return () => clearTimeout(handler);
    }
  }, [
    destinationSearch.query,
    activeInput,
    destinationSearch,
    selectedDestination,
  ]);

  // Calculate ride details when both locations are selected
  useEffect(() => {
    if (selectedPickup && selectedDestination) {
      const distance = calculateDistance(
        {
          lat: parseFloat(selectedPickup.lat),
          lng: parseFloat(selectedPickup.lon),
        },
        {
          lat: parseFloat(selectedDestination.lat),
          lng: parseFloat(selectedDestination.lon),
        }
      );
      const price = PRICE_BASE + distance * PRICE_PER_KM;
      setRideDetails({
        distance: distance.toFixed(2),
        price: price.toFixed(2),
      });
    } else {
      setRideDetails(null);
    }
  }, [selectedPickup, selectedDestination]);

  // --- Handler Functions ---

  const handleSelectLocation = (location, type) => {
    const locationName = location.display_name.split(",")[0] || location.name;
    if (type === "pickup") {
      setSelectedPickup({ ...location, name: locationName });
      pickupSearch.setQuery(locationName);
      pickupSearch.setResults([]);
      destinationInputRef.current?.focus();
    } else {
      setSelectedDestination({ ...location, name: locationName });
      destinationSearch.setQuery(locationName);
      destinationSearch.setResults([]);
      destinationInputRef.current?.blur();
    }
  };

  const handleClearSearch = (type) => {
    if (type === "pickup") {
      pickupSearch.setQuery("");
      pickupSearch.setResults([]);
      setSelectedPickup(null);
      pickupInputRef.current?.focus();
    } else {
      destinationSearch.setQuery("");
      destinationSearch.setResults([]);
      setSelectedDestination(null);
      destinationInputRef.current?.focus();
    }
  };

  const handleGetCurrentLocationClick = async () => {
    try {
      const locationData = await pickupSearch.getCurrentLocation();
      const locationName =
        locationData.display_name.split(",")[0] || "Current Location";
      setSelectedPickup({ ...locationData, name: locationName });
      pickupSearch.setQuery(locationName);
      pickupSearch.setResults([]);
      destinationInputRef.current?.focus();
    } catch (error) {
      console.error("Failed to get current location in component:", error);
    }
  };

  const handleBooking = () => {
    if (!rideDetails || !selectedPickup || !selectedDestination) return;
    setIsBooking(true);
    const newRide = {
      id: `R${Math.floor(1000 + Math.random() * 9000)}`,
      from: selectedPickup.name,
      to: selectedDestination.name,
      price: parseFloat(rideDetails.price),
      distance: rideDetails.distance,
      userLocation: {
        lat: parseFloat(selectedDestination.lat),
        lng: parseFloat(selectedDestination.lon),
      },
      driverStartLocation: {
        lat: parseFloat(selectedPickup.lat),
        lng: parseFloat(selectedPickup.lon),
      },
    };
    setTimeout(
      () => navigate(`/request/${newRide.id}`, { state: { ride: newRide } }),
      1500
    );
  };

  const renderResultsList = (search, type) => {
    if (search.loading && !search.results.length) return null;
    if (!search.query || search.results.length === 0) return null;

    return (
      <ListGroup
        className="results-list position-absolute w-100"
        style={{ zIndex: 1000 }}
      >
        {search.results.map((loc) => (
          <ListGroup.Item
            action
            key={loc.place_id}
            onClick={() => handleSelectLocation(loc, type)}
          >
            <strong>{loc.display_name.split(",")[0]}</strong>
            <br />
            <small className="text-muted">
              {loc.display_name.split(",").slice(1, 3).join(",")}
            </small>
          </ListGroup.Item>
        ))}
      </ListGroup>
    );
  };

  return (
    <Container className="booking-container">
      <div className="booking-hero">
        <h1 className="hero-title">Where to today?</h1>
        <p className="hero-subtitle">
          Book your ride in seconds. Reliable, fast, and at your fingertips.
        </p>
      </div>
      <Card className="booking-card">
        <Card.Body className="p-4">
          <div className="position-relative">
            <div className="route-connector"></div>
            <div className="d-flex align-items-center mb-4">
              {selectedPickup ? (
                <CheckCircleFill
                  size={20}
                  className="text-success flex-shrink-0"
                />
              ) : (
                <RecordCircleFill
                  size={20}
                  className="text-primary flex-shrink-0"
                />
              )}
              <div className="ms-3 w-100 position-relative">
                <InputGroup>
                  <Form.Control
                    ref={pickupInputRef}
                    type="text"
                    placeholder="Enter Pickup Location"
                    value={pickupSearch.query}
                    onChange={(e) => {
                      pickupSearch.setQuery(e.target.value);
                      setSelectedPickup(null);
                    }}
                    onFocus={() => setActiveInput("pickup")}
                    autoComplete="off"
                    disabled={isBooking}
                  />
                  {pickupSearch.query && (
                    <Button
                      variant="light"
                      onClick={() => handleClearSearch("pickup")}
                      className="d-flex align-items-center"
                    >
                      <X size={20} />
                    </Button>
                  )}
                  <Button
                    variant="light"
                    onClick={handleGetCurrentLocationClick}
                    disabled={pickupSearch.loading}
                    className="d-flex align-items-center"
                  >
                    {pickupSearch.loading && activeInput === "pickup" ? (
                      <Spinner size="sm" />
                    ) : (
                      <GeoAltFill />
                    )}
                  </Button>
                </InputGroup>
                {activeInput === "pickup" &&
                  renderResultsList(pickupSearch, "pickup")}
              </div>
            </div>
            <div className="d-flex align-items-center">
              {selectedDestination ? (
                <CheckCircleFill
                  size={20}
                  className="text-success flex-shrink-0"
                />
              ) : (
                <RecordCircleFill
                  size={20}
                  className="text-danger flex-shrink-0"
                />
              )}
              <div className="ms-3 w-100 position-relative">
                <InputGroup>
                  <Form.Control
                    ref={destinationInputRef}
                    type="text"
                    placeholder="Enter Destination"
                    value={destinationSearch.query}
                    onChange={(e) => {
                      destinationSearch.setQuery(e.target.value);
                      setSelectedDestination(null);
                    }}
                    onFocus={() => setActiveInput("destination")}
                    autoComplete="off"
                    disabled={isBooking}
                  />
                  {destinationSearch.query && (
                    <Button
                      variant="light"
                      onClick={() => handleClearSearch("destination")}
                      className="d-flex align-items-center"
                    >
                      <X size={20} />
                    </Button>
                  )}
                  {destinationSearch.loading &&
                    activeInput === "destination" && (
                      <InputGroup.Text>
                        <Spinner animation="border" size="sm" />
                      </InputGroup.Text>
                    )}
                </InputGroup>
                {activeInput === "destination" &&
                  renderResultsList(destinationSearch, "destination")}
              </div>
            </div>
          </div>
          {pickupSearch.error && activeInput === "pickup" && (
            <Alert variant="danger" className="mt-3 small">
              {pickupSearch.error}
            </Alert>
          )}
          {destinationSearch.error && activeInput === "destination" && (
            <Alert variant="danger" className="mt-3 small">
              {destinationSearch.error}
            </Alert>
          )}
          {rideDetails && (
            <Card className="estimate-card mt-4">
              <Card.Body className="text-center">
                <div className="d-flex justify-content-around align-items-center">
                  <div>
                    <div className="h5 fw-bold">{rideDetails.distance} km</div>
                    <div className="small text-muted">Distance</div>
                  </div>
                  <div className="h2 fw-bold">₹{rideDetails.price}</div>
                  <div>
                    <div className="h5 fw-bold">
                      {Math.round(parseFloat(rideDetails.distance) * 2.5)} min
                    </div>
                    <div className="small text-muted">Est. Time</div>
                  </div>
                </div>
                {isBooking ? (
                  <div className="d-flex justify-content-center align-items-center mt-3">
                    <Spinner size="sm" className="me-2" />{" "}
                    <span className="fw-bold">Looking for Captain...</span>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-100 mt-3 book-ride-btn"
                    onClick={handleBooking}
                  >
                    Book Ride
                  </Button>
                )}
              </Card.Body>
            </Card>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Booking;

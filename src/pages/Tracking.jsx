import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  Badge,
  ListGroup,
  Spinner,
  Button,
} from "react-bootstrap";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";

const SIMULATION_STEP_MS = 100;
const GEOCODING_INTERVAL_STEPS = 30;

const REQUEST_TIMEOUT = 10000;
const GEOAPIFY_API_KEY = "03a175bc0c42441180e543cad39c5749";
const GEOAPIFY_REVERSE_URL = "https://api.geoapify.com/v1/geocode/reverse";

const fetchWithRetry = async (
  url,
  options = {},
  retries = 3,
  backoff = 2000
) => {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.warn(
        `Attempt ${i + 1} failed. Retrying in ${backoff / 1000}s...`
      );
      if (i === retries - 1) throw error;
      await new Promise((res) => setTimeout(res, backoff));
      backoff *= 2;
    }
  }
};

const calculateBearing = (lat1, lng1, lat2, lng2) => {
  const dLng = lng2 - lng1;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
};

const getPlacename = async (lat, lng) => {
  const url = `${GEOAPIFY_REVERSE_URL}?lat=${lat}&lon=${lng}&apiKey=${GEOAPIFY_API_KEY}`;
  try {
    const data = await fetchWithRetry(url);
    return data?.features?.[0]?.properties?.formatted
      ? data.features[0].properties.formatted.split(",").slice(0, 3).join(",")
      : "Unknown Location";
  } catch (error) {
    console.error("Final error fetching placename:", error.name);
    return "API Request Failed";
  }
};

const MapEffect = ({ bounds, driverPosition }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [50, 50] });
  }, [map, bounds]);

  useEffect(() => {
    if (driverPosition)
      map.panTo([driverPosition.lat, driverPosition.lng], {
        animate: true,
        duration: 1.0,
      });
  }, [driverPosition, map]);
  return null;
};

const Tracking = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { ride } = state || {};

  const [route, setRoute] = useState([]);
  const [visibleRoute, setVisibleRoute] = useState([]);
  const [initialDistance, setInitialDistance] = useState(0);
  const [initialEta, setInitialEta] = useState(0);
  const [remainingDistance, setRemainingDistance] = useState("");
  const [remainingEta, setRemainingEta] = useState("");
  const [driverPosition, setDriverPosition] = useState(
    ride?.driverStartLocation
  );
  const [isTripOver, setIsTripOver] = useState(false);
  const [driverRotation, setDriverRotation] = useState(0);
  const [mapBounds, setMapBounds] = useState(null);
  const [liveTimeSheet, setLiveTimeSheet] = useState([]);
  const [currentPlacename, setCurrentPlacename] = useState(
    "Determining location..."
  );

  const stepRef = useRef(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    const fetchRouteAndData = async () => {
      if (!ride) return;
      setCurrentPlacename(ride.from);

      try {
        const routeUrl = `http://router.project-osrm.org/route/v1/driving/${ride.driverStartLocation.lng},${ride.driverStartLocation.lat};${ride.userLocation.lng},${ride.userLocation.lat}?overview=full&geometries=geojson`;
        const data = await fetchWithRetry(routeUrl);

        if (data && data.code === "Ok") {
          const routeData = data.routes[0];
          const coordinates = routeData.geometry.coordinates.map((c) => [
            c[1],
            c[0],
          ]);
          setRoute(coordinates);
          setVisibleRoute(coordinates);

          const distanceInKm = routeData.distance / 1000;
          const durationInMin = routeData.duration / 60;
          setInitialDistance(distanceInKm);
          setInitialEta(durationInMin);
          setRemainingDistance(distanceInKm.toFixed(2) + " km");
          setRemainingEta(Math.round(durationInMin) + " minutes");
          const bounds = L.latLngBounds(
            ride.driverStartLocation,
            ride.userLocation
          );
          setMapBounds(bounds);
        } else {
          console.error("Failed to fetch route from OSRM:", data);
          setCurrentPlacename("Could not fetch route");
        }
      } catch (error) {
        console.error("Error fetching route:", error);
        setCurrentPlacename("Could not fetch route");
      }
    };

    if (ride) {
      fetchRouteAndData();
    }
  }, [ride]);

  useEffect(() => {
    if (route.length === 0 || !ride || !initialEta) return;

    intervalRef.current = setInterval(() => {
      const currentStep = stepRef.current;
      if (currentStep >= route.length - 1) {
        clearInterval(intervalRef.current);
        setIsTripOver(true);
        return;
      }
      const currentPos = route[currentStep];
      setDriverPosition({ lat: currentPos[0], lng: currentPos[1] });

      if (route[currentStep + 1]) {
        const nextPos = route[currentStep + 1];
        setDriverRotation(
          calculateBearing(currentPos[0], currentPos[1], nextPos[0], nextPos[1])
        );
      }
      setVisibleRoute(route.slice(currentStep));

      const distanceToEnd =
        L.latLng(currentPos[0], currentPos[1]).distanceTo(
          L.latLng(ride.userLocation.lat, ride.userLocation.lng)
        ) / 1000;
      setRemainingDistance(distanceToEnd.toFixed(2) + " km");

      const speedKmM = initialDistance > 0 ? initialDistance / initialEta : 1;
      setRemainingEta(Math.round(distanceToEnd / speedKmM) + " minutes");

      if (currentStep > 0 && currentStep % GEOCODING_INTERVAL_STEPS === 0) {
        getPlacename(currentPos[0], currentPos[1]).then((placename) => {
          setCurrentPlacename(placename);
          const currentTime = new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          });
          setLiveTimeSheet((prev) => [
            ...prev,
            { location: placename, time: currentTime },
          ]);
        });
      }
      stepRef.current += 1;
    }, SIMULATION_STEP_MS);

    return () => clearInterval(intervalRef.current);
  }, [route, ride, initialDistance, initialEta]);

  if (!ride) {
    return (
      <Container className="p-5 text-center">
        <h1>Loading...</h1>
      </Container>
    );
  }

  const driverIcon = new L.DivIcon({
    html: `<img src="https://cdn-icons-png.flaticon.com/512/3774/3774269.png" style="transform: rotate(${driverRotation}deg); width: 42px; height: 42px;"/>`,
    className: "driver-icon",
    iconSize: [42, 42],
    iconAnchor: [21, 42],
  });

  return (
    <Container fluid className="p-3">
      <h1 className="text-center mb-4">Tracking Ride: {ride.id}</h1>
      <Row>
        <Col md={8}>
          <MapContainer
            center={ride.driverStartLocation}
            zoom={14}
            style={{ height: "80vh" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={[ride.userLocation.lat, ride.userLocation.lng]}>
              <Popup>Your Location</Popup>
            </Marker>
            {driverPosition && (
              <Marker
                position={[driverPosition.lat, driverPosition.lng]}
                icon={driverIcon}
              >
                <Popup>Driver's Live Location</Popup>
              </Marker>
            )}
            {visibleRoute.length > 0 && (
              <Polyline
                pathOptions={{ color: "blue", weight: 5 }}
                positions={visibleRoute}
              />
            )}
            <MapEffect bounds={mapBounds} driverPosition={driverPosition} />
          </MapContainer>
        </Col>
        <Col md={4}>
          <Card className="mb-3">
            <Card.Header as="h5">Trip Details</Card.Header>
            <Card.Body>
              <Card.Text>
                <strong>Status:</strong>{" "}
                <Badge bg={isTripOver ? "primary" : "success"}>
                  {isTripOver ? "Arrived" : "In Transit"}
                </Badge>
              </Card.Text>
              <hr />
              <Card.Text>
                <strong>Current Location:</strong>
                <br />
                {currentPlacename.includes("Failed") ? (
                  <span className="text-danger fw-bold">
                    {currentPlacename}
                  </span>
                ) : (
                  currentPlacename || <Spinner size="sm" />
                )}
              </Card.Text>
              <Card.Text>
                <strong>ETA:</strong> {remainingEta}
              </Card.Text>
              <Card.Text>
                <strong>Distance Remaining:</strong> {remainingDistance}
              </Card.Text>
              <hr />
              <Card.Text className="h4">
                <strong>Fare:</strong> ₹{ride.price.toFixed(2)}
              </Card.Text>
            </Card.Body>
          </Card>
          <Card>
            <Card.Header as="h5">Live Timesheet</Card.Header>
            <ListGroup variant="flush">
              {liveTimeSheet.length > 0 ? (
                liveTimeSheet.map((entry, index) => (
                  <ListGroup.Item key={index}>
                    <strong>{entry.time}:</strong> Reached{" "}
                    {entry.location.includes("Failed") ? (
                      <span className="text-danger fw-bold">
                        {entry.location}
                      </span>
                    ) : (
                      entry.location
                    )}
                  </ListGroup.Item>
                ))
              ) : (
                <ListGroup.Item>Journey log will appear here...</ListGroup.Item>
              )}
            </ListGroup>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Tracking;

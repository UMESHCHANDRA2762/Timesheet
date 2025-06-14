import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
    Container,
    Row,
    Col,
    Card,
    Badge,
    ListGroup,
    Spinner,
    Alert,
    Placeholder,
} from "react-bootstrap";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// --- Custom CSS for enhancements ---
const customStyles = `
  .map-container-wrapper {
    height: 85vh;
    border-radius: 0.5rem;
    overflow: hidden;
    box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.1);
  }

  .timeline {
    list-style: none;
    padding: 0;
  }
  .timeline-item {
    position: relative;
    padding-bottom: 1.5rem;
    padding-left: 30px;
    border-left: 2px solid #e9ecef;
  }
  .timeline-item:last-child {
    border-left: 2px solid transparent;
  }
  .timeline-dot {
    position: absolute;
    left: -9px;
    top: 0;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background-color: #0d6efd;
    border: 2px solid #fff;
  }
`;

// --- Constants ---
const SIMULATION_STEP_MS = 1000;
const GEOCODING_INTERVAL_STEPS = 45;
const REQUEST_TIMEOUT = 5000;

// --- Helper Functions ---

const fetchWithRetry = async (url, options = {}, retries = 3, backoff = 2000) => {
    for (let i = 0; i < retries; i++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
            const response = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.warn(`Attempt ${i + 1} failed. Retrying...`);
            if (i === retries - 1) throw error;
            await new Promise((res) => setTimeout(res, backoff));
            backoff *= 2;
        }
    }
};

const calculateBearing = (lat1, lng1, lat2, lng2) => {
    const dLng = lng2 - lng1;
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    let brng = (Math.atan2(y, x) * 180) / Math.PI;
    return (brng + 360) % 360;
};

const getPlacename = async (lat, lng) => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    try {
        const data = await fetchWithRetry(url);
        return data?.display_name ? data.display_name.split(",").slice(0, 2).join(", ") : "Unknown Location";
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
        if (driverPosition) map.panTo([driverPosition.lat, driverPosition.lng], { animate: true, duration: 1.0 });
    }, [driverPosition, map]);
    return null;
};

// --- Main Tracking Component ---

const Tracking = () => {
    const { state } = useLocation();
    const { ride } = state || {};

    // State Hooks
    const [route, setRoute] = useState([]);
    const [visibleRoute, setVisibleRoute] = useState([]);
    const [initialDistance, setInitialDistance] = useState(0);
    const [initialEta, setInitialEta] = useState(0);
    const [remainingDistance, setRemainingDistance] = useState("");
    const [remainingEta, setRemainingEta] = useState("");
    const [driverPosition, setDriverPosition] = useState(ride?.driverStartLocation);
    const [isTripOver, setIsTripOver] = useState(false);
    const [driverRotation, setDriverRotation] = useState(0);
    const [mapBounds, setMapBounds] = useState(null);
    const [liveTimeSheet, setLiveTimeSheet] = useState([]);
    const [currentPlacename, setCurrentPlacename] = useState("Determining location...");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const stepRef = useRef(0);
    const intervalRef = useRef(null);

    // Initial Data Fetching
    useEffect(() => {
        const fetchRouteAndData = async () => {
            if (!ride) {
                setError("No ride data found. Please go back and select a new ride.");
                setIsLoading(false);
                return;
            }

            setCurrentPlacename(ride.from || 'Start Location');

            try {
                const routeUrl = `http://router.project-osrm.org/route/v1/driving/${ride.driverStartLocation.lng},${ride.driverStartLocation.lat};${ride.userLocation.lng},${ride.userLocation.lat}?overview=full&geometries=geojson`;
                const data = await fetchWithRetry(routeUrl);
                if (data.code === "Ok") {
                    const routeData = data.routes[0];
                    const coordinates = routeData.geometry.coordinates.map((c) => [c[1], c[0]]);
                    setRoute(coordinates); setVisibleRoute(coordinates);
                    const distanceInKm = routeData.distance / 1000;
                    const durationInMin = routeData.duration / 60;
                    setInitialDistance(distanceInKm); setInitialEta(durationInMin);
                    setRemainingDistance(`${distanceInKm.toFixed(2)} km`);
                    setRemainingEta(`${Math.round(durationInMin)} minutes`);
                    const bounds = L.latLngBounds(ride.driverStartLocation, ride.userLocation);
                    setMapBounds(bounds);
                } else {
                    throw new Error("Could not fetch route from OSRM.");
                }
            } catch (err) {
                setError("Could not fetch the ride route. Please try again later.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchRouteAndData();
    }, [ride]);

    // Simulation Interval
    useEffect(() => {
        if (isLoading || route.length === 0 || !ride || !initialEta || isTripOver) return;

        intervalRef.current = setInterval(() => {
            const currentStep = stepRef.current;
            if (currentStep >= route.length - 1) {
                clearInterval(intervalRef.current);
                setIsTripOver(true);
                setDriverPosition({ lat: ride.userLocation.lat, lng: ride.userLocation.lng });
                setRemainingDistance("0 km"); setRemainingEta("Arrived");
                setCurrentPlacename(ride.to || "Destination");
                return;
            }

            const currentPos = route[currentStep];
            setDriverPosition({ lat: currentPos[0], lng: currentPos[1] });

            if (route[currentStep + 1]) {
                const nextPos = route[currentStep + 1];
                setDriverRotation(calculateBearing(currentPos[0], currentPos[1], nextPos[0], nextPos[1]));
            }
            setVisibleRoute(route.slice(currentStep));

            const distanceToEnd = L.latLng(currentPos[0], currentPos[1]).distanceTo(L.latLng(ride.userLocation.lat, ride.userLocation.lng)) / 1000;
            setRemainingDistance(`${distanceToEnd.toFixed(2)} km`);

            const speedKmM = initialDistance > 0 ? initialDistance / initialEta : 1;
            setRemainingEta(`${Math.round(distanceToEnd / speedKmM)} minutes`);

            if (currentStep > 0 && currentStep % GEOCODING_INTERVAL_STEPS === 0) {
                getPlacename(currentPos[0], currentPos[1]).then((placename) => {
                    setCurrentPlacename(placename);
                    const currentTime = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
                    setLiveTimeSheet((prev) => [...prev, { location: placename, time: currentTime }]);
                });
            }
            stepRef.current += 1;
        }, SIMULATION_STEP_MS);

        return () => clearInterval(intervalRef.current);
    }, [route, ride, initialDistance, initialEta, isLoading, isTripOver]);

    // --- Icons ---
    const driverIcon = new L.DivIcon({
        html: `<div style="transform: rotate(${driverRotation}deg);"><svg fill="#0d6efd" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12,2A10,10,0,1,0,22,12,10,10,0,0,0,12,2Zm0,18a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z" opacity=".4"/><path d="M12,7a.99991.99991,0,0,0-1,1V12a1,1,0,0,0,2,0V8A.99991.99991,0,0,0,12,7Z"/><path d="M12,14a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V15A1,1,0,0,0,12,14Z"/></svg></div>`,
        className: 'driver-icon',
        iconSize: [42, 42],
        iconAnchor: [21, 42],
    });
    const userIcon = new L.Icon({
        iconUrl: 'https://api.geoapify.com/v1/icon/?type=material&color=%23ff0000&size=large&icon=person&apiKey=YOUR_API_KEY', // A generic, clean user icon
        iconSize: [38, 58],
        iconAnchor: [19, 58],
    });


    if (error) {
        return <Container className="p-5"><Alert variant="danger"><h4>An Error Occurred</h4><p>{error}</p></Alert></Container>;
    }

    return (
        <>
            <style>{customStyles}</style>
            <Container fluid className="p-3 p-md-4 bg-light">
                <header className="text-center mb-4">
                    <h1 className="fw-bold">Track Your Ride</h1>
                    <p className="text-muted">Live updates for ride ID: {ride?.id || 'N/A'}</p>
                </header>
                <Row>
                    <Col md={12} lg={8} className="mb-4 mb-lg-0">
                        <div className="map-container-wrapper">
                            {isLoading ? (
                                <div className="d-flex justify-content-center align-items-center h-100">
                                    <Spinner animation="border" variant="primary" role="status">
                                        <span className="visually-hidden">Loading Map...</span>
                                    </Spinner>
                                </div>
                            ) : (
                                <MapContainer center={ride.driverStartLocation} zoom={14} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
                                    <Marker position={[ride.userLocation.lat, ride.userLocation.lng]} icon={userIcon}>
                                        <Popup>Your Location</Popup>
                                    </Marker>
                                    {driverPosition && <Marker position={[driverPosition.lat, driverPosition.lng]} icon={driverIcon}><Popup>Driver's Live Location</Popup></Marker>}
                                    {visibleRoute.length > 0 && <Polyline pathOptions={{ color: "#0d6efd", weight: 5 }} positions={visibleRoute} />}
                                    <MapEffect bounds={mapBounds} driverPosition={driverPosition} />
                                </MapContainer>
                            )}
                        </div>
                    </Col>
                    <Col md={12} lg={4}>
                        <Card className="shadow-sm mb-4">
                            <Card.Header as="h5" className="fw-bold bg-white">Trip Details</Card.Header>
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <Card.Text as="div" className="mb-0"><strong>Status:</strong></Card.Text>
                                    <Badge pill bg={isTripOver ? "primary" : "success"} className="fs-6">{isLoading ? 'Loading...' : (isTripOver ? "Arrived" : "In Transit")}</Badge>
                                </div>
                                <Card.Text><strong>Current Location:</strong><br/>
                                    {isLoading ? <Placeholder xs={8} /> : <span className="text-muted">{currentPlacename}</span>}
                                </Card.Text>
                                <Card.Text><strong>ETA:</strong>{' '}
                                    {isLoading ? <Placeholder xs={4} /> : remainingEta}
                                </Card.Text>
                                <Card.Text><strong>Distance Remaining:</strong>{' '}
                                    {isLoading ? <Placeholder xs={5} /> : remainingDistance}
                                </Card.Text>
                                <hr />
                                <div className="text-end">
                                    <small className="text-muted">Total Fare</small>
                                    <Card.Title className="h2 fw-bolder text-primary mb-0">
                                        ₹{isLoading ? <Placeholder xs={3} /> : ride.price.toFixed(2)}
                                    </Card.Title>
                                </div>
                            </Card.Body>
                        </Card>
                        <Card className="shadow-sm">
                            <Card.Header as="h5" className="fw-bold bg-white">Live Timesheet</Card.Header>
                            <Card.Body style={{ maxHeight: '40vh', overflowY: 'auto' }}>
                                {isLoading ? (
                                    <Placeholder as="div" animation="glow">
                                        <Placeholder xs={12} size="lg" /><Placeholder xs={10} /><Placeholder xs={12} size="lg" />
                                    </Placeholder>
                                ) : (
                                    <ul className="timeline">
                                        {liveTimeSheet.length > 0 ? (
                                            liveTimeSheet.map((entry, index) => (
                                                <li key={index} className="timeline-item">
                                                    <div className="timeline-dot"></div>
                                                    <div className="fw-bold">{entry.time}</div>
                                                    <div className="text-muted">
                                                        Reached {entry.location.includes("Failed") ? <span className="text-danger">{entry.location}</span> : entry.location}
                                                    </div>
                                                </li>
                                            ))
                                        ) : (
                                            <p className="text-center text-muted mt-2">Journey log will appear here...</p>
                                        )}
                                    </ul>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </>
    );
};

export default Tracking;
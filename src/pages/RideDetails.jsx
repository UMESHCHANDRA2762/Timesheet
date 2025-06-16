import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Container, Card, Button } from "react-bootstrap";
import { availableRides } from "./Home";

const RideDetails = () => {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const ride = availableRides.find((r) => r.id === rideId);

  if (!ride) return <div className="text-center mt-5">Ride not found!</div>;

  const handleAccept = () => {
    navigate(`/tracking/${ride.id}`, { state: { ride } });
  };

  return (
    <Container className="mt-5">
      <Card>
        <Card.Header as="h4">Ride Details</Card.Header>
        <Card.Body>
          <Card.Title>
            {ride.from} to {ride.to}
          </Card.Title>
          <Card.Text>
            A ride request is available. Please review the details below.
          </Card.Text>
          <h3 className="my-3">Fare: ₹{ride.price}</h3>
          <Button
            variant="success"
            size="lg"
            className="w-100"
            onClick={handleAccept}
          >
            Accept Ride
          </Button>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default RideDetails;

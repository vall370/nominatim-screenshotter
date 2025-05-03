import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import './App.css';

// Default coordinates (e.g., London)
const DEFAULT_LAT = 51.505;
const DEFAULT_LON = -0.09;
const DEFAULT_ZOOM = 13;

interface MapUpdaterProps {
  lat: number;
  lon: number;
  zoom: number;
}

// Helper component to update map view when props change
function MapUpdater({ lat, lon, zoom }: MapUpdaterProps) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lon], zoom);
  }, [lat, lon, zoom, map]);
  return null;
}

function App() {
  const [lat, setLat] = useState(DEFAULT_LAT);
  const [lon, setLon] = useState(DEFAULT_LON);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  useEffect(() => {
    // Read query parameters on component mount
    const queryParams = new URLSearchParams(window.location.search);
    const queryLat = queryParams.get('lat');
    const queryLon = queryParams.get('lon');
    const queryZoom = queryParams.get('zoom');

    // Use query params if valid numbers, otherwise use defaults
    if (queryLat && !isNaN(parseFloat(queryLat))) {
      setLat(parseFloat(queryLat));
    }
    if (queryLon && !isNaN(parseFloat(queryLon))) {
      setLon(parseFloat(queryLon));
    }
    if (queryZoom && !isNaN(parseInt(queryZoom, 10))) {
      setZoom(parseInt(queryZoom, 10));
    }
  }, []); // Empty dependency array means this runs once on mount

  return (
    <div className="map-container"> {/* Add a class for styling */}
      <MapContainer center={[lat, lon]} zoom={zoom} scrollWheelZoom={true} zoomControl={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lon]} />
        <MapUpdater lat={lat} lon={lon} zoom={zoom} />
      </MapContainer>
    </div>
  );
}

export default App;

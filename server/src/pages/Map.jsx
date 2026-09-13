import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import PageDoodles from "../components/PageDoodles";
import { getItems, imageUrl } from "../lib/api";

// A simple ink-drop pin, on-brand instead of Leaflet's default blue marker
// (which also needs asset-path workarounds under Vite - this sidesteps that).
const pinIcon = L.divIcon({
  className: "map-pin",
  html: '<span class="map-pin-dot"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -10],
});

const WORLD_CENTER = [20, 0];
const WORLD_ZOOM = 2;

export default function Map() {
  const [items, setItems] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    getItems()
      .then(setItems)
      .catch((err) => setErrorMessage(err.message));
  }, []);

  const located = useMemo(
    () => (items || []).filter((item) => item.latitude != null && item.longitude != null),
    [items]
  );

  const center = located.length
    ? [located[0].latitude, located[0].longitude]
    : WORLD_CENTER;
  const zoom = located.length ? (located.length === 1 ? 10 : 4) : WORLD_ZOOM;

  return (
    <main className="page-body map-screen">
      <PageDoodles variant="map" />
      <h1>Map</h1>

      {errorMessage && <p role="alert">{errorMessage}</p>}
      {!items && !errorMessage && <p>Charting your discoveries...</p>}

      {items && located.length === 0 && !errorMessage && (
        <p>
          Nothing placed on the map yet — allow location access next time you catalogue a
          find, and it'll show up here.
        </p>
      )}

      {items && (
        <div className="map-container">
          <MapContainer
            center={center}
            zoom={zoom}
            scrollWheelZoom
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {located.map((item) => (
              <Marker key={item.id} position={[item.latitude, item.longitude]} icon={pinIcon}>
                <Popup>
                  <Link to={`/entry/${item.id}`} className="map-popup">
                    <img src={imageUrl(item.image_path)} alt={item.name} />
                    <strong>{item.name}</strong>
                    <span>{item.sub_category}</span>
                  </Link>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}
    </main>
  );
}

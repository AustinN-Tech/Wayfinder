import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import AuthImage from "../components/AuthImage";
import PageHeader from "../components/PageHeader";
import { getItems, getCategories } from "../lib/api";
import { ERA_YEAR_RANGES } from "../lib/eraYears";

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

// Index 0 is "All eras" (no filtering); every index after that is one era,
// natural (deep geological time) followed by cultural (historical time) -
// there's no true shared timeline between the two, but a single slider
// moving through both lists back to back is the simplest one-control view.
function buildEraList(categoryData) {
  if (!categoryData) return [];
  const natural = (categoryData.time_periods?.NATURAL || []).map((period) => ({
    period,
    category: "NATURAL",
  }));
  const cultural = (categoryData.time_periods?.CULTURAL || []).map((period) => ({
    period,
    category: "CULTURAL",
  }));
  return [...natural, ...cultural];
}

export default function Map() {
  const [items, setItems] = useState(null);
  const [categoryData, setCategoryData] = useState(null);
  const [eraIndex, setEraIndex] = useState(0); // 0 = All eras
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    Promise.all([getItems(), getCategories()])
      .then(([itemList, categories]) => {
        setItems(itemList);
        setCategoryData(categories);
      })
      .catch((err) => setErrorMessage(err.message));
  }, []);

  const eras = useMemo(() => buildEraList(categoryData), [categoryData]);
  const selectedEra = eraIndex > 0 ? eras[eraIndex - 1] : null;

  const located = useMemo(
    () => (items || []).filter((item) => item.latitude != null && item.longitude != null),
    [items]
  );

  const filtered = useMemo(() => {
    if (!selectedEra) return located;
    return located.filter(
      (item) => item.category === selectedEra.category && item.time_period === selectedEra.period
    );
  }, [located, selectedEra]);

  const center = filtered.length
    ? [filtered[0].latitude, filtered[0].longitude]
    : WORLD_CENTER;
  const zoom = filtered.length ? (filtered.length === 1 ? 10 : 4) : WORLD_ZOOM;

  return (
    <main className="page-body map-screen">
      <PageHeader
        title="Map"
        subtitle="Every located find, pinned where you came across it. Drag the slider to travel by era."
        accent="#3f6b4e"
        note={items ? `${located.length} ${located.length === 1 ? "find" : "finds"} pinned` : undefined}
      />

      {errorMessage && <p role="alert">{errorMessage}</p>}
      {!items && !errorMessage && <p>Charting your discoveries...</p>}

      {items && located.length === 0 && !errorMessage && (
        <p>
          Nothing placed on the map yet. Allow location access next time you catalogue a
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
            {filtered.map((item) => (
              <Marker key={item.id} position={[item.latitude, item.longitude]} icon={pinIcon}>
                <Popup>
                  <Link to={`/entry/${item.id}`} className="map-popup">
                    <AuthImage path={item.image_path} alt={item.name} />
                    <strong>{item.name}</strong>
                    <span>{item.sub_category}</span>
                  </Link>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {items && located.length > 0 && eras.length > 0 && (
        <div className="timeline-controls">
          <input
            type="range"
            className="era-slider"
            min={0}
            max={eras.length}
            step={1}
            value={eraIndex}
            onChange={(e) => setEraIndex(Number(e.target.value))}
            aria-label="Era"
          />
          <div className="era-label">
            {selectedEra ? (
              <>
                <span className={`era-tag era-tag-${selectedEra.category.toLowerCase()}`}>
                  {selectedEra.category === "NATURAL" ? "Natural" : "Cultural"}
                </span>
                {selectedEra.period}
                {ERA_YEAR_RANGES[selectedEra.period] && (
                  <span className="era-years">({ERA_YEAR_RANGES[selectedEra.period]})</span>
                )}
              </>
            ) : (
              "All eras"
            )}
          </div>
        </div>
      )}
    </main>
  );
}

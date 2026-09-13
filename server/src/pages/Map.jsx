import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import PageDoodles from "../components/PageDoodles";
import { getItems, getCategories, imageUrl } from "../lib/api";

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

// Cultural and Natural periods are entirely different vocabularies (Bronze
// Age vs Jurassic) with no real shared timeline, so the range slider always
// scopes to one category's own ordered list rather than pretending they're
// comparable on one axis.
const CATEGORY_TOGGLES = [
  { key: "NATURAL", label: "Natural" },
  { key: "CULTURAL", label: "Cultural" },
];

function TimelineSlider({ periods, range, onChange }) {
  const max = periods.length - 1;
  const [lowIndex, highIndex] = range;

  function updateLow(value) {
    onChange([Math.min(Number(value), highIndex), highIndex]);
  }

  function updateHigh(value) {
    onChange([lowIndex, Math.max(Number(value), lowIndex)]);
  }

  return (
    <div className="timeline-slider">
      <div className="timeline-track-wrap">
        <div
          className="timeline-track-fill"
          style={{
            left: `${(lowIndex / max) * 100}%`,
            right: `${100 - (highIndex / max) * 100}%`,
          }}
        />
        <input
          type="range"
          min={0}
          max={max}
          value={lowIndex}
          onChange={(e) => updateLow(e.target.value)}
          aria-label="Earliest period"
        />
        <input
          type="range"
          min={0}
          max={max}
          value={highIndex}
          onChange={(e) => updateHigh(e.target.value)}
          aria-label="Latest period"
        />
      </div>
      <div className="timeline-labels">
        <span>{periods[lowIndex]}</span>
        <span>{periods[highIndex]}</span>
      </div>
    </div>
  );
}

export default function Map() {
  const [items, setItems] = useState(null);
  const [categoryData, setCategoryData] = useState(null);
  const [category, setCategory] = useState("NATURAL");
  const [range, setRange] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    Promise.all([getItems(), getCategories()])
      .then(([itemList, categories]) => {
        setItems(itemList);
        setCategoryData(categories);
      })
      .catch((err) => setErrorMessage(err.message));
  }, []);

  const periods = useMemo(
    () => categoryData?.time_periods?.[category] || [],
    [categoryData, category]
  );

  // Reset to the full span whenever the category (and so the period list)
  // changes, rather than carrying over an index range from a different list.
  // Adjusted during render (React's recommended pattern for this) instead of
  // an effect, so switching categories doesn't cost an extra render pass.
  const rangeKey = `${category}:${periods.length}`;
  const [initializedRangeKey, setInitializedRangeKey] = useState(null);
  if (periods.length && initializedRangeKey !== rangeKey) {
    setInitializedRangeKey(rangeKey);
    setRange([0, periods.length - 1]);
  }

  const located = useMemo(
    () => (items || []).filter((item) => item.latitude != null && item.longitude != null),
    [items]
  );

  const filtered = useMemo(() => {
    if (!range) return located;
    return located.filter((item) => {
      if (item.category !== category) return false;
      if (!item.time_period) return true; // unknown period - don't hide a real find
      const index = periods.indexOf(item.time_period);
      if (index === -1) return true;
      return index >= range[0] && index <= range[1];
    });
  }, [located, category, periods, range]);

  const center = filtered.length
    ? [filtered[0].latitude, filtered[0].longitude]
    : WORLD_CENTER;
  const zoom = filtered.length ? (filtered.length === 1 ? 10 : 4) : WORLD_ZOOM;

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

      {items && located.length > 0 && (
        <div className="timeline-controls">
          <div className="timeline-toggle" role="tablist" aria-label="Category">
            {CATEGORY_TOGGLES.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={category === key}
                className={`timeline-toggle-btn ${category === key ? "active" : ""}`}
                onClick={() => setCategory(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {range && periods.length > 1 && (
            <TimelineSlider periods={periods} range={range} onChange={setRange} />
          )}
        </div>
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

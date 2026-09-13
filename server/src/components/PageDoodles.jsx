import { CompassRose } from "./icons";

// Purely decorative marginalia. The layer is pointer-events: none and sits
// behind the page content; every doodle is pinned to a margin, a corner or the
// foot of the page so real content never lands on top of one.

const SHAPES = {
  compass: (
    <div className="doodle doodle-compass" key="compass">
      <CompassRose size={96} />
    </div>
  ),

  stars: (
    <svg className="doodle doodle-stars" key="stars" viewBox="0 0 90 84" fill="none">
      <path d="M14 6v13M8 9.5l12 6M20 9.5l-12 6" />
      <path d="M56 26v9M52 28l8 5M60 28l-8 5" />
      <path d="M30 58v11M24.5 61l11 5M35.5 61l-11 5" />
      <path d="M72 62v7M68.5 63.5l7 4M75.5 63.5l-7 4" />
    </svg>
  ),

  route: (
    <svg className="doodle doodle-route" key="route" viewBox="0 0 150 70" fill="none">
      <path
        d="M5 58C22 40 33 62 50 44s25 6 43-13c7-7 14-11 21-13"
        strokeDasharray="1 8"
        strokeLinecap="round"
      />
      <path d="M108 8l11 11M119 8l-11 11" />
      <path d="M5 58a3.5 3.5 0 106 0 3.5 3.5 0 10-6 0" />
    </svg>
  ),

  mountains: (
    <svg className="doodle doodle-mountains" key="mountains" viewBox="0 0 170 66" fill="none">
      <path d="M3 60c9-1 18-2 26-12l16-20 15 18 13-15 22 27 15-19 24 21c8 1 19 0 32 0" />
      <path d="M39 33l7 7M46 26l5 6M100 40l6 6" />
      <path d="M118 6c3 3 4 7 3 11" />
    </svg>
  ),

  fern: (
    <svg className="doodle doodle-fern" key="fern" viewBox="0 0 54 132" fill="none">
      <path d="M30 126C27 96 28 60 40 12" />
      <path d="M31 108c-8-3-12-9-12-17 8 2 12 8 12 17zM33 94c8-4 11-11 10-19-8 3-11 10-10 19z" />
      <path d="M33 88c-7-4-10-10-9-17 7 3 10 9 9 17zM35 74c8-5 10-11 9-19-7 4-10 11-9 19z" />
      <path d="M36 68c-6-4-8-10-7-16 6 3 8 9 7 16zM38 55c7-5 9-11 8-18-7 4-9 11-8 18z" />
    </svg>
  ),

  glass: (
    <svg className="doodle doodle-glass" key="glass" viewBox="0 0 66 66" fill="none">
      <path d="M26 6c11-.4 20.5 8.4 20.8 19.4C47 36.4 38.2 45.6 27.2 46 16.2 46.3 7 37.6 6.6 26.6 6.3 15.6 15 6.4 26 6z" />
      <path d="M41 41l19 18" />
      <path d="M14 22c1.5-5 5-8.5 10-10" />
    </svg>
  ),

  shell: (
    <svg className="doodle doodle-shell" key="shell" viewBox="0 0 76 62" fill="none">
      <path d="M38 57C20 57 6 44 6 28 6 14 20 4 38 4s32 10 32 24c0 16-14 29-32 29z" />
      <path d="M38 57V6M38 57C31 44 26 26 25 7M38 57c7-13 12-31 13-50M38 57c-13-11-22-25-26-38M38 57c13-11 22-25 26-38" />
    </svg>
  ),

  ammonite: (
    <svg className="doodle doodle-ammonite" key="ammonite" viewBox="0 0 70 70" fill="none">
      <path d="M35 63C20 63 8 51 8 36 8 23 19 13 32 13c11 0 19 8 19 19 0 9-7 16-16 16-7 0-12-5-12-12 0-5 4-10 10-10 4 0 8 4 8 8" />
      <path d="M35 63v-9M16 55l7-6M8 36h9M13 20l7 6M32 13v8M48 20l-6 6" />
    </svg>
  ),

  feather: (
    <svg className="doodle doodle-feather" key="feather" viewBox="0 0 48 118" fill="none">
      <path d="M36 10c6 24 1 54-13 74-6 9-13 15-17 17 0-4 2-15 6-25 8-25 17-50 24-66z" />
      <path d="M36 10L6 101" />
      <path d="M29 32l-9 7M27 46l-10 7M24 60l-10 7M21 74l-9 7" />
    </svg>
  ),

  curl: (
    <svg className="doodle doodle-curl" key="curl" viewBox="0 0 84 84" fill="none">
      <path d="M6 6h72v46L50 78H6z" />
      <path d="M78 52L50 78c1-17 10-26 28-26z" />
      <path d="M18 24h34M18 36h26M18 48h18" strokeDasharray="2 6" />
    </svg>
  ),
};

const VARIANTS = {
  feed: ["compass", "stars", "fern", "shell", "mountains", "route", "glass"],
  map: ["route", "mountains", "compass", "stars"],
  entry: ["ammonite", "stars", "fern", "glass"],
  result: ["feather", "stars", "curl"],
};

export default function PageDoodles({ variant }) {
  const keys = VARIANTS[variant] || [];

  return (
    <div className={`doodles doodles-${variant}`} aria-hidden="true">
      {keys.map((key) => SHAPES[key])}
    </div>
  );
}

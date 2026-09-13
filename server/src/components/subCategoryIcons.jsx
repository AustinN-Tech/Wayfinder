// One hand-drawn badge icon per sub-category, matching the ink-line style used
// throughout the journal (icons.jsx, PageDoodles). Each is a plain stroke
// drawing on currentColor so the album can recolor/mute it for the
// locked/unlocked states without swapping assets.

function Svg({ children, size, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export function ArtIcon({ size = 32, ...props }) {
  return (
    <Svg size={size} {...props}>
      <path d="M6 4h12v14H6z" />
      <path d="M8 8c2 1 4 1 6 0M8 12c2 1 4 1 6 0M8 15.5c2 .6 4 .6 6 0" />
      <path d="M12 18v4M8.5 22l3.5-3.5 3.5 3.5" />
    </Svg>
  );
}

export function ArchitectureIcon({ size = 32, ...props }) {
  return (
    <Svg size={size} {...props}>
      <path d="M7 4.5h10v2H7z" />
      <path d="M8.5 6.5v12" />
      <path d="M15.5 6.5v12" />
      <path d="M12 6.5v12" opacity="0.4" />
      <path d="M7 18.5h10v2H7z" />
    </Svg>
  );
}

export function MonumentIcon({ size = 32, ...props }) {
  return (
    <Svg size={size} {...props}>
      <path d="M12 2.5l3 5.5H9l3-5.5z" />
      <path d="M9.8 8h4.4v11.5H9.8z" />
      <path d="M7 19.5h10v2H7z" />
    </Svg>
  );
}

export function ArtifactIcon({ size = 32, ...props }) {
  return (
    <Svg size={size} {...props}>
      <path d="M9.5 3.5h5M10 3.5v3c-2.2 1-3.5 3.3-3.5 6.5 0 4 2.2 7 5.5 7s5.5-3 5.5-7c0-3.2-1.3-5.5-3.5-6.5v-3" />
      <path d="M7 8c-1.8-.2-2 3.2-.2 4.3M17 8c1.8-.2 2 3.2.2 4.3" />
    </Svg>
  );
}

export function ArchaeologyIcon({ size = 32, ...props }) {
  return (
    <Svg size={size} {...props}>
      <path d="M5.5 6c2.2-3 8.8-3 11 0" />
      <path d="M11 4.5v13.5" />
      <path d="M6.5 20.5c3.7-1.2 8.3-1.2 12 0" strokeDasharray="1 1.6" />
    </Svg>
  );
}

export function FossilIcon({ size = 32, ...props }) {
  return (
    <Svg size={size} {...props}>
      <path d="M12 20c-4.4 0-8-3.6-8-8 0-3.6 2.9-6.5 6.5-6.5S17 8.4 17 12c0 2.5-2 4.5-4.5 4.5S8 14.5 8 12c0-1.7 1.3-3 3-3 1.2 0 2.2 1 2.2 2.2" />
    </Svg>
  );
}

export function GeologyIcon({ size = 32, ...props }) {
  return (
    <Svg size={size} {...props}>
      <path d="M12 3.5l3 3.2v6L12 20l-3-7.3v-6z" />
      <path d="M9 6.7h6M12 3.5V20" opacity="0.45" />
      <path d="M4.5 20l.9-6.5 2-2 1.6 2-1 6.5z" />
      <path d="M19.5 20l-.9-6.5-2-2-1.6 2 1 6.5z" />
    </Svg>
  );
}

export function PlantIcon({ size = 32, ...props }) {
  return (
    <Svg size={size} {...props}>
      <path d="M12 21V9" />
      <path d="M12 13c-3.4-.8-5.5-3-5.5-6.2 3.3.2 5.5 2.3 6.3 5.4M12 9c3.4-.8 5.5-3 5.5-6.2-3.3.2-5.5 2.3-6.3 5.4" />
      <path
        d="M12 17.5c-2.3-.6-3.7-2.2-3.7-4.4 2.2.2 3.7 1.5 4.3 3.6M12 15.2c2.3-.6 3.7-2.2 3.7-4.4-2.2.2-3.7 1.5-4.3 3.6"
        opacity="0.75"
      />
    </Svg>
  );
}

export function AnimalIcon({ size = 32, ...props }) {
  return (
    <Svg size={size} {...props}>
      <circle cx="12" cy="15.5" r="4" />
      <circle cx="6.8" cy="9.2" r="1.9" />
      <circle cx="12" cy="6.3" r="1.9" />
      <circle cx="17.2" cy="9.2" r="1.9" />
    </Svg>
  );
}

export function LandmarkIcon({ size = 32, ...props }) {
  return (
    <Svg size={size} {...props}>
      <path d="M2 19l5.5-9 3.5 5 2.5-3.5 4.5 7.5z" />
      <path d="M9.2 8V4M9.2 4l2.6.9-2.6.9" />
    </Svg>
  );
}

// A catch-all "misc find" tag - for whatever doesn't fit a named bucket.
export function TagIcon({ size = 32, ...props }) {
  return (
    <Svg size={size} {...props}>
      <path d="M4 11.5V6c0-1.1.9-2 2-2h5.5L20 12.5l-7.5 7.5L4 11.5z" />
      <circle cx="8" cy="8" r="1.3" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function AquaticIcon({ size = 32, ...props }) {
  return (
    <Svg size={size} {...props}>
      <path d="M3 8c1.8-1.7 3.6-1.7 5.4 0s3.6 1.7 5.4 0 3.6-1.7 5.4 0" />
      <path d="M3 13c1.8-1.7 3.6-1.7 5.4 0s3.6 1.7 5.4 0 3.6-1.7 5.4 0" />
      <path d="M3 18c1.8-1.7 3.6-1.7 5.4 0s3.6 1.7 5.4 0 3.6-1.7 5.4 0" />
    </Svg>
  );
}

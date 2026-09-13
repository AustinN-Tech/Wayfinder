// Hand-drawn, sketch-style icons for the journal theme — deliberately
// imperfect/wobbly paths instead of clean geometric line icons.

export function CompassRose({ size = 28, ...props }) {
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
      <path d="M12 2.6c4.3-.2 8 3.3 8.4 7.6.4 4.4-3 8.5-7.4 9.2-4.4.7-8.6-2.2-9.4-6.6-.8-4.3 2.4-8.7 6.7-9.7.5-.2 1-.4 1.7-.5z" />
      <path
        d="M12 6.4 13.35 10.65 17.6 12 13.35 13.35 12 17.6 10.65 13.35 6.4 12 10.65 10.65Z"
        fill="currentColor"
        strokeWidth="0.7"
      />
      <path
        d="M14.55 9.45 15.8 8.2M14.55 14.55 15.8 15.8M9.45 14.55 8.2 15.8M9.45 9.45 8.2 8.2"
        strokeWidth="1.2"
        opacity="0.75"
      />
    </svg>
  );
}

export function OpenBook({ size = 28, ...props }) {
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
      <path d="M12 6.8C10.1 5.5 7.4 5 4.2 5.2c-.4 4-.4 8.2 0 12.5 3.2-.2 5.9.3 7.8 1.6" />
      <path d="M12 6.8c1.9-1.3 4.6-1.8 7.8-1.6.4 4 .4 8.2 0 12.5-3.2-.2-5.9.3-7.8 1.6" />
      <path d="M12 6.8v12.5" strokeWidth="1.4" />
      <path d="M6.4 8.7c1.3 0 2.5.2 3.5.7" strokeWidth="1.2" opacity="0.7" />
      <path d="M6.4 12.1c1.3 0 2.5.2 3.5.7" strokeWidth="1.2" opacity="0.7" />
      <path d="M17.6 8.7c-1.3 0-2.5.2-3.5.7" strokeWidth="1.2" opacity="0.7" />
      <path d="M17.6 12.1c-1.3 0-2.5.2-3.5.7" strokeWidth="1.2" opacity="0.7" />
    </svg>
  );
}

export function Medal({ size = 28, ...props }) {
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
      <path d="M8.3 2.9c.7 2.5 1.5 5 2.4 7.4M15.7 2.9c-.7 2.5-1.5 5-2.4 7.4" />
      <path d="M12 9.7c3-.1 5.6 2.3 5.8 5.3.2 3-2.1 5.7-5.1 5.9-3 .2-5.8-1.9-6.1-4.9-.3-3 1.9-5.9 4.9-6.2z" />
      <path
        d="M12 11.8 12.85 13.9 15.14 14.05 13.38 15.5 13.94 17.7 12 16.5 10.06 17.7 10.62 15.5 8.86 14.05 11.15 13.9Z"
        fill="currentColor"
        strokeWidth="0.7"
      />
    </svg>
  );
}

export function PostageStamp({ size = 28, ...props }) {
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
      {/* perforated outer edge */}
      <rect
        x="3.6"
        y="3"
        width="16.8"
        height="18"
        rx="1.5"
        strokeDasharray="1.6 2.1"
      />
      {/* the printed frame, inset from the perforation */}
      <rect x="6.3" y="5.6" width="11.4" height="12.8" rx="0.6" strokeWidth="1.2" opacity="0.85" />
      {/* a small engraved star standing in for the stamp's picture */}
      <path
        d="M12 8.6 13 11.2 15.7 12 13 12.8 12 15.4 11 12.8 8.3 12 11 11.2Z"
        fill="currentColor"
        strokeWidth="0.6"
      />
    </svg>
  );
}

export function Portrait({ size = 28, ...props }) {
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
      {/* a small framed portrait, on-brand with the stamp's own frame-in-frame */}
      <rect x="3.6" y="3" width="16.8" height="18" rx="1.3" />
      <rect x="6" y="5.4" width="12" height="13.2" rx="0.6" strokeWidth="1.1" opacity="0.85" />
      <circle cx="12" cy="10.4" r="2.4" strokeWidth="1.3" />
      <path d="M7.4 17c.9-2.6 3-3.9 4.6-3.9s3.7 1.3 4.6 3.9" strokeWidth="1.3" />
    </svg>
  );
}

export function FoldedMap({ size = 28, ...props }) {
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
      <path d="M3.4 6.1 9 4.1l6 2 5.6-1.9v13.7L15 19.9l-6-2-5.6 1.9z" />
      {/* the folds sit back from the outline, or the panels read as separate
          boxes rather than one sheet creased twice */}
      <path d="M9 4.1v13.8M15 6.1v13.8" strokeWidth="1.2" opacity="0.5" />
    </svg>
  );
}

// The heading every journal page opens with: the title, a hand-inked rule
// under it, a caption, and a journal rule closing the band off from the page
// content below.
//
// The right-hand slot is what keeps the band from reading as a mostly-empty
// strip of paper. Pass `note` for the usual case - a handwritten counter,
// styled here so no page has to reproduce it - or `aside` for anything richer,
// like the category search.

function InkRule() {
  return (
    <svg
      className="page-header-rule"
      viewBox="0 0 240 10"
      preserveAspectRatio="none"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M3 5.2c38-2.8 76-3.7 114-3.1 40 .7 80 2.3 120 1.4" strokeWidth="2.1" />
      <path d="M17 8.4c44-2 89-2.6 133-1.9" strokeWidth="1.3" opacity="0.4" />
    </svg>
  );
}

export default function PageHeader({ title, subtitle, accent, note, aside }) {
  return (
    <header className="page-header" style={accent ? { "--header-accent": accent } : undefined}>
      <div className="page-header-row">
        <div className="page-header-heading">
          <div className="page-header-titleline">
            <h1>{title}</h1>
            <InkRule />
          </div>

          {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
        </div>

        {(note || aside) && (
          <div className="page-header-aside">
            {note && <p className="page-header-note">{note}</p>}
            {aside}
          </div>
        )}
      </div>
    </header>
  );
}

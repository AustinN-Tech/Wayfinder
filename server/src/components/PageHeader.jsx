// The heading every journal page opens with: a stamped icon, the title, a
// hand-inked rule under both, and a caption. `actions` takes anything that
// belongs on the same line as the title (the category search, for instance).

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

export default function PageHeader({ title, subtitle, icon: Icon, accent, actions }) {
  return (
    <header className="page-header" style={accent ? { "--header-accent": accent } : undefined}>
      <div className="page-header-row">
        <div className="page-header-heading">
          <div className="page-header-titleline">
            {Icon && (
              <span className="page-header-badge" aria-hidden="true">
                <Icon />
              </span>
            )}
            <h1>{title}</h1>
            <InkRule />
          </div>

          {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
        </div>

        {actions && <div className="page-header-actions">{actions}</div>}
      </div>
    </header>
  );
}

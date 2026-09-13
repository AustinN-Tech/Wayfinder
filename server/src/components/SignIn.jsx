const COPY = {
  loading: { title: "Wayfinder", body: "Opening the journal..." },
  // No line under the title: the cover carries the name and the way in, and
  // nothing between them. The other two states still have something to say.
  "signed-out": { title: "Wayfinder", body: null },
  error: { title: "Couldn't sign you in", body: null },
};

// Covers the whole app for three states: Auth0 settling in (isLoading),
// nobody signed in yet, or Auth0 itself erroring out. The journal is shut
// until you sign in, so this screen is its cover rather than a page of it.
export default function SignIn({ status, message, onSignIn }) {
  const { title, body } = COPY[status] || COPY["signed-out"];
  const note = status === "error" ? message : body;

  return (
    <div className="desk signin-desk">
      <div className="signin-book">
        <div className="signin-cover">
          {/* The block of pages the cover closes over. Inside the cover, not
              beside it: the cover is narrower than .signin-book whenever a
              short window caps its height, and anchored to the wrapper this
              drifted out into the desk on its own. */}
          <span className="signin-pages" aria-hidden="true" />

          <h1>{title}</h1>
          {note && <p>{note}</p>}

          {status === "loading" && <div className="signin-spinner" aria-hidden="true" />}

          {status === "signed-out" && (
            <button type="button" className="signin-button" onClick={onSignIn}>
              Open your journal
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

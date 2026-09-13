const COPY = {
  loading: { title: "insitu", body: "Opening the journal..." },
  "signed-out": {
    title: "insitu",
    body: "A journal of the things you come across. Sign in to open yours.",
  },
  error: { title: "Couldn't sign you in", body: null },
};

// Covers the whole app for three states: Auth0 settling in (isLoading),
// nobody signed in yet, or Auth0 itself erroring out.
export default function SignIn({ status, message, onSignIn }) {
  const { title, body } = COPY[status] || COPY["signed-out"];

  return (
    <div className="desk">
      <div className="signin-cover">
        <h1>{title}</h1>
        <p>{status === "error" ? message : body}</p>

        {status === "loading" && <div className="signin-spinner" aria-hidden="true" />}

        {status === "signed-out" && (
          <button type="button" className="signin-button" onClick={onSignIn}>
            Sign in
          </button>
        )}
      </div>
    </div>
  );
}

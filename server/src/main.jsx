import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router";
import { Auth0Provider } from "@auth0/auth0-react";
import App from "./App.jsx";
import "./index.css";

const domain = import.meta.env.VITE_AUTH0_DOMAIN;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

// Strips Auth0's ?code=&state= off the URL once it redirects back.
function onRedirectCallback(appState) {
  window.history.replaceState({}, "", appState?.returnTo || window.location.pathname);
}

const root = ReactDOM.createRoot(document.getElementById("root"));

if (!domain || !clientId || !audience) {
  root.render(
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif", lineHeight: 1.5 }}>
      <h1>Auth0 is not configured</h1>
      <p>
        Copy <code>.env.example</code> to <code>.env</code> in{" "}
        <code>insitu/server/</code> and set <code>VITE_AUTH0_DOMAIN</code>,{" "}
        <code>VITE_AUTH0_CLIENT_ID</code> and <code>VITE_AUTH0_AUDIENCE</code>, then
        restart the dev server.
      </p>
      <p>
        <code>VITE_AUTH0_AUDIENCE</code> must byte-match the backend's{" "}
        <code>AUTH0_AUDIENCE</code> (in <code>insitu/.env</code>), or every request comes
        back 401.
      </p>
    </main>
  );
} else {
  root.render(
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      // audience is what makes Auth0 issue a verifiable JWT for our API,
      // rather than an opaque token the backend can't decode.
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience,
      }}
      onRedirectCallback={onRedirectCallback}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Auth0Provider>
  );
}

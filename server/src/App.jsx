import { useEffect, useRef } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router";
import { useAuth0 } from "@auth0/auth0-react";
import Feed from "./pages/Feed";
import Map from "./pages/Map";
import Stamps from "./pages/Stamps";
import Profile from "./pages/Profile";
import Friends from "./pages/Friends";
import FriendProfile from "./pages/FriendProfile";
import JournalShell from "./components/JournalShell";
import SignIn from "./components/SignIn";
import Camera from "./pages/Camera";
import Result from "./pages/Result";
import Entry from "./pages/Entry";
import CategoryEntries from "./pages/CategoryEntries";
import { setTokenGetter, syncMyProfile } from "./lib/api";
import "./App.css";

function App() {
  const location = useLocation();
  const { isLoading, isAuthenticated, error, loginWithRedirect, getAccessTokenSilently, user } =
    useAuth0();
  const synced = useRef(false);

  // Registered during render, not in an effect: child effects run before
  // parent ones, so a page could fire its first fetch before the getter
  // existed if this waited for useEffect.
  setTokenGetter(getAccessTokenSilently);

  // Once per session: push the Auth0 profile's name/picture into the local
  // user row, so a friend's profile has something to show without this
  // user ever visiting Auth0 directly. Never touches username - see
  // /api/me/profile.
  useEffect(() => {
    if (!isAuthenticated || !user || synced.current) return;
    synced.current = true;
    syncMyProfile({ displayName: user.name, avatarUrl: user.picture }).catch(() => {});
  }, [isAuthenticated, user]);

  if (isLoading) {
    return <SignIn status="loading" />;
  }

  if (error) {
    return <SignIn status="error" message={error.message} />;
  }

  if (!isAuthenticated) {
    return <SignIn status="signed-out" onSignIn={() => loginWithRedirect()} />;
  }

  const routes = (
    <Routes>
      <Route path="/" element={<Navigate to="/feed" replace />} />
      <Route path="/feed" element={<Feed />} />
      <Route path="/map" element={<Map />} />
      <Route path="/stamps" element={<Stamps />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/friends" element={<Friends />} />
      <Route path="/friends/:id" element={<FriendProfile />} />
      <Route path="/camera" element={<Camera />} />
      <Route path="/result" element={<Result />} />
      <Route path="/entry/:id" element={<Entry />} />
      <Route path="/feed/:category/:subCategory" element={<CategoryEntries />} />
    </Routes>
  );

  // the viewfinder is full-bleed; every other route is a page of the journal
  if (location.pathname === "/camera") {
    return routes;
  }

  return <JournalShell>{routes}</JournalShell>;
}

export default App;

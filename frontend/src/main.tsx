import React, { StrictMode } from "react";
import ReactDOM, { createRoot } from "react-dom/client";
import {
  Navigate,
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";
import App from "./App.tsx";
import SignIn from "./pages/sign-in.tsx";
import SignUp from "./pages/sign-up.tsx";
import { CookiesProvider } from "react-cookie";
import ProtectedRoute from "./utils/ProtectedRoute.tsx";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/index.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CookiesProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/sign-in" />} />
          {/* Sign In page */}
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/sign-up" element={<SignUp />} />

          {/* Protected Home page (sign in page must validate your email address and password) */}
          <Route
            path="/App"
            element={
              <ProtectedRoute>
                <App />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </CookiesProvider>
  </StrictMode>
);

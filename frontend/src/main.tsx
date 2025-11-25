import React from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Navigate, BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './index.css';
import App from './App';
import SignIn from './signin';
import RequireAuth from './require-auth'
import { CookiesProvider, useCookies } from 'react-cookie'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/signin" />} />
        {/* Sign In page */}
        <Route path="/signin" element={<SignIn />} />
        
        {/* Protected Home page (sign in page must validate your email address and password*/} 
        <Route
          path="/App"
          element={
            <RequireAuth>
              <App />
            </RequireAuth>
          }
        />
      </Routes>
    </Router>
  </StrictMode>
);

import React, { StrictMode } from 'react';
import ReactDOM, { createRoot } from 'react-dom/client';
import { Navigate, BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './styles/index.css';
import App from './App.tsx';
import SignIn from './pages/sign-in.tsx';
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
            <CookiesProvider defaultSetOptions={{path: '/'}}>
              <App />
            </CookiesProvider>
          }
        />
      </Routes>
    </Router>
  </StrictMode>
);

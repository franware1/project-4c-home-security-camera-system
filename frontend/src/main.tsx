import React, { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Navigate, BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './styles/index.css';
import App from './App';
import SignIn from './signin';
import { CookiesProvider, useCookies, Cookies } from 'react-cookie'


// protect the App by validating cookies. if cookie not found, redirect to /signin?
const AppWrapper = () => {
  const [cookies, setCookie, removeCookie] = useCookies(['authToken']);

  useEffect(() => {
    const authToken = cookies.authToken;
    if (!authToken) {
      window.location.href = "/signin?auth=false";
    }
  }, [cookies]);

  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/signin"/>} />
        {/* Sign In page */}
        <Route path="/signin" element={<SignIn />} />
        
        {/* Protected Home page (sign in page must validate your email address and password*/} 
        <Route
          path="/App"
          element={
            <CookiesProvider defaultSetOptions={{path: '/'}}>
              <AppWrapper />
            </CookiesProvider>
          }
        />
      </Routes>
    </Router>
  </StrictMode>
);

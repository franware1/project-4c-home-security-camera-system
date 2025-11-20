import React from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './index.css';
import App from './App';
import SignIn from './signin';
import ProtectedRoutes from './utils/ProtectedRoutes';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <Routes>
        {/* Sign In page */}
        <Route path="/signin" element={<SignIn />} />
        
        {/* Protected Home page (sign in page must validate your email address and password*/} 
        <Route element={<ProtectedRoutes/>}>
              <Route path="/App" element={<App />}/>
        </Route>
      </Routes>
    </Router>
  </StrictMode>
);

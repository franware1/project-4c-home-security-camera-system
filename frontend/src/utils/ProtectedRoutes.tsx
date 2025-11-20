import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';

const ProtectedRoutes = () => {
    const user = null

    // if there is a user, call outlet which allows us to wrap our routes
    // outlet says continue on to the next step
    return user ? <Outlet/> : <Navigate to='/login'/> // if invalid user, return back to login
   
}

export default ProtectedRoutes

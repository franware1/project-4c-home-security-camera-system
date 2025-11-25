import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useCookies } from 'react-cookie';

interface Props {
  children: tsx.Element;
}

const RequireAuth: React.FC<Props> = ({ children }) => {
  const [cookies] = useCookies(['token']); // or whatever cookie you store auth in
  const location = useLocation();

  if (!cookies.token) {
    // If not authenticated, redirect to /signin
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // If authenticated, render the protected component
  return children;
};

export default RequireAuth;

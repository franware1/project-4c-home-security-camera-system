import { Navigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import React from "react";

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [cookies] = useCookies(["auth-token"]);
  const token = cookies["auth-token"]

  if (!token) {
    return <Navigate to="/sign-in" replace />;
  }

  return <>{children}</>;
}

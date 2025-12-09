import { Navigate } from "react-router-dom";
import { useCookies } from "react-cookie";

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [cookies] = useCookies(["auth-token"]);

  if (!cookies["auth-token"]) {
    return <Navigate to="/sign-in" replace />;
  }

  return children;
}

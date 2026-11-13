import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { currentUser, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !currentUser) {
    const targetRole = Array.isArray(allowedRoles) ? allowedRoles[0] : allowedRoles || "user";
    return <Navigate to={`/login/${targetRole}`} state={{ from: location }} replace />;
  }

  if (allowedRoles) {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!roles.includes(currentUser.role)) {
      const roleHomeMap = {
        user: "/user",
        vendor: "/vendor",
        volunteer: "/volunteer",
        admin: "/admin",
      };
      return <Navigate to={roleHomeMap[currentUser.role] || "/roles"} replace />;
    }
  }

  return children;
};

export default ProtectedRoute;

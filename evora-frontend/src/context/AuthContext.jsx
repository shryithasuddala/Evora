import { useState, useEffect } from "react";
import { AuthContext } from "./authContextInstance";
import { authAPI } from "../services/api";

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem("evoraCurrentUser");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  // On mount, verify token is still valid
  useEffect(() => {
    const token = localStorage.getItem("evoraToken");
    if (token && currentUser) {
      authAPI.getMe().catch(() => {
        // Token expired — clear session
        localStorage.removeItem("evoraToken");
        localStorage.removeItem("evoraCurrentUser");
        setCurrentUser(null);
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const _persistUser = (user, token) => {
    localStorage.setItem("evoraToken", token);
    localStorage.setItem("evoraCurrentUser", JSON.stringify(user));
    localStorage.setItem("evoraRole", user.role);
    if (user.role === "vendor") {
      localStorage.setItem("evoraVendorId", user._id);
    }
    setCurrentUser(user);
  };

  const login = async (email, password, role, skipOtp = false) => {
    setLoading(true);
    try {
      const result = await authAPI.login(email, password, role, skipOtp);
      if (result.requireOtp) {
        return {
          success: true,
          requireOtp: true,
          message: result.message,
          email: result.email,
          demoOtp: result.demoOtp,
        };
      }
      _persistUser(result.user, result.token);
      return { success: true, user: result.user };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (email, otp, role) => {
    setLoading(true);
    try {
      const result = await authAPI.verifyOtp(email, otp, role);
      _persistUser(result.user, result.token);
      return { success: true, user: result.user };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async (email, role) => {
    try {
      const result = await authAPI.sendOtp(email, role);
      return { success: true, message: result.message, demoOtp: result.demoOtp };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      const result = await authAPI.register(userData);
      _persistUser(result.user, result.token);
      return { success: true, user: result.user };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const requestRegisterOtp = async (userData) => {
    setLoading(true);
    try {
      const result = await authAPI.requestRegisterOtp(userData);
      return { success: true, message: result.message, email: result.email, demoOtp: result.demoOtp };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const verifyRegisterOtp = async (email, otp) => {
    setLoading(true);
    try {
      const result = await authAPI.verifyRegisterOtp(email, otp);
      _persistUser(result.user, result.token);
      return { success: true, user: result.user };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updatedFields) => {
    if (!currentUser) return;
    const updated = await authAPI.updateMe(updatedFields);
    localStorage.setItem("evoraCurrentUser", JSON.stringify(updated));
    setCurrentUser(updated);
    return updated;
  };

  const logout = () => {
    localStorage.removeItem("evoraToken");
    localStorage.removeItem("evoraCurrentUser");
    localStorage.removeItem("evoraRole");
    localStorage.removeItem("evoraVendorId");
    setCurrentUser(null);
  };

  const value = {
    currentUser,
    role: currentUser?.role || null,
    isAuthenticated: !!currentUser,
    loading,
    login,
    verifyOtp,
    sendOtp,
    register,
    requestRegisterOtp,
    verifyRegisterOtp,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

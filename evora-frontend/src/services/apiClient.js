import axios from "axios";

// Normalize BASE_URL so it always points to /api regardless of trailing slash
let rawBase = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").trim();
if (rawBase.endsWith("/")) rawBase = rawBase.slice(0, -1);
if (!rawBase.endsWith("/api")) rawBase = `${rawBase}/api`;
const BASE_URL = rawBase;

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

// Attach JWT token to every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("evoraToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global response error handler
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message || error.message || "An unexpected error occurred.";
    // Auto-logout on 401
    if (error.response?.status === 401) {
      localStorage.removeItem("evoraToken");
      localStorage.removeItem("evoraCurrentUser");
    }
    return Promise.reject(new Error(message));
  }
);

export default apiClient;

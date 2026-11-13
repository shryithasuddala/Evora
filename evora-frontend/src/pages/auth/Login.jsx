import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  ShieldCheck,
  Store,
  UserRound,
  HandHeart,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  X,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { useToast } from "../../context/ToastContext";
import { authAPI } from "../../services/api";
import Logo from "../../components/common/Logo";

const roleData = {
  user: {
    title: "Welcome Back",
    subtitle: "Login to plan and celebrate memorable moments",
    icon: UserRound,
    label: "USER / ORGANIZER",
  },
  vendor: {
    title: "Welcome Back, Vendor",
    subtitle: "Manage your services, client proposals, and bookings",
    icon: Store,
    label: "VENDOR PARTNER",
  },
  volunteer: {
    title: "Welcome Back, Volunteer",
    subtitle: "Support extraordinary events and complete duties",
    icon: HandHeart,
    label: "VOLUNTEER OPERATIONS",
  },
  admin: {
    title: "Admin Portal",
    subtitle: "Manage platform operations, verify vendors & track activity",
    icon: ShieldCheck,
    label: "PLATFORM ADMIN",
  },
};

const Login = () => {
  const navigate = useNavigate();
  const { role = "user" } = useParams();
  const { login } = useAuth();
  const toast = useToast();

  const currentRole = roleData[role] || roleData.user;
  const RoleIcon = currentRole.icon;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Forgot / Reset Password Modal State
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  // Weak password detector for warning alerts
  const isCommonOrWeakPassword = (pwd) => {
    if (!pwd) return false;
    const commonWeak = ["123456", "12345678", "123456789", "password", "password123", "admin123", "qwerty", "111111", "000000"];
    return (
      commonWeak.includes(pwd.toLowerCase().trim()) ||
      pwd.length < 8 ||
      !/[A-Z]/.test(pwd) ||
      !/[0-9]/.test(pwd)
    );
  };

  const handleCredentialsSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    try {
      const result = await login(email, password, role);

      if (!result.success) {
        setError(result.error);
        return;
      }

      if (rememberMe) {
        localStorage.setItem("evoraRememberMe", "true");
      }

      if (isCommonOrWeakPassword(password)) {
        toast.warning(
          "Weak Password Warning ⚠️",
          "You are using a weak password ('123456' or similar). Please change this to a strong password in your profile settings to protect your account.",
          9000
        );
      }

      const routes = {
        user: "/user",
        vendor: "/vendor",
        volunteer: "/volunteer",
        admin: "/admin",
      };
      navigate(routes[role] || "/roles");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError("");
    setResetSuccess("");

    if (!resetEmail.trim()) {
      setResetError("Please enter your registered email address.");
      return;
    }

    if (
      isCommonOrWeakPassword(resetNewPassword) ||
      !/[a-z]/.test(resetNewPassword) ||
      !/[^A-Za-z0-9]/.test(resetNewPassword)
    ) {
      setResetError("Please choose a strong password: minimum 8 characters with uppercase, lowercase, numbers, and special symbols (!@#$).");
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      setResetError("Passwords do not match.");
      return;
    }

    setResetLoading(true);
    try {
      const res = await authAPI.resetPassword({
        email: resetEmail.trim(),
        newPassword: resetNewPassword,
        role,
      });

      if (res.success) {
        setResetSuccess("Password updated successfully! You can now sign in.");
        toast.success("Password Updated", "Your new password is now active.");
        setEmail(resetEmail.trim());
        setPassword("");
        setTimeout(() => {
          setShowResetModal(false);
          setResetSuccess("");
          setResetNewPassword("");
          setResetConfirmPassword("");
        }, 1500);
      } else {
        setResetError(res.message || "Failed to reset password.");
      }
    } catch (err) {
      setResetError(err.response?.data?.message || err.message || "No account found with this email.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <main
      className="login-page"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px 60px",
        background:
          "radial-gradient(circle at 15% 20%, rgba(201, 161, 58, 0.08), transparent 27%), radial-gradient(circle at 85% 80%, rgba(49, 80, 57, 0.08), transparent 30%), #FAF5EA",
        position: "relative",
      }}
    >
      <button
        type="button"
        className="login-back"
        onClick={() => navigate("/roles")}
        aria-label="Back to role selection"
      >
        <ArrowLeft size={18} />
      </button>

      <div
        className="login-brand"
        style={{
          position: "static",
          transform: "none",
          marginBottom: "16px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div style={{ width: "115px", height: "auto" }}>
          <Logo />
        </div>
      </div>

      <section
        className="login-container"
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#FFFDF9",
          border: "1px solid #D5B36A",
          borderRadius: "20px",
          padding: "36px 30px",
          boxShadow: "0 12px 32px rgba(43, 29, 18, 0.08)",
          margin: 0,
        }}
      >
        <div className="login-heading" style={{ marginBottom: "24px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              background: "#FAF5EA",
              border: "1px solid #D5B36A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 10px",
              color: "#8C6435",
            }}
          >
            <RoleIcon size={20} />
          </div>
          <p
            style={{
              fontSize: "11px",
              letterSpacing: "2px",
              fontWeight: 700,
              color: "#C9A13A",
              textTransform: "uppercase",
              margin: "0 0 4px",
            }}
          >
            {currentRole.label} LOGIN
          </p>
          <h1
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "24px",
              color: "#2B1D12",
              margin: "0 0 6px",
            }}
          >
            {currentRole.title}
          </h1>
          <p style={{ color: "#766C67", fontSize: "13px", margin: 0 }}>
            {currentRole.subtitle}
          </p>
        </div>

        {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}

        <form className="login-form" onSubmit={handleCredentialsSubmit}>
          <div className="login-field">
            <label htmlFor="email">Email Address</label>
            <div className="login-input-wrapper">
              <Mail size={18} />
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="login-field">
            <label htmlFor="password">Password</label>
            <div className="login-input-wrapper">
              <Lock size={18} />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {password.length > 0 && isCommonOrWeakPassword(password) && (
              <div
                style={{
                  marginTop: "6px",
                  fontSize: "12px",
                  color: "#B45309",
                  background: "#FFFBEB",
                  border: "1px solid #FCD34D",
                  borderRadius: "8px",
                  padding: "6px 10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <AlertTriangle size={14} color="#D97706" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Weak password warning:</strong> {password === "123456" ? "123456" : "this password"} is easily guessed. Please change this to a strong password.
                </span>
              </div>
            )}
          </div>

          <div
            className="login-options"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              margin: "16px 0 24px",
            }}
          >
            <label
              className="login-remember"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "13px",
                color: "#6B5240",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{
                  accentColor: "#C9A13A",
                  width: "16px",
                  height: "16px",
                  cursor: "pointer",
                }}
              />
              <span>Remember me</span>
            </label>

            <button
              type="button"
              className="login-forgot"
              onClick={() => {
                setResetEmail(email);
                setResetError("");
                setResetSuccess("");
                setShowResetModal(true);
              }}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                padding: 0,
                margin: 0,
                color: "#8C6435",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                textDecoration: "none",
                fontFamily: "inherit",
              }}
            >
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="login-submit-button"
            style={{
              width: "100%",
              height: "46px",
              border: "none",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #C9A13A 0%, #D4AF37 50%, #B8860B 100%)",
              color: "#2B1D12",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
              letterSpacing: "0.5px",
              boxShadow: "0 4px 14px rgba(201, 161, 58, 0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {loading ? "Signing In…" : "Sign In"}
          </button>
        </form>

        {role !== "admin" && (
          <div
            className="login-footer"
            style={{
              marginTop: "24px",
              paddingTop: "16px",
              borderTop: "1px solid #EADBBE",
              textAlign: "center",
              fontSize: "13px",
              color: "#766C67",
            }}
          >
            <span>Don&apos;t have an account?</span>
            <Link
              to={`/register/${role}`}
              className="login-register-link"
              style={{
                marginLeft: "6px",
                color: "#8C6435",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Register as {role.charAt(0).toUpperCase() + role.slice(1)}
            </Link>
          </div>
        )}
      </section>

      {/* Forgot / Reset Password Modal */}
      {showResetModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            backdropFilter: "blur(3px)",
          }}
        >
          <div
            style={{
              background: "#FFFDF9",
              border: "1px solid #D5B36A",
              borderRadius: "20px",
              padding: "32px 28px",
              maxWidth: "420px",
              width: "100%",
              boxShadow: "0 20px 48px rgba(43,29,18,0.2)",
              position: "relative",
            }}
          >
            <button
              type="button"
              onClick={() => setShowResetModal(false)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "transparent",
                border: "none",
                color: "#766C67",
                cursor: "pointer",
              }}
            >
              <X size={20} />
            </button>

            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: "#FAF5EA",
                  border: "1px solid #D5B36A",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#8C6435",
                  marginBottom: "10px",
                }}
              >
                <KeyRound size={22} />
              </div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", color: "#2B1D12", margin: "0 0 6px" }}>
                Reset Password
              </h2>
              <p style={{ fontSize: "12px", color: "#766C67", margin: 0 }}>
                Enter your registered email and choose a new password.
              </p>
            </div>

            {resetError && (
              <div style={{ background: "#FCEBEB", border: "1px solid #F5C2C7", color: "#842029", padding: "10px 14px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px" }}>
                {resetError}
              </div>
            )}

            {resetSuccess && (
              <div style={{ background: "#E8F5E9", border: "1px solid #A5D6A7", color: "#2E7D32", padding: "10px 14px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle2 size={16} /> {resetSuccess}
              </div>
            )}

            <form onSubmit={handleResetPassword}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#2B1D12", marginBottom: "6px" }}>
                  Registered Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  style={{ width: "100%", padding: "11px 14px", borderRadius: "10px", border: "1px solid #D5B36A", background: "#FAF5EA", boxSizing: "border-box", fontSize: "14px" }}
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#2B1D12", marginBottom: "6px" }}>
                  New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  style={{ width: "100%", padding: "11px 14px", borderRadius: "10px", border: "1px solid #D5B36A", background: "#FAF5EA", boxSizing: "border-box", fontSize: "14px" }}
                />
              </div>

              <div style={{ marginBottom: "22px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#2B1D12", marginBottom: "6px" }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Re-enter new password"
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  style={{ width: "100%", padding: "11px 14px", borderRadius: "10px", border: "1px solid #D5B36A", background: "#FAF5EA", boxSizing: "border-box", fontSize: "14px" }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "1px solid #D5B36A", background: "transparent", color: "#6B5240", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg, #C9A13A 0%, #D4AF37 100%)", color: "#2B1D12", fontSize: "13px", fontWeight: 700, cursor: resetLoading ? "not-allowed" : "pointer", boxShadow: "0 4px 12px rgba(201,161,58,0.3)" }}
                >
                  {resetLoading ? "Updating…" : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export default Login;

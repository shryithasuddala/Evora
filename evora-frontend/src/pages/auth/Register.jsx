import { useState, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  UserRound,
  Mail,
  Phone,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowLeft,
  Building2,
  Briefcase,
  Award,
  MessageCircle,
  CheckCircle2,
  Sparkles,
  Store,
  HandHeart,
  Check,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { useToast } from "../../context/ToastContext";
import Logo from "../../components/common/Logo";

const roleConfig = {
  user: {
    key: "user",
    roleName: "USER / ORGANIZER",
    tabLabel: "Organizer",
    icon: UserRound,
    title: "Plan Your Celebration",
    subtitle: "Create unforgettable celebrations, hire artisan vendors, and manage budgets seamlessly.",
    accentColor: "#8C6435",
    badge: "EVENT HOST & ORGANIZER",
  },
  vendor: {
    key: "vendor",
    roleName: "VENDOR PARTNER",
    tabLabel: "Artisan Vendor",
    icon: Store,
    title: "Showcase Your Craft",
    subtitle: "Display your packages, receive verified celebration inquiries, and expand your business.",
    accentColor: "#9A6B2F",
    badge: "CERTIFIED ARTISAN PARTNER",
  },
  volunteer: {
    key: "volunteer",
    roleName: "VOLUNTEER FORCE",
    tabLabel: "Volunteer",
    icon: HandHeart,
    title: "Join the Volunteer Force",
    subtitle: "Support live events, gain credentials, and lead community surplus food rescue operations.",
    accentColor: "#304B35",
    badge: "ON-GROUND DUTY COMMAND",
  },
};

const Register = () => {
  const { role: routeRole = "user" } = useParams();
  const navigate = useNavigate();
  const { register } = useAuth();
  const toast = useToast();

  const activeRole = roleConfig[routeRole] ? routeRole : "user";
  const currentRole = roleConfig[activeRole] || roleConfig.user;
  const RoleIcon = currentRole.icon;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    businessName: "",
    category: "Catering",
    skills: "",
    whatsappOptIn: true,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Dedicated phone handler enforcing up to 10 digits
  const handlePhoneChange = (e) => {
    let raw = e.target.value.replace(/\D/g, "");
    if (raw.length === 12 && raw.startsWith("91")) {
      raw = raw.slice(2);
    } else if (raw.length === 11 && raw.startsWith("0")) {
      raw = raw.slice(1);
    }
    raw = raw.slice(0, 10);
    setFormData((prev) => ({
      ...prev,
      phone: raw,
    }));
  };

  // Detailed password security criteria analysis & weak password detection
  const passwordCriteria = useMemo(() => {
    const p = formData.password || "";
    if (!p) {
      return {
        score: 0,
        hasMinLen: false,
        hasUpper: false,
        hasLower: false,
        hasNum: false,
        hasSpecial: false,
        isCommonWeak: false,
        isStrong: false,
        isWeak: false,
      };
    }
    const commonWeak = ["123456", "12345678", "123456789", "password", "password123", "admin123", "qwerty", "111111", "000000"];
    const isCommonWeak = commonWeak.includes(p.toLowerCase().trim());
    const hasMinLen = p.length >= 8;
    const hasUpper = /[A-Z]/.test(p);
    const hasLower = /[a-z]/.test(p);
    const hasNum = /[0-9]/.test(p);
    const hasSpecial = /[^A-Za-z0-9]/.test(p);

    let score = 0;
    if (hasMinLen) score++;
    if (hasUpper && hasLower) score++;
    if (hasNum) score++;
    if (hasSpecial) score++;
    if (isCommonWeak) score = 0;

    const isStrong = !isCommonWeak && hasMinLen && hasUpper && hasLower && hasNum && hasSpecial;
    const isWeak = isCommonWeak || (p.length > 0 && score < 3);

    return {
      score,
      hasMinLen,
      hasUpper,
      hasLower,
      hasNum,
      hasSpecial,
      isCommonWeak,
      isStrong,
      isWeak,
    };
  }, [formData.password]);

  const strengthLabels = ["Very Weak", "Weak", "Fair", "Strong"];
  const strengthColors = ["#EF4444", "#F59E0B", "#3B82F6", "#10B981"];

  const passwordsMatch = Boolean(
    formData.password &&
    formData.confirmPassword &&
    formData.password === formData.confirmPassword
  );

  const passwordsMismatch = Boolean(
    formData.confirmPassword &&
    formData.password !== formData.confirmPassword
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (
      !formData.fullName.trim() ||
      !formData.email.trim() ||
      !formData.phone.trim() ||
      !formData.password.trim()
    ) {
      setError("Please complete all required fields including your contact phone.");
      return;
    }

    // Strict 10-digit phone verification
    const cleanPhone = formData.phone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      setError(`Phone number must be exactly 10 digits. You currently entered ${cleanPhone.length} ${cleanPhone.length === 1 ? "digit" : "digits"}.`);
      return;
    }

    // Strict strong password verification
    if (passwordCriteria.isCommonWeak) {
      setError(`"${formData.password}" is too weak and easily guessed. Please change this to a strong password.`);
      return;
    }

    if (!passwordCriteria.isStrong) {
      setError("Password is too weak. Please use a strong password with at least 8 characters, including uppercase, lowercase, numbers, and special characters (!@#$).");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match. Please verify your password confirmation.");
      return;
    }

    const payload = {
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      password: formData.password,
      role: activeRole,
      whatsappOptIn: Boolean(formData.whatsappOptIn),
    };

    if (activeRole === "vendor") {
      payload.businessName =
        formData.businessName.trim() || `${formData.fullName}'s Studio`;
      payload.serviceType = formData.category;
    }

    if (activeRole === "volunteer") {
      payload.bio =
        formData.skills.trim() || "Guest Reception, Hospitality & Event Staging";
    }

    setLoading(true);
    try {
      const res = await register(payload);

      if (!res.success) {
        setError(res.error || "Failed to create account.");
        return;
      }

      const routes = {
        user: "/user",
        vendor: "/vendor",
        volunteer: "/volunteer",
        admin: "/admin",
      };

      toast.success(
        "Welcome to EVORA! 🎉",
        `Account successfully registered for ${res.user?.fullName || "Member"}.${
          payload.whatsappOptIn
            ? " Automated celebration alerts enabled for WhatsApp."
            : ""
        }`
      );

      navigate(routes[activeRole] || "/roles");
    } catch (err) {
      setError(err.message || "An unexpected registration error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: "36px 20px 60px",
        background:
          "radial-gradient(circle at 12% 18%, rgba(201, 161, 58, 0.12), transparent 28%), radial-gradient(circle at 88% 82%, rgba(48, 75, 53, 0.1), transparent 32%), #FAF5EA",
        position: "relative",
      }}
    >
      {/* FLOATING BACK BUTTON */}
      <button
        type="button"
        onClick={() => navigate(`/login/${activeRole}`)}
        style={{
          position: "absolute",
          top: "24px",
          left: "24px",
          width: "42px",
          height: "42px",
          borderRadius: "50%",
          background: "#FFFDF9",
          border: "1.5px solid #D5C2A5",
          color: "#5C4A3A",
          display: "grid",
          placeItems: "center",
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          transition: "all 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateX(-2px)";
          e.currentTarget.style.borderColor = "#8C6435";
          e.currentTarget.style.color = "#2B1D12";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateX(0)";
          e.currentTarget.style.borderColor = "#D5C2A5";
          e.currentTarget.style.color = "#5C4A3A";
        }}
        aria-label="Back to sign in"
        title="Back to Sign In"
      >
        <ArrowLeft size={18} />
      </button>

      {/* BRAND LOGO HEADER */}
      <div style={{ marginBottom: "20px", textAlign: "center" }}>
        <div style={{ width: "110px", margin: "0 auto 8px" }}>
          <Logo />
        </div>
        <span
          style={{
            fontSize: "11px",
            letterSpacing: "2.5px",
            color: "#8C6435",
            fontWeight: 700,
            textTransform: "uppercase",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <Sparkles size={12} /> MADE TO CELEBRATE
        </span>
      </div>

      {/* MAIN REGISTRATION CONTAINER */}
      <section
        style={{
          width: "100%",
          maxWidth: "540px",
          background: "#FFFDF9",
          border: "1.5px solid #D5C2A5",
          borderRadius: "22px",
          padding: "32px 32px 28px",
          boxShadow: "0 18px 48px rgba(43, 29, 18, 0.08)",
          boxSizing: "border-box",
        }}
      >
        {/* HERO ROLE BANNER */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #FAF4E8 0%, #EFE5D3 100%)",
              border: "1.5px solid #D5C2A5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 10px",
              color: "#8C6435",
              boxShadow: "0 4px 12px rgba(140, 100, 53, 0.12)",
            }}
          >
            <RoleIcon size={22} />
          </div>

          <span
            style={{
              display: "inline-block",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "1.5px",
              color: "#8C6435",
              background: "#F8F3EC",
              padding: "3px 10px",
              borderRadius: "20px",
              marginBottom: "6px",
            }}
          >
            ✦ {currentRole.badge}
          </span>

          <h1
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "26px",
              fontWeight: 700,
              color: "#2B1D12",
              margin: "2px 0 6px",
            }}
          >
            {currentRole.title}
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "#766C67", lineHeight: "1.45" }}>
            {currentRole.subtitle}
          </p>
        </div>

        {/* ERROR NOTIFICATION */}
        {error && (
          <div
            style={{
              background: "#FEF2F2",
              border: "1px solid #FCA5A5",
              color: "#991B1B",
              padding: "11px 14px",
              borderRadius: "10px",
              marginBottom: "20px",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* FORM FIELDS */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* ROW 1: FULL NAME & EMAIL */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div>
              <label
                htmlFor="fullName"
                style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#3B2F27", marginBottom: "6px" }}
              >
                Full Name *
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: "#FAF7F2",
                  border: "1.5px solid #D5C2A5",
                  borderRadius: "10px",
                  padding: "0 14px",
                  height: "44px",
                  transition: "border-color 0.15s ease",
                }}
              >
                <UserRound size={17} color="#8C6435" />
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="e.g. Suddala Shryitha"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  style={{
                    width: "100%",
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontSize: "13.5px",
                    color: "#2B1D12",
                  }}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#3B2F27", marginBottom: "6px" }}
              >
                Email Address *
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: "#FAF7F2",
                  border: "1.5px solid #D5C2A5",
                  borderRadius: "10px",
                  padding: "0 14px",
                  height: "44px",
                }}
              >
                <Mail size={17} color="#8C6435" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  style={{
                    width: "100%",
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontSize: "13.5px",
                    color: "#2B1D12",
                  }}
                />
              </div>
            </div>
          </div>

          {/* ROW 2: PHONE NUMBER */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label htmlFor="phone" style={{ fontSize: "12px", fontWeight: 600, color: "#3B2F27" }}>
                Phone Number (10 digits) *
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {formData.phone ? (
                  formData.phone.length === 10 ? (
                    <span
                      style={{
                        fontSize: "11px",
                        color: "#166534",
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "3px",
                        background: "#DCFCE7",
                        padding: "2px 8px",
                        borderRadius: "12px",
                        border: "1px solid #86EFAC",
                      }}
                    >
                      <Check size={11} /> 10 Digits Valid
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: "11px",
                        color: "#DC2626",
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "3px",
                        background: "#FEE2E2",
                        padding: "2px 8px",
                        borderRadius: "12px",
                        border: "1px solid #FCA5A5",
                      }}
                    >
                      <AlertCircle size={11} /> {formData.phone.length}/10 digits (Need 10 digits)
                    </span>
                  )
                ) : (
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#166534",
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "3px",
                      background: "#DCFCE7",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      border: "1px solid #86EFAC",
                    }}
                  >
                    <MessageCircle size={11} /> WhatsApp Ready
                  </span>
                )}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "#FAF7F2",
                border: `1.5px solid ${
                  formData.phone && formData.phone.length !== 10
                    ? "#F87171"
                    : formData.phone && formData.phone.length === 10
                    ? "#86EFAC"
                    : "#D5C2A5"
                }`,
                borderRadius: "10px",
                padding: "0 14px",
                height: "44px",
              }}
            >
              <Phone size={17} color="#8C6435" />
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#8C6435", borderRight: "1px solid #D5C2A5", paddingRight: "8px" }}>
                +91
              </span>
              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="10-digit mobile number (e.g. 9876543210)"
                value={formData.phone}
                onChange={handlePhoneChange}
                maxLength={10}
                required
                style={{
                  width: "100%",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: "13.5px",
                  color: "#2B1D12",
                  letterSpacing: "1px",
                  fontWeight: 500,
                }}
              />
            </div>
            {formData.phone && formData.phone.length > 0 && formData.phone.length < 10 && (
              <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#DC2626", fontWeight: 600 }}>
                ⚠️ You entered {formData.phone.length} {formData.phone.length === 1 ? "digit" : "digits"}. A valid 10-digit mobile number is required.
              </p>
            )}
          </div>

          {/* ROLE-SPECIFIC FIELDS: VENDOR */}
          {activeRole === "vendor" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div>
                <label
                  htmlFor="businessName"
                  style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#3B2F27", marginBottom: "6px" }}
                >
                  Studio / Brand Name *
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    background: "#FAF7F2",
                    border: "1.5px solid #D5C2A5",
                    borderRadius: "10px",
                    padding: "0 14px",
                    height: "44px",
                  }}
                >
                  <Building2 size={17} color="#8C6435" />
                  <input
                    id="businessName"
                    name="businessName"
                    type="text"
                    placeholder="e.g. Royal Lens Studios"
                    value={formData.businessName}
                    onChange={handleChange}
                    required
                    style={{
                      width: "100%",
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      fontSize: "13.5px",
                      color: "#2B1D12",
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="category"
                  style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#3B2F27", marginBottom: "6px" }}
                >
                  Artisan Service Category *
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    background: "#FAF7F2",
                    border: "1.5px solid #D5C2A5",
                    borderRadius: "10px",
                    padding: "0 14px",
                    height: "44px",
                  }}
                >
                  <Briefcase size={17} color="#8C6435" />
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      fontSize: "13px",
                      color: "#2B1D12",
                      fontWeight: 500,
                    }}
                  >
                    <option value="Catering">Catering & Royal Banquet</option>
                    <option value="Venue & Halls">Venues & Heritage Halls</option>
                    <option value="Decoration">Floral & Stage Decoration</option>
                    <option value="Photography & Videography">Photography & 4K Cinema</option>
                    <option value="Sound & DJ">Sound, DJ & Live Music</option>
                    <option value="Transportation">Luxury Fleet & Escorts</option>
                    <option value="Live Streaming">Live Webcasting & AV</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ROLE-SPECIFIC FIELDS: VOLUNTEER */}
          {activeRole === "volunteer" && (
            <div>
              <label
                htmlFor="skills"
                style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#3B2F27", marginBottom: "6px" }}
              >
                Operational Specialization / Past Experience
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: "#FAF7F2",
                  border: "1.5px solid #D5C2A5",
                  borderRadius: "10px",
                  padding: "0 14px",
                  height: "44px",
                }}
              >
                <Award size={17} color="#8C6435" />
                <input
                  id="skills"
                  name="skills"
                  type="text"
                  placeholder="e.g. VIP Reception, Stage Staging, Surplus Food Rescue"
                  value={formData.skills}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontSize: "13.5px",
                    color: "#2B1D12",
                  }}
                />
              </div>
            </div>
          )}

          {/* ROW 3: PASSWORD & CONFIRM PASSWORD */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div>
              <label
                htmlFor="password"
                style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#3B2F27", marginBottom: "6px" }}
              >
                Create Password *
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: "#FAF7F2",
                  border: "1.5px solid #D5C2A5",
                  borderRadius: "10px",
                  padding: "0 14px",
                  height: "44px",
                }}
              >
                <LockKeyhole size={17} color="#8C6435" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 chars (Strong)"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  style={{
                    width: "100%",
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontSize: "13.5px",
                    color: "#2B1D12",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#766C67" }}
                  aria-label="Toggle password"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label htmlFor="confirmPassword" style={{ fontSize: "12px", fontWeight: 600, color: "#3B2F27" }}>
                  Confirm Password *
                </label>
                {passwordsMatch && (
                  <span style={{ fontSize: "11px", color: "#166534", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "3px" }}>
                    <Check size={12} /> Match
                  </span>
                )}
                {passwordsMismatch && (
                  <span style={{ fontSize: "11px", color: "#DC2626", fontWeight: 600 }}>
                    Mismatch
                  </span>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: "#FAF7F2",
                  border: `1.5px solid ${passwordsMismatch ? "#F87171" : passwordsMatch ? "#86EFAC" : "#D5C2A5"}`,
                  borderRadius: "10px",
                  padding: "0 14px",
                  height: "44px",
                }}
              >
                <LockKeyhole size={17} color="#8C6435" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Repeat password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  style={{
                    width: "100%",
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontSize: "13.5px",
                    color: "#2B1D12",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((p) => !p)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#766C67" }}
                  aria-label="Toggle confirm password"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* PASSWORD STRENGTH & WARNING INDICATOR */}
          {formData.password && (
            <div style={{ marginTop: "-6px" }}>
              <div style={{ display: "flex", gap: "5px", height: "4px", marginBottom: "4px" }}>
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    style={{
                      flex: 1,
                      borderRadius: "2px",
                      background:
                        passwordCriteria.score >= step
                          ? strengthColors[passwordCriteria.score - 1]
                          : "#E5E0D8",
                      transition: "background 0.2s ease",
                    }}
                  />
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "#766C67" }}>
                <span>Security Level:</span>
                <strong style={{ color: passwordCriteria.isCommonWeak ? "#EF4444" : strengthColors[passwordCriteria.score - 1] || "#EF4444" }}>
                  {passwordCriteria.isCommonWeak ? "Very Weak (Easily Guessed)" : strengthLabels[passwordCriteria.score - 1] || "Very Weak"}
                </strong>
              </div>

              {/* WARNING BOX IF PASSWORD IS WEAK (LIKE 123456) */}
              {(passwordCriteria.isCommonWeak || passwordCriteria.isWeak) && (
                <div
                  style={{
                    marginTop: "8px",
                    padding: "8px 12px",
                    background: "#FEF2F2",
                    border: "1px solid #FCA5A5",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                  }}
                >
                  <AlertCircle size={15} color="#DC2626" style={{ marginTop: "2px", flexShrink: 0 }} />
                  <div style={{ fontSize: "11.5px", color: "#991B1B", lineHeight: 1.4 }}>
                    <strong>Weak password warning:</strong>{" "}
                    {passwordCriteria.isCommonWeak
                      ? `"${formData.password}" is too weak and easily guessed. Please change this to a strong password.`
                      : "Use a strong password: minimum 8 characters with uppercase, lowercase, numbers, and special symbols (!@#$)."}
                  </div>
                </div>
              )}

              {/* CRITERIA CHECKLIST */}
              <div
                style={{
                  marginTop: "8px",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "4px 8px",
                  fontSize: "11px",
                  color: "#6B5240",
                  background: "#FAF7F2",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #E5E0D8",
                }}
              >
                <span style={{ color: passwordCriteria.hasMinLen ? "#166534" : "#9CA3AF", display: "flex", alignItems: "center", gap: "4px" }}>
                  {passwordCriteria.hasMinLen ? "✓" : "○"} At least 8 characters
                </span>
                <span style={{ color: passwordCriteria.hasUpper && passwordCriteria.hasLower ? "#166534" : "#9CA3AF", display: "flex", alignItems: "center", gap: "4px" }}>
                  {passwordCriteria.hasUpper && passwordCriteria.hasLower ? "✓" : "○"} Upper & lowercase (Aa)
                </span>
                <span style={{ color: passwordCriteria.hasNum ? "#166534" : "#9CA3AF", display: "flex", alignItems: "center", gap: "4px" }}>
                  {passwordCriteria.hasNum ? "✓" : "○"} At least one number (0-9)
                </span>
                <span style={{ color: passwordCriteria.hasSpecial ? "#166534" : "#9CA3AF", display: "flex", alignItems: "center", gap: "4px" }}>
                  {passwordCriteria.hasSpecial ? "✓" : "○"} Special symbol (!@#$)
                </span>
              </div>
            </div>
          )}

          {/* WHATSAPP NOTIFICATION PERK CARD */}
          <div
            style={{
              padding: "14px 16px",
              background: "#F7FAF5",
              border: "1.5px solid #DCFCE7",
              borderRadius: "12px",
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              marginTop: "4px",
            }}
          >
            <input
              id="whatsappOptIn"
              name="whatsappOptIn"
              type="checkbox"
              checked={formData.whatsappOptIn}
              onChange={handleChange}
              style={{
                accentColor: "#16A34A",
                width: "18px",
                height: "18px",
                cursor: "pointer",
                marginTop: "2px",
                flexShrink: 0,
              }}
            />
            <label
              htmlFor="whatsappOptIn"
              style={{
                fontSize: "12.5px",
                color: "#2B1D12",
                lineHeight: 1.45,
                cursor: "pointer",
                margin: 0,
              }}
            >
              <strong style={{ color: "#166534", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <MessageCircle size={14} color="#16A34A" /> Automated WhatsApp Celebration Alerts (Recommended)
              </strong>
              <span style={{ display: "block", color: "#584C47", marginTop: "2px", fontSize: "11.5px" }}>
                Receive instant commercial proposals, date lock assurances, and schedule reminders directly on WhatsApp.
              </span>
            </label>
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              height: "48px",
              border: "none",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #8C6435 0%, #C9A13A 50%, #8C6435 100%)",
              color: "#FFFFFF",
              fontSize: "14.5px",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              letterSpacing: "0.5px",
              boxShadow: "0 6px 18px rgba(140, 100, 53, 0.28)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              marginTop: "6px",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(140, 100, 53, 0.35)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 6px 18px rgba(140, 100, 53, 0.28)";
            }}
          >
            {loading ? (
              <>
                <Sparkles size={16} style={{ animation: "spin 1.5s linear infinite" }} />
                <span>Crafting Your EVORA Account…</span>
              </>
            ) : (
              <>
                <span>Complete Registration</span>
                <CheckCircle2 size={16} />
              </>
            )}
          </button>
        </form>

        {/* FOOTER LINK TO SIGN IN */}
        <div
          style={{
            marginTop: "22px",
            textAlign: "center",
            fontSize: "13px",
            color: "#766C67",
            borderTop: "1px solid #EBE2D4",
            paddingTop: "16px",
          }}
        >
          <span>Already have an EVORA account?</span>{" "}
          <Link
            to={`/login/${activeRole}`}
            style={{
              color: "#8C6435",
              fontWeight: 700,
              textDecoration: "none",
              marginLeft: "4px",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
          >
            Sign In Here &rarr;
          </Link>
        </div>
      </section>
    </main>
  );
};

export default Register;

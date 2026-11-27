import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../../components/common/Logo";
import { useAuth } from "../../context/useAuth";

const Splash = () => {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && currentUser?.role) {
      const roleHomeMap = {
        user: "/user",
        vendor: "/vendor",
        volunteer: "/volunteer",
        admin: "/admin",
      };
      navigate(roleHomeMap[currentUser.role] || "/roles", { replace: true });
    }
  }, [isAuthenticated, currentUser, navigate]);

  const handleStart = () => {
    navigate("/roles");
  };

  return (
    <main className="splash-page">
      <div className="splash-phone">
        <div className="splash-flower splash-flower-top">✦</div>

        <div className="splash-content">
          <div className="splash-logo">
            <Logo />
          </div>

          <p className="splash-message">
            Every moment
            <br />
            matters.
          </p>

          <button className="splash-start" onClick={handleStart}>
            Get Started
          </button>

          <button className="splash-skip" onClick={handleStart}>
            Skip
          </button>
        </div>

        <div className="splash-floral-left">❀</div>

        <div className="splash-floral-bottom">❀</div>
      </div>
    </main>
  );
};

export default Splash;

import { useNavigate } from "react-router-dom";
import Logo from "../../components/common/Logo";

const Splash = () => {
  const navigate = useNavigate();

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

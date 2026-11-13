import evoraLogo from "../../assets/images/evora-logo.png";
import "./Logo.css";

const Logo = () => {
  return (
    <div className="evora-logo">
      <img src={evoraLogo} alt="EVORA - Made to Celebrate" />
    </div>
  );
};

export default Logo;

import { ArrowRight, Sparkles } from 'lucide-react';
import Logo from '../../components/common/Logo';

const VendorWelcome = () => {
  return (
    <div className="vendor-welcome">
      <div className="welcome-decoration top">✦</div>

      <Logo />

      <div className="welcome-content">
        <Sparkles size={28} strokeWidth={1.5} />

        <h1>Grow Your Business</h1>

        <p>
          Join Evora as a trusted event partner and connect
          your services with memorable celebrations.
        </p>

        <div className="vendor-card">
          <h2>Vendor Partner</h2>

          <p>
            Manage your services, event requests, orders,
            earnings and bookings in one place.
          </p>
        </div>

        <button className="primary-button">
          Get Started
          <ArrowRight size={18} />
        </button>
      </div>

      <div className="welcome-decoration bottom">✦</div>
    </div>
  );
};

export default VendorWelcome;
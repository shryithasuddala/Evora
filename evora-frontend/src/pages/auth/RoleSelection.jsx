import { useNavigate } from "react-router-dom";
import {
  UserRound,
  Store,
  HandHeart,
  ShieldCheck,
} from "lucide-react";
import Logo from "../../components/common/Logo";

const roles = [
  {
    id: "user",
    title: "USER",
    description: "Discover events & create memories",
    icon: UserRound,
  },
  {
    id: "vendor",
    title: "VENDOR",
    description: "Offer services & manage orders",
    icon: Store,
  },
  {
    id: "volunteer",
    title: "VOLUNTEER",
    description: "Support events & manage tasks",
    icon: HandHeart,
  },
  {
    id: "admin",
    title: "ADMIN",
    description: "Manage the entire EVORA platform",
    icon: ShieldCheck,
  },
];

const RoleSelection = () => {
  const navigate = useNavigate();

  const handleRoleSelect = (role) => {
    navigate(`/login/${role}`);
  };

  return (
    <main className="role-selection-page">

      {/* EVORA BRAND */}

      <header className="role-brand">

        <div className="brand-mark">
          <Logo />
        </div>

        <div className="brand-name">
          EVORA
        </div>

      </header>


      {/* DECORATIONS */}

      <span className="decor decor-top-left">
        ✦
      </span>

      <span className="decor decor-top-right">
        ✦
      </span>

      <span className="decor decor-middle-left">
        ❈
      </span>

      <span className="decor decor-middle-right">
        ✧
      </span>


      {/* CONTENT */}

      <section className="role-content">

        <div className="role-title">

          <p className="welcome-text">
            Welcome to
          </p>

          <h1>
            EVORA
          </h1>

          <p className="choose-text">
            Choose your role to continue
          </p>

        </div>


        {/* ROLE CARDS */}

        <div className="role-options">

          {roles.map((role) => {

            const Icon = role.icon;

            return (
              <button
                key={role.id}
                type="button"
                className="role-option"
                onClick={() =>
                  handleRoleSelect(role.id)
                }
              >

                <div className="role-icon-circle">

                  <Icon
                    size={25}
                    strokeWidth={1.4}
                  />

                </div>

                <h2>
                  {role.title}
                </h2>

                <p>
                  {role.description}
                </p>

              </button>
            );
          })}

        </div>

      </section>


      {/* BOTTOM DECORATION */}

      <div className="bottom-decoration">

        <span>❦</span>

        <span>✦</span>

        <span>❦</span>

      </div>

    </main>
  );
};

export default RoleSelection;
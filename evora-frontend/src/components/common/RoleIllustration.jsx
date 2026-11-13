const RoleIllustration = ({ type }) => {
  if (type === "user") {
    return (
      <svg viewBox="0 0 180 150" className="role-illustration">
        <circle cx="90" cy="75" r="65" fill="#EEE8D8" />

        <circle cx="90" cy="57" r="22" fill="#D5B36A" />

        <path d="M52 119c4-25 20-38 38-38s34 13 38 38" fill="#718365" />

        <rect
          x="115"
          y="25"
          width="34"
          height="42"
          rx="6"
          fill="#FFFDF8"
          stroke="#C9A13A"
          strokeWidth="3"
        />

        <path
          d="M122 37h20M122 46h14M122 55h18"
          stroke="#304B35"
          strokeWidth="3"
          strokeLinecap="round"
        />

        <circle cx="145" cy="26" r="8" fill="#C9A13A" />

        <path d="M142 26l2 2 4-5" fill="none" stroke="white" strokeWidth="2" />
      </svg>
    );
  }

  if (type === "vendor") {
    return (
      <svg viewBox="0 0 180 150" className="role-illustration">
        <circle cx="90" cy="75" r="65" fill="#EEE8D8" />

        <path d="M43 61h94l-10-28H53z" fill="#C9A13A" />

        <path
          d="M43 61c0 10 8 16 16 16s16-6 16-16c0 10 8 16 16 16s16-6 16-16c0 10 8 16 16 16s16-6 16-16"
          fill="#304B35"
        />

        <rect
          x="51"
          y="77"
          width="78"
          height="51"
          rx="4"
          fill="#FFFDF8"
          stroke="#304B35"
          strokeWidth="3"
        />

        <rect x="78" y="96" width="25" height="32" fill="#718365" />

        <circle cx="118" cy="91" r="7" fill="#C9A13A" />

        <path
          d="M64 89h12"
          stroke="#C9A13A"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (type === "volunteer") {
    return (
      <svg viewBox="0 0 180 150" className="role-illustration">
        <circle cx="90" cy="75" r="65" fill="#EEE8D8" />

        <circle cx="70" cy="54" r="18" fill="#D5B36A" />

        <path d="M43 115c3-25 14-39 27-39s24 14 27 39" fill="#718365" />

        <path
          d="M91 94c14-24 29-28 40-18 7 6 4 16-4 20l-26 15"
          fill="#C9A13A"
        />

        <path
          d="M99 90c9-10 18-12 26-6"
          fill="none"
          stroke="#304B35"
          strokeWidth="5"
          strokeLinecap="round"
        />

        <path
          d="M119 38c0-8 12-8 12 0 0-8 12-8 12 0 0 9-12 15-12 15s-12-6-12-15z"
          fill="#C9A13A"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 180 150" className="role-illustration">
      <circle cx="90" cy="75" r="65" fill="#EEE8D8" />

      <rect
        x="42"
        y="43"
        width="96"
        height="67"
        rx="8"
        fill="#FFFDF8"
        stroke="#304B35"
        strokeWidth="4"
      />

      <rect x="42" y="43" width="96" height="15" rx="8" fill="#304B35" />

      <circle cx="55" cy="50" r="3" fill="#C9A13A" />
      <circle cx="65" cy="50" r="3" fill="#C9A13A" />
      <circle cx="75" cy="50" r="3" fill="#C9A13A" />

      <rect x="55" y="70" width="23" height="27" rx="3" fill="#718365" />

      <rect x="84" y="70" width="42" height="7" rx="3" fill="#C9A13A" />

      <rect x="84" y="83" width="32" height="7" rx="3" fill="#EEE8D8" />

      <rect x="84" y="96" width="22" height="7" rx="3" fill="#EEE8D8" />

      <circle cx="135" cy="35" r="12" fill="#C9A13A" />

      <path d="M129 35l4 4 7-9" fill="none" stroke="white" strokeWidth="3" />
    </svg>
  );
};

export default RoleIllustration;

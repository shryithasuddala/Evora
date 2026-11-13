const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Verify JWT and attach user to req
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: "Not authorised — no token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return res.status(401).json({ success: false, message: "User account no longer exists." });
    }

    if (!req.user.isActive) {
      return res.status(403).json({ success: false, message: "Your account has been suspended." });
    }

    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
};

// Restrict to specific roles (alias: restrictTo)
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not permitted to access this resource.`,
      });
    }
    next();
  };
};

module.exports = {
  protect,
  authorize,
  restrictTo: authorize,
};

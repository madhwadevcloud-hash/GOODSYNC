/**
 * Middleware to check if the user has the required role(s)
 * @param {Array} allowedRoles - Array of allowed roles for the route
 * @returns {Function} - Express middleware function
 */
const roleCheck = (allowedRoles) => {
  return (req, res, next) => {
    // Check if user exists and has a role property
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User not authenticated or role not defined.'
      });
    }

    // Check if user's role is included in the allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. ${req.user.role} role is not authorized for this action.`
      });
    }

    // If role check passes, continue to the next middleware/route handler
    next();
  };
};

module.exports = roleCheck;

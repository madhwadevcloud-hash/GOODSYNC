/**
 * JWT-Enforced Tenancy Middleware
 * 
 * Ensures school-scoped routes always derive schoolCode from the authenticated
 * user's JWT token, never from user-controllable request fields.
 * 
 * Superadmins are exempt — they can target any school via URL params.
 * All other roles are locked to their own school.
 */

/**
 * Enforce that the schoolCode for the request matches the JWT-derived schoolCode.
 * For non-superadmin users, this OVERRIDES any schoolCode from params/body/query
 * with the value from the JWT token. If a mismatch is detected, the request is rejected.
 * 
 * Usage: router.use(enforceJwtTenancy) — apply after auth middleware.
 */
const enforceJwtTenancy = (req, res, next) => {
  try {
    // Skip tenancy enforcement for superadmins — they manage all schools
    if (req.user?.role === 'superadmin') {
      return next();
    }

    const jwtSchoolCode = req.user?.schoolCode;

    if (!jwtSchoolCode) {
      console.error(`[TENANCY] No schoolCode in JWT for user: ${req.user?.userId || req.user?._id}`);
      return res.status(403).json({
        success: false,
        message: 'Access denied. No school association found for your account.'
      });
    }

    // Gather all schoolCode values from the request
    const requestSchoolCode = 
      req.params?.schoolCode || 
      req.params?.schoolId || 
      req.body?.schoolCode || 
      req.query?.schoolCode ||
      req.headers?.['x-school-code'];

    // If a schoolCode was specified in the request, validate it matches the JWT
    if (requestSchoolCode && requestSchoolCode.toUpperCase() !== jwtSchoolCode.toUpperCase()) {
      console.warn(
        `🚫 [TENANCY VIOLATION] User ${req.user?.userId || req.user?._id} ` +
        `(school: ${jwtSchoolCode}) attempted to access school: ${requestSchoolCode} ` +
        `on ${req.method} ${req.originalUrl}`
      );
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to access this school\'s data.'
      });
    }

    // Override all request-level schoolCode values with the JWT-derived value
    // This ensures downstream handlers always use the trusted value
    req.schoolCode = jwtSchoolCode;
    if (req.params?.schoolCode) req.params.schoolCode = jwtSchoolCode;
    if (req.params?.schoolId) req.params.schoolId = jwtSchoolCode;
    if (req.body?.schoolCode) req.body.schoolCode = jwtSchoolCode;
    if (req.query?.schoolCode) req.query.schoolCode = jwtSchoolCode;

    next();
  } catch (error) {
    console.error('[TENANCY] Error in tenancy enforcement:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal error during access validation.'
    });
  }
};

module.exports = { enforceJwtTenancy };

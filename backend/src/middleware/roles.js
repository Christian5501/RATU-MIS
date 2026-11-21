/**
 * Role-based access control -- the application-layer mirror of the
 * network's VLAN ACLs. Just as VLAN 40 (Students) is denied a path to
 * VLAN 20 (Finance) at the network layer, this middleware denies a
 * student-role token any route reserved for finance or admin.
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        detail: `Role '${req.user.role}' cannot access this resource`,
      });
    }
    next();
  };
}

module.exports = { requireRole };

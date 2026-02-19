// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const pool = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

/**
 * Middleware to authenticate JWT tokens
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verify user still exists and is active
    if (decoded.role === 'Admin') {
      const [admins] = await pool.query(
        'SELECT id, is_active FROM admins WHERE id = ?',
        [decoded.id]
      );
      
      if (admins.length === 0 || !admins[0].is_active) {
        return res.status(401).json({
          success: false,
          message: 'Admin account not found or inactive'
        });
      }
    } else if (decoded.role === 'Patient') {
      // For patients, we can verify against beneficiaries table
      const [beneficiaries] = await pool.query(
        'SELECT id FROM beneficiaries WHERE id = ?',
        [decoded.beneficiaryId || decoded.id]
      );
      
      if (beneficiaries.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Patient account not found'
        });
      }
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error('[Auth Middleware] Token verification error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Token verification failed'
    });
  }
};

/**
 * Middleware to check if user is admin
 */
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
};

/**
 * Middleware to check if user is patient
 */
const requirePatient = (req, res, next) => {
  if (req.user && req.user.role === 'Patient') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Patient access required'
    });
  }
};

/**
 * Middleware to check specific admin permissions
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (req.user && req.user.role === 'Admin') {
      const permissions = req.user.permissions || [];
      if (permissions.includes(permission) || permissions.includes('*')) {
        next();
      } else {
        return res.status(403).json({
          success: false,
          message: `Permission '${permission}' required`
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
  };
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    // Ignore token errors for optional auth
    next();
  }
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requirePatient,
  requirePermission,
  optionalAuth
};

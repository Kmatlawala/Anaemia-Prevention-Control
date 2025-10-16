const jwt = require('jsonwebtoken');
const pool = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

/**
 * JWT Authentication Middleware
 * Verifies JWT token and adds user info to request object
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        errorType: 'NO_TOKEN'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Handle patient users (no database check needed)
    if (decoded.type === 'patient') {
      req.user = {
        id: decoded.id,
        role: decoded.role || 'Patient',
        type: 'patient'
      };
      return next();
    }
    
    // Handle admin users (check database)
    const [rows] = await pool.query('SELECT id, username FROM admins WHERE id = ?', [decoded.id]);
    
    if (!rows.length) {
      return res.status(401).json({ 
        error: 'User not found',
        errorType: 'USER_NOT_FOUND'
      });
    }

    // Add user info to request object
    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role || 'Admin'
    };

    next();
  } catch (error) {
    console.error('[AUTH] Token verification failed:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        errorType: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        errorType: 'INVALID_TOKEN'
      });
    }
    
    return res.status(500).json({ 
      error: 'Authentication failed',
      errorType: 'AUTH_ERROR'
    });
  }
};

/**
 * Optional authentication middleware
 * Doesn't fail if no token is provided, but adds user info if token is valid
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const [rows] = await pool.query('SELECT id, username FROM admins WHERE id = ?', [decoded.id]);
    
    if (rows.length) {
      req.user = {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role || 'Admin'
      };
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    // For optional auth, we don't fail on token errors
    req.user = null;
    next();
  }
};

/**
 * Role-based authorization middleware
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        errorType: 'AUTH_REQUIRED'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        errorType: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole
};

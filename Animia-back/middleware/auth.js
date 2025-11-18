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
    try {
      // Try query with different column combinations - handle various table schemas
      let rows;
      try {
        // Try with full schema first (name, email, is_active)
        [rows] = await pool.query('SELECT id, name, email, is_active FROM admins WHERE id = ?', [decoded.id]);
      } catch (error1) {
        // If name column doesn't exist, try without it
        if (error1.code === 'ER_BAD_FIELD_ERROR' && error1.sqlMessage && error1.sqlMessage.includes('name')) {
          try {
            [rows] = await pool.query('SELECT id, email, is_active FROM admins WHERE id = ?', [decoded.id]);
          } catch (error2) {
            // If email column doesn't exist, try with username
            if (error2.code === 'ER_BAD_FIELD_ERROR' && error2.sqlMessage && error2.sqlMessage.includes('email')) {
              try {
                [rows] = await pool.query('SELECT id, username, is_active FROM admins WHERE id = ?', [decoded.id]);
              } catch (error3) {
                // If is_active doesn't exist, try minimal
                if (error3.code === 'ER_BAD_FIELD_ERROR' && error3.sqlMessage && error3.sqlMessage.includes('is_active')) {
                  try {
                    [rows] = await pool.query('SELECT id, username FROM admins WHERE id = ?', [decoded.id]);
                  } catch (error4) {
                    // Last resort: just id
                    [rows] = await pool.query('SELECT id FROM admins WHERE id = ?', [decoded.id]);
                  }
                } else {
                  throw error3;
                }
              }
            } else if (error2.code === 'ER_BAD_FIELD_ERROR' && error2.sqlMessage && error2.sqlMessage.includes('is_active')) {
              // Email exists but is_active doesn't
              try {
                [rows] = await pool.query('SELECT id, email FROM admins WHERE id = ?', [decoded.id]);
              } catch (error5) {
                // Email might not exist either
                if (error5.code === 'ER_BAD_FIELD_ERROR' && error5.sqlMessage && error5.sqlMessage.includes('email')) {
                  [rows] = await pool.query('SELECT id, username FROM admins WHERE id = ?', [decoded.id]);
                } else {
                  throw error5;
                }
              }
            } else {
              throw error2;
            }
          }
        } else if (error1.code === 'ER_BAD_FIELD_ERROR' && error1.sqlMessage && error1.sqlMessage.includes('email')) {
          // Email doesn't exist, try username
          try {
            [rows] = await pool.query('SELECT id, username, is_active FROM admins WHERE id = ?', [decoded.id]);
          } catch (error6) {
            if (error6.code === 'ER_BAD_FIELD_ERROR' && error6.sqlMessage && error6.sqlMessage.includes('is_active')) {
              [rows] = await pool.query('SELECT id, username FROM admins WHERE id = ?', [decoded.id]);
            } else {
              throw error6;
            }
          }
        } else {
          throw error1;
        }
      }
      
      if (!rows || !rows.length) {
        console.log('[AUTH] Admin not found in database for id:', decoded.id);
        return res.status(401).json({ 
          error: 'User not found or inactive',
          errorType: 'USER_NOT_FOUND'
        });
      }
      
      // Check is_active if column exists (may not exist in old schema)
      if (rows[0].hasOwnProperty('is_active') && !rows[0].is_active) {
        console.log('[AUTH] Admin is inactive for id:', decoded.id);
        return res.status(401).json({ 
          error: 'User not found or inactive',
          errorType: 'USER_NOT_FOUND'
        });
      }

      // Add user info to request object - handle different column names
      req.user = {
        id: decoded.id,
        name: rows[0].name || rows[0].email || rows[0].username || 'Admin',
        email: rows[0].email || rows[0].username || decoded.email || null,
        username: rows[0].username || rows[0].email || null,
        role: decoded.role || 'Admin',
        permissions: decoded.permissions || []
      };

      next();
    } catch (dbError) {
      console.error('[AUTH] Database query failed:', dbError.message);
      console.error('[AUTH] Error code:', dbError.code);
      
      return res.status(500).json({ 
        error: 'Database error during authentication',
        errorType: 'DB_ERROR'
      });
    }
  } catch (error) {
    console.error('[AUTH] Token verification failed:', error.message);
    console.error('[AUTH] Error stack:', error.stack);
    
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

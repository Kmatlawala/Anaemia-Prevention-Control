// health-check.js - Database and server health monitoring
const pool = require('./db');

const healthCheck = async () => {
  try {
    const start = Date.now();
    const [rows] = await pool.query('SELECT 1 as test');
    const dbTime = Date.now() - start;
    const poolStatus = {
      totalConnections: pool._allConnections ? pool._allConnections.length : 0,
      freeConnections: pool._freeConnections ? pool._freeConnections.length : 0,
      acquiringConnections: pool._acquiringConnections ? pool._acquiringConnections.length : 0,
      connectionLimit: pool.config.connectionLimit
    };
    const [adminCount] = await pool.query('SELECT COUNT(*) as count FROM admins');
    return {
      status: 'healthy',
      database: {
        connected: true,
        responseTime: dbTime,
        poolStatus
      },
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('[HEALTH] Health check failed:', error);
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

// Run health check every 30 seconds
setInterval(healthCheck, 30000);

// Export for manual testing
module.exports = { healthCheck };

// Run initial health check
healthCheck().then(result => {
});

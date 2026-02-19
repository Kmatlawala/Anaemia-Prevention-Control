// setup-dot.js - Setup DOT (Directly Observed Treatment) database
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'animia',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function setupDOTDatabase() {
  let connection;
  
  try {
    console.log('🏥 Setting up DOT (Directly Observed Treatment) database...');
    
    connection = await pool.getConnection();
    
    // Create DOT adherence table
    console.log('📊 Creating dot_adherence table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS dot_adherence (
        id INT AUTO_INCREMENT PRIMARY KEY,
        beneficiary_id INT NOT NULL,
        taken_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        -- Foreign key constraint
        FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries(id) ON DELETE CASCADE,
        
        -- Unique constraint to prevent duplicate entries for same day
        UNIQUE KEY unique_beneficiary_date (beneficiary_id, taken_date),
        
        -- Indexes for better performance
        INDEX idx_beneficiary_id (beneficiary_id),
        INDEX idx_taken_date (taken_date),
        INDEX idx_beneficiary_date (beneficiary_id, taken_date)
      ) COMMENT = 'Tracks daily IFA adherence for DOT (Directly Observed Treatment)'
    `);
    
    console.log('✅ DOT adherence table created successfully');
    
    // Check if beneficiaries table exists
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'beneficiaries'
    `, [process.env.DB_NAME || 'animia']);
    
    if (tables.length === 0) {
      console.log('⚠️  Warning: beneficiaries table not found. Please run the main database setup first.');
      return;
    }
    
    // Get count of beneficiaries with IFA interventions
    const [beneficiariesWithIFA] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM beneficiaries b
      LEFT JOIN interventions i ON b.id = i.beneficiary_id
      WHERE i.ifa_yes = 'yes'
    `);
    
    console.log(`📈 Found ${beneficiariesWithIFA[0].count} beneficiaries with IFA interventions`);
    
    // Insert sample adherence data for testing (optional)
    if (process.argv.includes('--with-sample-data')) {
      console.log('📝 Inserting sample adherence data...');
      
      // Get first beneficiary with IFA
      const [firstBeneficiary] = await connection.execute(`
        SELECT b.id, b.name
        FROM beneficiaries b
        LEFT JOIN interventions i ON b.id = i.beneficiary_id
        WHERE i.ifa_yes = 'yes'
        LIMIT 1
      `);
      
      if (firstBeneficiary.length > 0) {
        const beneficiaryId = firstBeneficiary[0].id;
        const beneficiaryName = firstBeneficiary[0].name;
        
        // Insert sample data for last 7 days
        const today = new Date();
        for (let i = 0; i < 7; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateString = date.toISOString().split('T')[0];
          
          // Randomly mark some days as taken (80% chance)
          if (Math.random() > 0.2) {
            await connection.execute(`
              INSERT IGNORE INTO dot_adherence (beneficiary_id, taken_date)
              VALUES (?, ?)
            `, [beneficiaryId, dateString]);
          }
        }
        
        console.log(`✅ Sample adherence data inserted for ${beneficiaryName} (ID: ${beneficiaryId})`);
      }
    }
    
    console.log('🎉 DOT database setup completed successfully!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Restart your backend server');
    console.log('2. Test the DOT endpoints:');
    console.log('   - GET /api/dot/today-adherence/:beneficiaryId');
    console.log('   - GET /api/dot/adherence-data/:beneficiaryId');
    console.log('   - POST /api/dot/mark-ifa-taken');
    console.log('   - GET /api/dot/adherence-report');
    console.log('3. Check the Reports screen for DOT adherence data');
    
  } catch (error) {
    console.error('❌ Error setting up DOT database:', error);
    process.exit(1);
  } finally {
    if (connection) {
      connection.release();
    }
    await pool.end();
  }
}

// Run the setup
setupDOTDatabase();

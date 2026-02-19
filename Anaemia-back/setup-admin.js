// setup-admin.js
// Script to set up admin table and create default admin user
const mysql = require('mysql2/promise');
require('dotenv').config();

const setupAdmin = async () => {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'animia',
      multipleStatements: true
    });

    console.log('🔗 Connected to database');

    // Create admin table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        permissions JSON DEFAULT NULL,
        last_login TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    console.log('✅ Admin table created/verified');

    // Check if default admin exists
    const [existingAdmins] = await connection.execute(
      'SELECT id FROM admins WHERE email = ?',
      ['admin@animia.com']
    );

    if (existingAdmins.length === 0) {
      // Create default admin user
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash('admin123', 12);
      
      await connection.execute(
        'INSERT INTO admins (name, email, password_hash, is_active) VALUES (?, ?, ?, ?)',
        ['System Administrator', 'admin@animia.com', passwordHash, true]
      );

      console.log('✅ Default admin user created');
      console.log('📧 Email: admin@animia.com');
      console.log('🔑 Password: admin123');
      console.log('⚠️  IMPORTANT: Change the default password after first login!');
    } else {
      console.log('ℹ️  Default admin user already exists');
    }

    // Add email and unique_id columns to beneficiaries table if they don't exist
    try {
      await connection.execute(`
        ALTER TABLE beneficiaries 
        ADD COLUMN email VARCHAR(255) NULL,
        ADD COLUMN unique_id VARCHAR(10) UNIQUE NULL
      `);
      console.log('✅ Added email and unique_id columns to beneficiaries table');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  Email and unique_id columns already exist in beneficiaries table');
      } else {
        throw error;
      }
    }

    // Add indexes for better performance
    try {
      await connection.execute('CREATE INDEX IF NOT EXISTS idx_beneficiaries_email ON beneficiaries(email)');
      await connection.execute('CREATE INDEX IF NOT EXISTS idx_beneficiaries_phone ON beneficiaries(phone)');
      await connection.execute('CREATE INDEX IF NOT EXISTS idx_beneficiaries_alt_phone ON beneficiaries(alt_phone)');
      await connection.execute('CREATE INDEX IF NOT EXISTS idx_beneficiaries_short_id ON beneficiaries(short_id)');
      await connection.execute('CREATE INDEX IF NOT EXISTS idx_beneficiaries_unique_id ON beneficiaries(unique_id)');
      console.log('✅ Performance indexes created');
    } catch (error) {
      console.log('ℹ️  Some indexes may already exist:', error.message);
    }

    console.log('🎉 Admin setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Start your server: yarn dev');
    console.log('2. Test admin login with: admin@animia.com / admin123');
    console.log('3. Change the default password immediately');
    console.log('4. Create additional admin users as needed');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
};

// Run setup
setupAdmin();

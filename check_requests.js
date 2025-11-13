require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function checkRequests() {
  try {
    console.log('🔌 Connecting to:', process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@'));
    
    const result = await pool.query('SELECT * FROM requests ORDER BY created_at DESC LIMIT 10');
    console.log('\n📋 Recent Requests in Database:');
    console.log('================================');
    
    if (result.rows.length === 0) {
      console.log('❌ No requests found in database');
    } else {
      result.rows.forEach((req, index) => {
        console.log(`\n${index + 1}. Request #${req.id}`);
        console.log(`   Phone: ${req.requester_phone}`);
        console.log(`   User ID: ${req.requester_id || 'NULL (not linked)'}`);
        console.log(`   Type: ${req.request_type}`);
        console.log(`   Status: ${req.status}`);
        console.log(`   Created: ${req.created_at}`);
      });
    }
    
    // Check users
    const users = await pool.query('SELECT id, email, phone, first_name, last_name FROM users ORDER BY created_at DESC LIMIT 5');
    console.log('\n\n👥 Recent Users in Database:');
    console.log('================================');
    
    if (users.rows.length === 0) {
      console.log('❌ No users found in database');
    } else {
      users.rows.forEach((user, index) => {
        console.log(`\n${index + 1}. User #${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Phone: ${user.phone}`);
        console.log(`   Name: ${user.first_name} ${user.last_name}`);
      });
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkRequests();

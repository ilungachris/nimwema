const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function debugUserCreation() {
  try {
    console.log('🔍 Checking recent users in database...');
    const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC LIMIT 5');
    console.log('Recent users:');
    result.rows.forEach(row => {
      console.log(`  ${row.id}: ${row.first_name} ${row.last_name} - ${row.phone} - ${row.email} - ${row.role}`);
    });
    
    console.log('\n🔍 Checking recent orders in database...');
    const ordersResult = await pool.query('SELECT id, sender_phone, status, created_at FROM orders ORDER BY created_at DESC LIMIT 5');
    console.log('Recent orders:');
    ordersResult.rows.forEach(row => {
      console.log(`  ${row.id}: ${row.sender_phone} - ${row.status} - ${row.created_at}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('❌ Debug error:', error.message);
    await pool.end();
  }
}

debugUserCreation();

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function checkFormat() {
  try {
    const result = await pool.query('SELECT * FROM requests LIMIT 1');
    console.log('\n📋 Database Request Format:');
    console.log(JSON.stringify(result.rows[0], null, 2));
    
    console.log('\n📋 Field Names:');
    console.log(Object.keys(result.rows[0]));
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkFormat();

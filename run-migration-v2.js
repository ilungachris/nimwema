/**
 * Run Database Migration - Version 2
 * Executes the entire schema.sql file as one transaction
 */

require('dotenv').config();
const fs = require('fs');
const { Client } = require('pg');

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🚀 Starting database migration...\n');
    
    // Connect to database
    await client.connect();
    console.log('✅ Connected to database\n');
    
    // Read schema file
    console.log('📖 Reading schema.sql...');
    const schema = fs.readFileSync('./database/schema.sql', 'utf8');
    
    console.log('📝 Executing migration...\n');
    
    // Execute entire schema as one query
    await client.query(schema);
    
    console.log('✅ Schema executed successfully\n');
    
    // Verify tables created
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log(`📋 Tables created (${tablesResult.rows.length}):`);
    tablesResult.rows.forEach(row => {
      console.log(`   ✅ ${row.table_name}`);
    });
    
    // Check for default data
    const usersCount = await client.query('SELECT COUNT(*) FROM users');
    const settingsCount = await client.query('SELECT COUNT(*) FROM settings');
    
    console.log(`\n📊 Data Summary:`);
    console.log(`   Users: ${usersCount.rows[0].count}`);
    console.log(`   Settings: ${settingsCount.rows[0].count}`);
    
    await client.end();
    
    console.log('\n🎉 Migration completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Details:', error);
    await client.end();
    process.exit(1);
  }
}

runMigration();
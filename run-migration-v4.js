/**
 * Run Database Migration - Version 4
 * Create extension first, then tables
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
    
    // Step 1: Create UUID extension
    console.log('📦 Creating UUID extension...');
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      console.log('✅ UUID extension created\n');
    } catch (error) {
      console.error('❌ Error creating extension:', error.message);
    }
    
    // Step 2: Read and execute schema
    console.log('📖 Reading schema.sql...');
    const schema = fs.readFileSync('./database/schema.sql', 'utf8');
    
    console.log('📝 Executing schema...\n');
    
    try {
      // Execute the entire schema
      await client.query(schema);
      console.log('✅ Schema executed successfully\n');
    } catch (error) {
      // If it fails, it might be because of the duplicate column issue
      // Let's try to identify which statement failed
      console.error('❌ Schema execution failed:', error.message);
      console.error('Error code:', error.code);
      console.error('Error detail:', error.detail);
      
      // Try to continue anyway and check what was created
    }
    
    // Verify what was created
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log(`📋 Tables in database (${tablesResult.rows.length}):`);
    tablesResult.rows.forEach(row => {
      console.log(`   ✅ ${row.table_name}`);
    });
    
    // Check for data
    if (tablesResult.rows.length > 0) {
      try {
        const settingsCount = await client.query('SELECT COUNT(*) FROM settings');
        console.log(`\n📊 Settings records: ${settingsCount.rows[0].count}`);
      } catch (e) {
        console.log('\n⚠️ Settings table not accessible');
      }
    }
    
    await client.end();
    
    if (tablesResult.rows.length >= 11) {
      console.log('\n🎉 Migration completed successfully!');
      process.exit(0);
    } else {
      console.log('\n⚠️ Migration incomplete - not all tables created');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    await client.end();
    process.exit(1);
  }
}

runMigration();
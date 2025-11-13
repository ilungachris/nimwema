/**
 * Debug Schema - Test Each Table Individually
 */

require('dotenv').config();
const fs = require('fs');
const { Client } = require('pg');

async function debugSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    // Create UUID extension first
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('✅ UUID extension created\n');
    
    // Read schema
    const schema = fs.readFileSync('./database/schema.sql', 'utf8');
    
    // Extract each CREATE TABLE statement
    const tableRegex = /CREATE TABLE (\w+) \(([\s\S]*?)\);/g;
    let match;
    const tables = [];
    
    while ((match = tableRegex.exec(schema)) !== null) {
      const tableName = match[1];
      const tableDef = match[0];
      tables.push({ name: tableName, sql: tableDef });
    }
    
    console.log(`📋 Found ${tables.length} table definitions\n`);
    
    // Test each table
    for (const table of tables) {
      console.log(`Testing table: ${table.name}`);
      
      // Check for duplicate columns
      const columnMatches = table.sql.match(/^\s+(\w+)\s+/gm);
      if (columnMatches) {
        const columns = columnMatches.map(m => m.trim().split(/\s+/)[0]);
        const duplicates = columns.filter((item, index) => columns.indexOf(item) !== index);
        
        if (duplicates.length > 0) {
          console.log(`   ❌ DUPLICATE COLUMNS FOUND: ${duplicates.join(', ')}`);
          console.log(`   Full definition:\n${table.sql}\n`);
          continue;
        }
      }
      
      // Try to create the table
      try {
        await client.query(table.sql);
        console.log(`   ✅ Created successfully\n`);
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        console.log(`   SQL:\n${table.sql}\n`);
      }
    }
    
    // Check what was created
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' ORDER BY table_name
    `);
    
    console.log(`\n📊 Tables created: ${result.rows.length}`);
    result.rows.forEach(row => console.log(`   - ${row.table_name}`));
    
    await client.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

debugSchema();
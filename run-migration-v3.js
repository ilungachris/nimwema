/**
 * Run Database Migration - Version 3
 * Split into tables first, then indexes/triggers
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
    
    // Split into sections
    const lines = schema.split('\n');
    let currentSection = [];
    let inTableDef = false;
    let tableCount = 0;
    
    console.log('📝 Creating tables...\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Start of table definition
      if (line.startsWith('CREATE TABLE')) {
        inTableDef = true;
        currentSection = [lines[i]];
      }
      // Inside table definition
      else if (inTableDef) {
        currentSection.push(lines[i]);
        
        // End of table definition
        if (line.endsWith(');')) {
          inTableDef = false;
          const tableSql = currentSection.join('\n');
          
          // Extract table name
          const match = tableSql.match(/CREATE TABLE (\w+)/);
          const tableName = match ? match[1] : 'unknown';
          
          try {
            await client.query(tableSql);
            console.log(`   ✅ Created table: ${tableName}`);
            tableCount++;
          } catch (error) {
            console.error(`   ❌ Error creating ${tableName}:`, error.message);
          }
          
          currentSection = [];
        }
      }
    }
    
    console.log(`\n📊 Created ${tableCount} tables\n`);
    
    // Now create indexes
    console.log('📝 Creating indexes...\n');
    const indexMatches = schema.match(/CREATE INDEX[^;]+;/g) || [];
    
    for (const indexSql of indexMatches) {
      const match = indexSql.match(/CREATE INDEX (\w+)/);
      const indexName = match ? match[1] : 'unknown';
      
      try {
        await client.query(indexSql);
        console.log(`   ✅ Created index: ${indexName}`);
      } catch (error) {
        console.error(`   ❌ Error creating ${indexName}:`, error.message);
      }
    }
    
    // Verify tables created
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log(`\n📋 Final tables (${tablesResult.rows.length}):`);
    tablesResult.rows.forEach(row => {
      console.log(`   ✅ ${row.table_name}`);
    });
    
    await client.end();
    
    console.log('\n🎉 Migration completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    await client.end();
    process.exit(1);
  }
}

runMigration();
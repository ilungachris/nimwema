/**
 * Complete Migration - Add Indexes, Triggers, and Default Data
 */

require('dotenv').config();
const fs = require('fs');
const { Client } = require('pg');

async function completeMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    const schema = fs.readFileSync('./database/schema.sql', 'utf8');
    
    // Step 1: Create Indexes
    console.log('📝 Creating indexes...\n');
    const indexMatches = schema.match(/CREATE INDEX[^;]+;/g) || [];
    
    for (const indexSql of indexMatches) {
      const match = indexSql.match(/CREATE INDEX (\w+)/);
      const indexName = match ? match[1] : 'unknown';
      
      try {
        await client.query(indexSql);
        console.log(`   ✅ ${indexName}`);
      } catch (error) {
        console.log(`   ⚠️ ${indexName}: ${error.message}`);
      }
    }
    
    // Step 2: Create Triggers
    console.log('\n📝 Creating triggers...\n');
    const triggerMatches = schema.match(/CREATE TRIGGER[^;]+;/g) || [];
    
    for (const triggerSql of triggerMatches) {
      const match = triggerSql.match(/CREATE TRIGGER (\w+)/);
      const triggerName = match ? match[1] : 'unknown';
      
      try {
        await client.query(triggerSql);
        console.log(`   ✅ ${triggerName}`);
      } catch (error) {
        console.log(`   ⚠️ ${triggerName}: ${error.message}`);
      }
    }
    
    // Step 3: Create Functions (for triggers)
    console.log('\n📝 Creating functions...\n');
    const functionMatches = schema.match(/CREATE OR REPLACE FUNCTION[\s\S]*?END;[\s]*\$\$[\s]*LANGUAGE plpgsql;/g) || [];
    
    for (const funcSql of functionMatches) {
      const match = funcSql.match(/CREATE OR REPLACE FUNCTION (\w+)/);
      const funcName = match ? match[1] : 'unknown';
      
      try {
        await client.query(funcSql);
        console.log(`   ✅ ${funcName}`);
      } catch (error) {
        console.log(`   ⚠️ ${funcName}: ${error.message}`);
      }
    }
    
    // Step 4: Insert Default Data
    console.log('\n📝 Inserting default data...\n');
    const insertMatches = schema.match(/INSERT INTO[^;]+;/g) || [];
    
    for (const insertSql of insertMatches) {
      const match = insertSql.match(/INSERT INTO (\w+)/);
      const tableName = match ? match[1] : 'unknown';
      
      try {
        await client.query(insertSql);
        console.log(`   ✅ Inserted into ${tableName}`);
      } catch (error) {
        console.log(`   ⚠️ ${tableName}: ${error.message}`);
      }
    }
    
    // Step 5: Create Views
    console.log('\n📝 Creating views...\n');
    const viewMatches = schema.match(/CREATE VIEW[\s\S]*?;/g) || [];
    
    for (const viewSql of viewMatches) {
      const match = viewSql.match(/CREATE VIEW (\w+)/);
      const viewName = match ? match[1] : 'unknown';
      
      try {
        await client.query(viewSql);
        console.log(`   ✅ ${viewName}`);
      } catch (error) {
        console.log(`   ⚠️ ${viewName}: ${error.message}`);
      }
    }
    
    // Verify everything
    console.log('\n📊 Final Status:\n');
    
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' ORDER BY table_name
    `);
    console.log(`   Tables: ${tables.rows.length}`);
    
    const indexes = await client.query(`
      SELECT indexname FROM pg_indexes 
      WHERE schemaname = 'public' ORDER BY indexname
    `);
    console.log(`   Indexes: ${indexes.rows.length}`);
    
    const views = await client.query(`
      SELECT table_name FROM information_schema.views 
      WHERE table_schema = 'public' ORDER BY table_name
    `);
    console.log(`   Views: ${views.rows.length}`);
    
    const settings = await client.query('SELECT COUNT(*) FROM settings');
    console.log(`   Settings records: ${settings.rows[0].count}`);
    
    await client.end();
    
    console.log('\n🎉 Migration completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

completeMigration();
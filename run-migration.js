/**
 * Run Database Migration
 * Creates all tables, indexes, triggers, and default data
 */

require('dotenv').config();
const fs = require('fs');
const db = require('./database/connection');

async function runMigration() {
  try {
    console.log('🚀 Starting database migration...\n');
    
    // Connect to database
    await db.connect();
    
    // Read schema file
    console.log('📖 Reading schema.sql...');
    const schema = fs.readFileSync('./database/schema.sql', 'utf8');
    
    // Split into individual statements
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements\n`);
    
    // Execute each statement
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Get statement type
      const type = statement.split(' ')[0].toUpperCase();
      
      try {
        await db.query(statement);
        successCount++;
        
        // Log progress for important statements
        if (['CREATE', 'ALTER', 'INSERT'].includes(type)) {
          const match = statement.match(/CREATE\s+TABLE\s+(\w+)|CREATE\s+INDEX\s+(\w+)|INSERT\s+INTO\s+(\w+)/i);
          if (match) {
            const name = match[1] || match[2] || match[3];
            console.log(`✅ ${type} ${name}`);
          }
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ Error in statement ${i + 1}:`, error.message);
        console.error('Statement:', statement.substring(0, 100) + '...');
      }
    }
    
    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    
    // Verify tables created
    const tablesResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log(`\n📋 Tables created (${tablesResult.rows.length}):`);
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    await db.close();
    
    if (errorCount === 0) {
      console.log('\n🎉 Migration completed successfully!');
      process.exit(0);
    } else {
      console.log('\n⚠️ Migration completed with errors');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
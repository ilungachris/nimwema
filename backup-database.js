/**
 * Backup Database - Export all data to JSON
 */

require('dotenv').config();
const fs = require('fs');
const { Client } = require('pg');

async function backupDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    const backup = {
      timestamp: new Date().toISOString(),
      tables: {}
    };
    
    // Get all tables
    const tables = ['users', 'requests', 'senders', 'recipients', 'orders', 
                   'order_recipients', 'vouchers', 'transactions', 'redemptions', 
                   'sms_logs', 'settings'];
    
    for (const table of tables) {
      const result = await client.query(`SELECT * FROM ${table}`);
      backup.tables[table] = result.rows;
      console.log(`✅ Backed up ${table}: ${result.rows.length} rows`);
    }
    
    // Save to file
    fs.writeFileSync('backups/database_backup.json', JSON.stringify(backup, null, 2));
    console.log('\n✅ Database backup saved to backups/database_backup.json');
    
    await client.end();
    
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    process.exit(1);
  }
}

backupDatabase();
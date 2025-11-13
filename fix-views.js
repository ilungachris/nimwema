/**
 * Fix Views - Drop and Recreate with Correct Columns
 */

require('dotenv').config();
const { Client } = require('pg');

async function fixViews() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    // Drop existing views
    console.log('🗑️ Dropping old views...\n');
    await client.query('DROP VIEW IF EXISTS active_vouchers CASCADE');
    await client.query('DROP VIEW IF EXISTS expired_vouchers CASCADE');
    console.log('   ✅ Old views dropped\n');
    
    // Create function for triggers
    console.log('📝 Creating update function...\n');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    console.log('   ✅ Function created\n');
    
    // Create triggers
    console.log('📝 Creating triggers...\n');
    const tables = ['users', 'requests', 'senders', 'recipients', 'orders', 'vouchers', 'transactions', 'settings'];
    
    for (const table of tables) {
      try {
        await client.query(`
          DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
          CREATE TRIGGER update_${table}_updated_at 
          BEFORE UPDATE ON ${table}
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        `);
        console.log(`   ✅ Trigger for ${table}`);
      } catch (error) {
        console.log(`   ⚠️ ${table}: ${error.message}`);
      }
    }
    
    // Create fixed views
    console.log('\n📝 Creating fixed views...\n');
    
    await client.query(`
      CREATE VIEW active_vouchers AS
      SELECT 
          v.*,
          o.sender_phone as order_sender_phone
      FROM vouchers v
      LEFT JOIN orders o ON v.order_id = o.id
      WHERE v.status = 'pending' 
        AND v.expires_at > CURRENT_TIMESTAMP;
    `);
    console.log('   ✅ active_vouchers');
    
    await client.query(`
      CREATE VIEW expired_vouchers AS
      SELECT 
          v.*,
          o.sender_phone as order_sender_phone
      FROM vouchers v
      LEFT JOIN orders o ON v.order_id = o.id
      WHERE v.status = 'pending' 
        AND v.expires_at <= CURRENT_TIMESTAMP;
    `);
    console.log('   ✅ expired_vouchers');
    
    // Verify
    console.log('\n📊 Final Status:\n');
    
    const tables_count = await client.query(`
      SELECT COUNT(*) FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log(`   Tables: ${tables_count.rows[0].count}`);
    
    const views_count = await client.query(`
      SELECT COUNT(*) FROM information_schema.views 
      WHERE table_schema = 'public'
    `);
    console.log(`   Views: ${views_count.rows[0].count}`);
    
    const settings = await client.query('SELECT COUNT(*) FROM settings');
    console.log(`   Settings: ${settings.rows[0].count}`);
    
    await client.end();
    
    console.log('\n🎉 Database is ready!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

fixViews();
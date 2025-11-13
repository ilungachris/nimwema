require('dotenv').config();
const SMSService = require('./services/sms');

console.log('🧪 Testing SMS service through application...\n');

async function testSMSService() {
    try {
        // Initialize SMS service the way the app does
        const sms = new SMSService();
        
        console.log('✅ SMS Service initialized');
        console.log('Provider:', process.env.SMS_PROVIDER);
        console.log('Username:', process.env.SMS_USERNAME);
        
        // Test sending a voucher code (this is what the app actually does)
        const testPhone = '+243823269711';
        const testCode = 'TEST-123456';
        
        console.log('\n📱 Sending test voucher code...');
        const result = await sms.sendVoucherCode(testPhone, testCode, 'Test User');
        
        if (result.success) {
            console.log('✅ SMS sent successfully!');
            console.log('Message ID:', result.messageId);
            console.log('Cost:', result.cost);
        } else {
            console.log('❌ SMS failed:', result.error);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testSMSService();
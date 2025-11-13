require('dotenv').config();

// Test by making an actual API call to create a voucher request
const http = require('http');

console.log('🔄 Testing end-to-end SMS with voucher request...\n');

const testData = {
    firstName: 'SMS',
    lastName: 'Test User',
    phone: '+243823269711',
    requester_email: 'test@example.com',
    requestType: 'known_sender',
    senderName: 'Test Sender',
    senderPhone: '+243812345678',
    message: 'Test SMS notification'
};

const postData = JSON.stringify(testData);

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/vouchers/request',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

console.log('📤 Sending voucher request...');

const req = http.request(options, (res) => {
    console.log(`📊 Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        try {
            const response = JSON.parse(data);
            console.log('✅ Request created:', response);
            
            if (response.success) {
                console.log('📱 SMS should have been sent to:', testData.sender_phone);
                console.log('🎯 Check if SMS was received!');
            } else {
                console.log('❌ Request failed:', response.error);
            }
        } catch (e) {
            console.log('Raw response:', data);
        }
    });
});

req.on('error', (e) => {
    console.error(`❌ Request error: ${e.message}`);
});

req.write(postData);
req.end();
const AfricasTalking = require('africastalking');

// Test different authentication approaches
console.log('🔍 Testing authentication approaches...\n');

// Method 1: Direct initialization
console.log('1. Testing direct initialization:');
try {
    const direct = AfricasTalking({
        username: 'sandbox',
        apiKey: 'atsk_8147e3221fbec2112f3c8510ff04acd232a3dac5e93262a95fc3180f399abe6212bc792b'
    });
    console.log('✅ Direct init successful');
} catch (e) {
    console.log('❌ Direct init failed:', e.message);
}

// Method 2: Environment variables
console.log('\n2. Testing environment variables:');
process.env.AT_USERNAME = 'sandbox';
process.env.AT_API_KEY = 'atsk_8147e3221fbec2112f3c8510ff04acd232a3dac5e93262a95fc3180f399abe6212bc792b';
try {
    const env = AfricasTalking({
        username: process.env.AT_USERNAME,
        apiKey: process.env.AT_API_KEY
    });
    console.log('✅ Environment init successful');
} catch (e) {
    console.log('❌ Environment init failed:', e.message);
}

// Method 3: Test API key format
console.log('\n3. Checking API key format:');
const apiKey = 'atsk_8147e3221fbec2112f3c8510ff04acd232a3dac5e93262a95fc3180f399abe6212bc792b';
console.log('Length:', apiKey.length);
console.log('Starts with atsk_:', apiKey.startsWith('atsk_'));
console.log('Has correct pattern:', /^[a-z]{4}_[a-f0-9]+$/.test(apiKey));

// Method 4: Test with production credentials format
console.log('\n4. Testing if maybe needs live credentials:');
try {
    const live = AfricasTalking({
        username: 'nimwema',  // Try live username instead of sandbox
        apiKey: apiKey
    });
    console.log('✅ Live username init successful');
} catch (e) {
    console.log('❌ Live username init failed:', e.message);
}

// Method 5: Test with bare key (no atsk_ prefix)
console.log('\n5. Testing with bare key:');
const bareKey = apiKey.replace('atsk_', '');
console.log('Bare key length:', bareKey.length);
try {
    const bare = AfricasTalking({
        username: 'sandbox',
        apiKey: bareKey
    });
    console.log('✅ Bare key init successful');
} catch (e) {
    console.log('❌ Bare key init failed:', e.message);
}

console.log('\n🔧 Authentication testing complete');
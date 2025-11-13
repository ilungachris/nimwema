const AfricasTalking = require('africastalking');

async function testDifferentConfigurations() {
    console.log('🧪 Testing different SMS configurations...\n');
    
    const apiKey = 'atsk_8147e3221fbec2112f3c8510ff04acd232a3dac5e93262a95fc3180f399abe6212bc792b';
    const testPhone = '+243972507074'; // Test phone number
    
    // Configuration 1: Sandbox with nimwema sender
    console.log('1. Testing: sandbox username + Nimwema sender');
    try {
        const at1 = AfricasTalking({ username: 'sandbox', apiKey });
        const sms1 = at1.SMS;
        const result1 = await sms1.send({
            to: testPhone,
            message: 'Test 1: sandbox + Nimwema',
            from: 'Nimwema'
        });
        console.log('✅ Success:', result1);
    } catch (e) {
        console.log('❌ Failed:', e.response?.data || e.message);
    }
    
    // Configuration 2: Sandbox with AFRICASTALKING sender
    console.log('\n2. Testing: sandbox username + AFRICASTALKING sender');
    try {
        const at2 = AfricasTalking({ username: 'sandbox', apiKey });
        const sms2 = at2.SMS;
        const result2 = await sms2.send({
            to: testPhone,
            message: 'Test 2: sandbox + AFRICASTALKING',
            from: 'AFRICASTALKING'
        });
        console.log('✅ Success:', result2);
    } catch (e) {
        console.log('❌ Failed:', e.response?.data || e.message);
    }
    
    // Configuration 3: Sandbox with no sender (default)
    console.log('\n3. Testing: sandbox username + no sender (default)');
    try {
        const at3 = AfricasTalking({ username: 'sandbox', apiKey });
        const sms3 = at3.SMS;
        const result3 = await sms3.send({
            to: testPhone,
            message: 'Test 3: sandbox + no sender'
        });
        console.log('✅ Success:', result3);
    } catch (e) {
        console.log('❌ Failed:', e.response?.data || e.message);
    }
    
    // Configuration 4: Live username nimwema
    console.log('\n4. Testing: nimwema username + Nimwema sender');
    try {
        const at4 = AfricasTalking({ username: 'nimwema', apiKey });
        const sms4 = at4.SMS;
        const result4 = await sms4.send({
            to: testPhone,
            message: 'Test 4: nimwema + Nimwema',
            from: 'Nimwema'
        });
        console.log('✅ Success:', result4);
    } catch (e) {
        console.log('❌ Failed:', e.response?.data || e.message);
    }
    
    // Configuration 5: Test without sender ID field
    console.log('\n5. Testing: sandbox username + minimal message');
    try {
        const at5 = AfricasTalking({ username: 'sandbox', apiKey });
        const sms5 = at5.SMS;
        const result5 = await sms5.send({
            to: testPhone,
            message: 'Test 5: minimal config'
        });
        console.log('✅ Success:', result5);
    } catch (e) {
        console.log('❌ Failed:', e.response?.data || e.message);
    }
    
    console.log('\n🏁 Configuration testing complete');
}

testDifferentConfigurations().catch(console.error);
require('dotenv').config();
const AfricasTalking = require('africastalking');

console.log('🔧 Testing SMS directly...');
console.log('Username:', process.env.SMS_USERNAME);
console.log('API Key:', process.env.SMS_API_KEY ? process.env.SMS_API_KEY.substring(0, 20) + '...' : 'NOT SET');

try {
  const at = AfricasTalking({
    apiKey: process.env.SMS_API_KEY,
    username: process.env.SMS_USERNAME
  });
  
  console.log('✅ SDK Initialized');
  
  const sms = at.SMS;
  
  const testOptions = {
    to: ['+243823269711'],
    message: 'Test message from NIMWEMA'
  };
  
  // Don't actually send, just test authentication
  console.log('🧪 Testing authentication...');
  
  sms.send(testOptions)
    .then(response => {
      console.log('✅ SMS sent successfully:', response);
    })
    .catch(error => {
      console.error('❌ Error details:');
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data);
      console.error('Message:', error.message);
    });
    
} catch (error) {
  console.error('❌ Initialization error:', error.message);
}
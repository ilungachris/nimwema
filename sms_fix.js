const fs = require('fs');

const file = 'services/sms.js';
let content = fs.readFileSync(file, 'utf8');

const oldMethod = `async sendViaAfricasTalking(phone, message) {
      try {
        const response = await axios.post(
          this.apiUrl,
          new URLSearchParams({
            username: this.username,
            to: phone,
            message: message
          }),
          {
            headers: {
              'apiKey': this.apiKey,
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept': 'application/json'
            }
          }
        );
  
        console.log('SMS sent via Africa\\'s Talking:', response.data);
  
        return {
          success: true,
          provider: 'africas_talking',
          messageId: response.data.SMSMessageData?.Recipients?.[0]?.messageId,
          status: response.data.SMSMessageData?.Recipients?.[0]?.status
        };
      } catch (error) {
        console.error('Africa\\'s Talking SMS Error:', error.message);
        return {
          success: false,
          error: error.message
        };
      }
    }`;

const newMethod = `async sendViaAfricasTalking(phone, message) {
      try {
        if (!this.sms) {
          throw new Error('Africa\\'s Talking SDK not initialized');
        }

        const options = {
          to: [phone],
          message: message
        };

        // Only add sender ID if configured
        if (this.senderId) {
          options.from = this.senderId;
        }

        const response = await this.sms.send(options);

        console.log('✅ SMS sent via Africa\\'s Talking:', response);

        return {
          success: true,
          provider: 'africas_talking',
          response: response
        };
      } catch (error) {
        console.error('❌ Africa\\'s Talking SMS Error:', error.message);
        return {
          success: false,
          error: error.message
        };
      }
    }`;

if (content.includes('await axios.post')) {
  content = content.replace(oldMethod, newMethod);
  fs.writeFileSync(file, content);
  console.log('✅ SMS service fixed - now uses Africa\'s Talking SDK');
} else {
  console.log('⚠️ Method not found or already fixed');
}

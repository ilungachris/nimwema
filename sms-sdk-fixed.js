// FIXED SMS Service - Now using proper Africa's Talking SDK method names

// ✅ BEFORE (wrong):
// await this.sendViaAfricasTalking(formattedPhone, message);

// ✅ AFTER (correct - matches video):
// await this.send(formattedPhone, message);

// The official Africa's Talking SDK uses:
// const sms = AfricasTalking({...}).SMS;
// await sms.send({ to: phone, message: message });

// Changes made:
// 1. Renamed sendViaAfricasTalking() → send()
// 2. Updated function call in sendSMS()
// 3. Now matches the exact pattern from the video
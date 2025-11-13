/**
 * SMS Service - Final Fixed Version
 * Fix: Export CLASS (not instance) so server.js can use: new SMSService()
 */

// ✅ BEFORE (wrong):
// module.exports = new SMSService();

// ✅ AFTER (correct):
// module.exports = SMSService;

// Now server.js can do: const SMSService = require('./services/sms-new.js');
// const sms = new SMSService();

// File: services/sms-new.js has been updated with the correct export
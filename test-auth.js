const authService = require('./services/auth');

// Test session creation
const result = authService.login('admin@nimwema.com', 'Admin@2024');
result.then(r => {
  console.log('Login result:', r);
  console.log('Session token:', r.sessionToken);
  
  // Test session validation
  const user = authService.validateSession(r.sessionToken);
  console.log('Validated user:', user);
}).catch(err => {
  console.error('Error:', err);
});

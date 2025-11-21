const authService = require('./services/auth');

// Wait for initialization
setTimeout(async () => {
  console.log('Testing after 2 seconds...');
  const result = await authService.login('admin@nimwema.com', 'Admin@2024');
  console.log('Login result:', result);
  
  if (result.sessionToken) {
    const user = authService.validateSession(result.sessionToken);
    console.log('Validated user:', user);
  }
}, 2000);

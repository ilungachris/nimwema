const fs = require('fs');

const file = 'public/js/dashboard.js';
let content = fs.readFileSync(file, 'utf8');

// Find and replace the loadRequests function
const oldFunc = `async function loadRequests() {
    try {
      if (!currentUser) {
        console.log('⚠️ No user logged in');
        return;
      }
      
      // Fetch requests for this user (by userId if available, otherwise by phone)
      const userId = currentUser.id;
      const phone = currentUser.phone;
      
      const response = await fetch(\`/api/requests?userId=\${encodeURIComponent(userId)}&phone=\${encodeURIComponent(phone)}\`);
      const requests = await response.json();
      
      allRequests = requests;
      filteredRequests = requests;
      
      console.log(\`✅ Loaded \${requests.length} requests for user\`);
      
      renderRequests();
    } catch (error) {
      console.error('Error loading requests:', error);
      showEmptyState('requestsList', 'Erreur de chargement', 'Impossible de charger vos demandes.');
    }
  }`;

const newFunc = `async function loadRequests() {
    try {
      if (!currentUser) {
        console.log('⚠️ No user logged in');
        return;
      }
      
      // Fetch requests for this user (by userId if available, otherwise by phone)
      const userId = currentUser.id;
      const phone = currentUser.phone;
      
      console.log('🔍 Loading requests for:', { userId, phone, currentUser });
      
      const url = \`/api/requests?userId=\${encodeURIComponent(userId)}&phone=\${encodeURIComponent(phone)}\`;
      console.log('📡 Fetching:', url);
      
      const response = await fetch(url);
      
      console.log('📥 Response status:', response.status);
      
      if (!response.ok) {
        const text = await response.text();
        console.error('❌ Response error:', text);
        throw new Error(\`HTTP error! status: \${response.status}\`);
      }
      
      const requests = await response.json();
      
      console.log('📋 Received requests:', requests);
      
      allRequests = requests;
      filteredRequests = requests;
      
      console.log(\`✅ Loaded \${requests.length} requests for user\`);
      
      renderRequests();
    } catch (error) {
      console.error('❌ Error loading requests:', error);
      showEmptyState('requestsList', 'Erreur de chargement', 'Impossible de charger vos demandes.');
    }
  }`;

content = content.replace(oldFunc, newFunc);
fs.writeFileSync(file, content);
console.log('✅ Updated dashboard.js with debug logging');

require('dotenv').config({ path: require('path').resolve(__dirname, '.env.local') });
console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID);
console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL);
console.log('FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? 'Loaded' : 'Missing or empty'); 
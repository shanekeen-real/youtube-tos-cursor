// Test script to verify webhook endpoint is working
const https = require('https');

// Test if the webhook endpoint is accessible
const testWebhookEndpoint = async () => {
  const webhookUrl = process.env.WEBHOOK_URL || 'http://localhost:3000/api/stripe-webhook';
  
  console.log('Testing webhook endpoint:', webhookUrl);
  
  // Simple GET request to check if endpoint exists
  try {
    const response = await fetch(webhookUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.status === 405) {
      console.log('✅ Webhook endpoint exists (405 Method Not Allowed is expected for GET)');
    } else {
      console.log('⚠️ Unexpected response status:', response.status);
    }
  } catch (error) {
    console.error('❌ Error testing webhook endpoint:', error.message);
  }
};

testWebhookEndpoint(); 
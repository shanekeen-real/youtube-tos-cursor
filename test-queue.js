// Test script for queue system
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testQueueSystem() {
  console.log('🧪 Testing Queue System...\n');

  try {
    // Test 1: Add scan to queue
    console.log('1. Testing add scan to queue...');
    const addResponse = await fetch(`${BASE_URL}/api/queue/add-scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        videoTitle: 'Test Video',
        videoThumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        priority: 'normal',
        isOwnVideo: false,
        scanOptions: {
          includeTranscript: true,
          includeAI: true,
          includeMultiModal: true
        }
      })
    });

    if (addResponse.ok) {
      const addData = await addResponse.json();
      console.log('✅ Scan added to queue:', addData.queueId);
      
      // Test 2: Get user scans
      console.log('\n2. Testing get user scans...');
      const getResponse = await fetch(`${BASE_URL}/api/queue/user-scans`);
      
      if (getResponse.ok) {
        const getData = await getResponse.json();
        console.log('✅ User scans retrieved:', getData.queueItems.length, 'items');
        console.log('   Stats:', getData.stats);
      } else {
        console.log('❌ Failed to get user scans');
      }
      
      // Test 3: Process next scan
      console.log('\n3. Testing process next scan...');
      const processResponse = await fetch(`${BASE_URL}/api/queue/process-next`, {
        method: 'POST'
      });
      
      if (processResponse.ok) {
        const processData = await processResponse.json();
        console.log('✅ Process response:', processData.message);
      } else {
        console.log('❌ Failed to process next scan');
      }
      
    } else {
      console.log('❌ Failed to add scan to queue');
      const errorData = await addResponse.json();
      console.log('   Error:', errorData.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testQueueSystem(); 
const BASE_URL = 'http://localhost:3000';

async function testQueueProcessing() {
  console.log('🧪 Testing Queue Processing System...\n');

  try {
    // Test 1: Add scan to queue
    console.log('1. Adding scan to queue...');
    const addResponse = await fetch(`${BASE_URL}/api/queue/add-scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        videoTitle: 'Test Video for Queue Processing',
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
      
      // Test 2: Process the scan
      console.log('\n2. Processing scan...');
      const processResponse = await fetch(`${BASE_URL}/api/queue/process-next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (processResponse.ok) {
        const processData = await processResponse.json();
        console.log('✅ Process response:', processData.message);
        
        if (processData.scanId) {
          console.log('✅ Scan completed with ID:', processData.scanId);
        }
      } else {
        const errorData = await processResponse.json();
        console.log('❌ Processing failed:', errorData.error);
      }
      
      // Test 3: Check queue status
      console.log('\n3. Checking queue status...');
      const statusResponse = await fetch(`${BASE_URL}/api/queue/user-scans?status=all`);
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        console.log('✅ Queue status:', statusData.stats);
        console.log('✅ Queue items:', statusData.queueItems.length);
      } else {
        console.log('❌ Failed to get queue status');
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
testQueueProcessing(); 
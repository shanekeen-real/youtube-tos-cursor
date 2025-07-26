const BASE_URL = 'http://localhost:3000';

async function testBackgroundProcessing() {
  try {
    console.log('🧪 Testing Background Processing System\n');

    // Test 1: Add a scan to the queue
    console.log('1. Adding scan to queue...');
    const addResponse = await fetch(`${BASE_URL}/api/queue/add-scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        videoTitle: 'Test Video for Background Processing',
        videoThumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        priority: 'normal',
        isOwnVideo: false
      })
    });

    if (addResponse.ok) {
      const addData = await addResponse.json();
      console.log('✅ Scan added to queue:', addData.queueId);
      
      // Test 2: Check if background processing started
      console.log('\n2. Checking if background processing started...');
      
      // Wait a moment for background processing to start
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check queue status
      const statusResponse = await fetch(`${BASE_URL}/api/queue/user-scans?status=all`);
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        console.log('✅ Queue status:', statusData.stats);
        
        const pendingScans = statusData.queueItems.filter(item => item.status === 'pending');
        const processingScans = statusData.queueItems.filter(item => item.status === 'processing');
        const completedScans = statusData.queueItems.filter(item => item.status === 'completed');
        
        console.log(`   Pending: ${pendingScans.length}`);
        console.log(`   Processing: ${processingScans.length}`);
        console.log(`   Completed: ${completedScans.length}`);
        
        if (processingScans.length > 0 || completedScans.length > 0) {
          console.log('✅ Background processing is working!');
        } else {
          console.log('⚠️  Background processing may not have started yet');
        }
      } else {
        console.log('❌ Failed to get queue status');
      }
      
      // Test 3: Manually trigger background processing
      console.log('\n3. Manually triggering background processing...');
      const backgroundResponse = await fetch(`${BASE_URL}/api/queue/process-background?maxScans=5`, {
        method: 'GET'
      });
      
      if (backgroundResponse.ok) {
        const backgroundData = await backgroundResponse.json();
        console.log('✅ Background processing result:', backgroundData.message);
        console.log(`   Processed: ${backgroundData.processedCount} scans`);
        console.log(`   Has more: ${backgroundData.hasMore}`);
      } else {
        console.log('❌ Failed to trigger background processing');
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
testBackgroundProcessing(); 
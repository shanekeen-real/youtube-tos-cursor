// Test script to verify webhook logic with the provided event data
const testEvent = {
  "object": {
    "id": "sub_1RhOBDPkKFhdAA8LnS46UWmz",
    "object": "subscription",
    "billing_cycle_anchor": 1751691672,
    "cancel_at": 1783227672,
    "cancel_at_period_end": true,
    "canceled_at": 1751691712,
    "cancellation_details": {
      "comment": null,
      "feedback": "unused",
      "reason": "cancellation_requested"
    },
    "created": 1751691505,
    "currency": "usd",
    "customer": "cus_ScdSplurbPUFmu",
    "current_period_end": 1783227672,
    "status": "active",
    "metadata": {
      "userId": "test-user-id"
    }
  }
};

console.log('=== TESTING WEBHOOK LOGIC ===');
console.log('Event type: customer.subscription.updated');
console.log('Subscription ID:', testEvent.object.id);
console.log('User ID:', testEvent.object.metadata?.userId);
console.log('cancel_at_period_end:', testEvent.object.cancel_at_period_end);
console.log('cancel_at:', testEvent.object.cancel_at);
console.log('canceled_at:', testEvent.object.canceled_at);
console.log('status:', testEvent.object.status);
console.log('current_period_end:', testEvent.object.current_period_end);

// Simulate the webhook logic
const subscription = testEvent.object;

if (subscription.cancel_at_period_end) {
  console.log('\n✅ Processing scheduled cancellation...');
  
  // Use cancel_at for expiresAt (when subscription will actually end)
  let expiresAt = undefined;
  if (subscription.cancel_at) {
    expiresAt = new Date(subscription.cancel_at * 1000).toISOString();
    console.log('Using cancel_at for expiresAt:', subscription.cancel_at, '->', expiresAt);
  } else if (subscription.current_period_end) {
    expiresAt = new Date(subscription.current_period_end * 1000).toISOString();
    console.log('Using current_period_end for expiresAt:', subscription.current_period_end, '->', expiresAt);
  }
  
  // Use canceled_at for cancelledAt (when cancellation was requested)
  let cancelledAt = undefined;
  if (subscription.canceled_at) {
    cancelledAt = new Date(subscription.canceled_at * 1000).toISOString();
    console.log('Using canceled_at for cancelledAt:', subscription.canceled_at, '->', cancelledAt);
  } else {
    cancelledAt = new Date().toISOString();
    console.log('Using current time for cancelledAt:', cancelledAt);
  }
  
  console.log('\n📝 Expected Firestore update:');
  console.log('- cancelledAt:', cancelledAt);
  console.log('- expiresAt:', expiresAt);
  console.log('- renewalDate: null (cleared)');
  
  console.log('\n📅 Date conversions:');
  console.log('- cancel_at (1783227672):', new Date(1783227672 * 1000).toISOString());
  console.log('- canceled_at (1751691712):', new Date(1751691712 * 1000).toISOString());
  console.log('- current_period_end (1783227672):', new Date(1783227672 * 1000).toISOString());
} else {
  console.log('\n❌ Not a scheduled cancellation');
}

console.log('\n=== END TEST ==='); 
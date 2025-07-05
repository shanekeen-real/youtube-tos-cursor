# Subscription Management System

## Overview

The YouTube TOS Analyzer implements a comprehensive subscription management system using Stripe's Customer Portal, providing users with secure, self-service capabilities to manage their subscriptions.

## Architecture

### Components

1. **Stripe Customer Portal Integration**
   - Secure, Stripe-hosted interface for subscription management
   - Built-in compliance and security
   - Professional user experience

2. **API Endpoints**
   - `/api/create-customer-portal-session` - Creates portal sessions
   - `/api/create-checkout-session` - Handles new subscriptions
   - `/api/stripe-webhook` - Processes subscription events

3. **Database Schema**
   - `stripeCustomerId` - Links user to Stripe customer
   - `subscriptionData` - Stores subscription metadata
   - `subscriptionTier` - Current subscription level

## Features

### For Users

1. **Upgrade Plans**
   - Direct upgrade through pricing page
   - Seamless Stripe checkout integration

2. **Manage Subscriptions**
   - Access Stripe Customer Portal
   - Downgrade to lower tiers
   - Cancel subscriptions
   - Update payment methods
   - View billing history

3. **Automatic Tier Management**
   - Immediate access to new features on upgrade
   - Graceful degradation on downgrade
   - Automatic cancellation handling

### For Administrators

1. **Webhook Processing**
   - Real-time subscription event handling
   - Automatic user tier updates
   - Comprehensive logging

2. **User Data Management**
   - Stripe customer ID tracking
   - Subscription metadata storage
   - Renewal date tracking

## Implementation Details

### Customer Portal Session Creation

```typescript
// Creates a secure portal session for subscription management
const portalSession = await stripe.billingPortal.sessions.create({
  customer: stripeCustomerId,
  return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
});
```

### Webhook Event Handling

The system handles these Stripe events:
- `checkout.session.completed` - New subscriptions
- `customer.subscription.updated` - Plan changes
- `customer.subscription.deleted` - Cancellations

### User Interface

The subscription management UI is located in `/settings` and includes:
- Current plan display
- Upgrade button (redirects to pricing)
- Manage Subscription button (opens Stripe portal)
- Renewal date information

## Security Considerations

1. **Authentication Required**
   - All subscription management requires user authentication
   - Session validation on all API endpoints

2. **Stripe Security**
   - Customer portal sessions are temporary and secure
   - No sensitive payment data stored in our database
   - Webhook signature verification

3. **Data Protection**
   - Minimal customer data stored
   - Secure API key management
   - Audit logging for all changes

## Configuration

### Environment Variables

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Stripe Dashboard Setup

1. **Customer Portal Configuration**
   - Enable customer portal in Stripe dashboard
   - Configure allowed features (downgrade, cancel, etc.)
   - Set up business information

2. **Webhook Endpoints**
   - Configure webhook endpoint URL
   - Select required events
   - Verify webhook secret

## Usage Examples

### User Downgrades Plan

1. User clicks "Manage Subscription" in settings
2. Stripe Customer Portal opens
3. User selects lower tier plan
4. Stripe processes the change
5. Webhook updates user's tier in database
6. User sees updated features immediately

### User Cancels Subscription

1. User accesses customer portal
2. User cancels subscription
3. Stripe sends cancellation webhook
4. System downgrades user to free tier
5. User retains access until billing period ends

## Error Handling

### Common Scenarios

1. **No Stripe Customer ID**
   - User hasn't subscribed yet
   - Show appropriate messaging

2. **Portal Session Creation Failed**
   - Network issues
   - Invalid customer ID
   - Retry mechanism

3. **Webhook Processing Errors**
   - Database connection issues
   - Invalid event data
   - Comprehensive error logging

## Monitoring and Analytics

### Key Metrics

1. **Subscription Events**
   - Upgrades/downgrades
   - Cancellations
   - Failed payments

2. **User Behavior**
   - Portal usage patterns
   - Common downgrade reasons
   - Retention rates

3. **System Health**
   - Webhook processing success
   - API response times
   - Error rates

## Future Enhancements

1. **Advanced Analytics**
   - Subscription lifecycle tracking
   - Churn prediction
   - Revenue optimization

2. **Enhanced UI**
   - In-app subscription management
   - Plan comparison tools
   - Usage analytics

3. **Business Features**
   - Team management
   - Bulk operations
   - Advanced billing options

## Troubleshooting

### Common Issues

1. **Portal Not Opening**
   - Check Stripe customer ID exists
   - Verify API key permissions
   - Check network connectivity

2. **Webhook Not Processing**
   - Verify webhook secret
   - Check endpoint URL
   - Review Stripe dashboard logs

3. **User Tier Not Updating**
   - Check webhook processing
   - Verify database updates
   - Review error logs

### Debug Tools

1. **Stripe CLI**
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe-webhook
   ```

2. **Log Monitoring**
   - Check application logs
   - Monitor Stripe dashboard
   - Review webhook events

## Support

For technical support:
1. Check Stripe documentation
2. Review application logs
3. Contact development team
4. Consult Stripe support (if needed) 
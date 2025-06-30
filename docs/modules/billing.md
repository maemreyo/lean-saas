# 💳 Advanced Billing Module

A comprehensive usage-based billing system for SaaS applications with real-time tracking, quota management, and automated alerts.

## 🌟 Features

### ⚡ **Core Billing Infrastructure**
- **Usage-based billing** with automatic Stripe integration
- **Real-time quota tracking** with configurable limits  
- **Automated billing alerts** for usage warnings and payment issues
- **Comprehensive analytics** with usage trends and projections
- **Payment failure handling** with retry logic
- **Invoice management** with detailed line items

### 📊 **Analytics & Monitoring**
- Real-time usage analytics dashboard
- Quota utilization tracking with visual indicators
- Cost projections and trend analysis
- Billing alerts with severity levels
- Payment failure monitoring and resolution

### 🎯 **Developer Experience**
- Type-safe TypeScript APIs
- React hooks for easy integration
- Comprehensive validation with Zod schemas
- Background processing with edge functions
- Automatic Stripe webhook handling

## 🚀 Quick Start

### 1. Run Setup Script

```bash
node scripts/setup-advanced-billing.js
```

This will:
- ✅ Check prerequisites and environment
- ✅ Install dependencies  
- ✅ Run database migrations
- ✅ Deploy edge functions
- ✅ Generate TypeScript types
- ✅ Load sample data

### 2. Configure Stripe Webhook

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy webhook secret to `STRIPE_WEBHOOK_SECRET` in `.env.local`

### 3. Test the Dashboard

Navigate to `/dashboard/billing` to see:
- Usage analytics and trends
- Quota utilization tracking
- Billing alerts and notifications  
- Invoice history and details

## 📖 Usage Guide

### Usage Tracking

Track any billable event in your application:

```typescript
import { usageTracker } from '@/lib/billing/usage-tracking'

// Track API call
await usageTracker.trackUsage({
  eventType: 'api_call',
  quantity: 1,
  metadata: { endpoint: '/api/data' }
})

// Track storage usage
await usageTracker.trackUsage({
  eventType: 'storage_used', 
  quantity: 5, // GB
  metadata: { file_type: 'image' }
})

// Track email sending
await usageTracker.trackUsage({
  eventType: 'email_sent',
  quantity: 100,
  metadata: { campaign: 'newsletter' }
})
```

### Quota Management

Check quotas before performing actions:

```typescript
import { quotaManager } from '@/lib/billing/usage-tracking'

// Check if action is allowed
const canSendEmail = await quotaManager.checkQuota({
  quotaType: 'email_sends',
  requestedAmount: 100
})

if (!canSendEmail.allowed) {
  // Show upgrade prompt
  return { error: 'Email quota exceeded', upgradeRequired: true }
}
```

### React Integration

Use hooks for real-time billing data:

```typescript
import { useUsageTracking } from '@/hooks/billing/useUsageTracking'
import { useBillingAlerts } from '@/hooks/billing/useBillingAlerts'

function BillingPage() {
  const { usageAnalytics, quotas, trackUsage } = useUsageTracking()
  const { alerts, urgentCount } = useBillingAlerts()
  
  return (
    <div>
      {urgentCount > 0 && <AlertBanner alerts={alerts} />}
      <UsageDashboard analytics={usageAnalytics} quotas={quotas} />
    </div>
  )
}
```

### UI Components

Pre-built components for billing interfaces:

```typescript
import { UsageDashboard } from '@/components/billing/UsageDashboard'
import { BillingAlerts } from '@/components/billing/BillingAlerts'  
import { QuotaUsage } from '@/components/billing/QuotaUsage'

<UsageDashboard organizationId="org-123" />
<BillingAlerts showDismissed={false} />
<QuotaUsage quotaTypes={['api_calls', 'storage_gb']} />
```

## ⚙️ Configuration

### Plan Configuration

Define your pricing plans with quota limits:

```typescript
// shared/constants/billing.ts
export const ADVANCED_PLANS = {
  free: {
    limits: {
      api_calls: 1000,
      storage_gb: 1,
      projects: 3,
      team_members: 1,
      email_sends: 100
    },
    usagePricing: {
      api_call: 0.001, // $0.001 per call
      storage_used: 0.1 // $0.10 per GB
    }
  },
  pro: {
    limits: {
      api_calls: 50000,
      storage_gb: 100,
      projects: -1, // unlimited
      team_members: 10,
      email_sends: 10000
    },
    usagePricing: {
      api_call: 0.0005, // 50% discount
      storage_used: 0.05
    }
  }
}
```

### Quota Types

Customize quota types for your application:

```sql
-- Add custom quota types
INSERT INTO usage_quotas (quota_type, limit_value, reset_period) VALUES
  ('custom_feature', 100, 'monthly'),
  ('ai_generations', 50, 'daily'),
  ('webhook_calls', 1000, 'monthly');
```

### Alert Thresholds

Configure when alerts are triggered:

```typescript
// Default: 80% warning, 100% exceeded
// Customize in your quota checking logic
const utilizationThresholds = {
  warning: 75,    // 75% usage warning
  critical: 90,   // 90% critical warning  
  exceeded: 100   // 100% quota exceeded
}
```

## 🛠️ API Reference

### Usage Tracking Endpoints

**POST** `/api/billing/usage/track`
```json
{
  "eventType": "api_call",
  "quantity": 1,
  "metadata": { "endpoint": "/api/data" }
}
```

**POST** `/api/billing/usage/check-quota`
```json
{
  "quotaType": "api_calls", 
  "requestedAmount": 10
}
```

**GET** `/api/billing/usage/analytics?timeRange=30d`

### Quota Management Endpoints

**GET** `/api/billing/quotas`

**POST** `/api/billing/quotas/update`
```json
{
  "quotaType": "api_calls",
  "limitValue": 10000
}
```

**POST** `/api/billing/quotas/reset`

### Billing Alerts Endpoints

**GET** `/api/billing/alerts?acknowledged=false`

**POST** `/api/billing/alerts/{id}/acknowledge`

**DELETE** `/api/billing/alerts/{id}`

## 🤖 Automation

### Edge Functions

**billing-processor** - Processes usage events and creates Stripe invoice items
```bash
# Trigger manually
curl -X POST https://your-project.supabase.co/functions/v1/billing-processor \
  -H "Content-Type: application/json" \
  -d '{"action": "process_usage"}'
```

**quota-reset** - Automatically resets quotas based on billing periods
```bash
# Reset monthly quotas
curl -X POST https://your-project.supabase.co/functions/v1/quota-reset \
  -d '{"resetType": "monthly"}'
```

**stripe-webhook** - Handles Stripe events automatically

### Cron Jobs

Set up automated quota resets:

```bash
# Daily at midnight
0 0 * * * curl -X POST https://your-project.supabase.co/functions/v1/quota-reset -d '{"resetType":"daily"}'

# Monthly on 1st
0 0 1 * * curl -X POST https://your-project.supabase.co/functions/v1/quota-reset -d '{"resetType":"monthly"}'
```

## 📊 Database Schema

### Core Tables

- **usage_events** - Tracks all billable usage events
- **usage_quotas** - Manages usage limits per user/organization  
- **invoice_items** - Stores Stripe invoice line items
- **billing_alerts** - Manages usage warnings and notifications
- **payment_failures** - Tracks payment issues and retry logic

### Helpful Views

```sql
-- Get usage summary
SELECT * FROM usage_summary WHERE context_id = 'user-123';

-- Check quota utilization  
SELECT * FROM quota_utilization WHERE status = 'warning';
```

## 🔧 Customization

### Custom Usage Events

Add new billable events:

1. **Add to usage event types:**
```typescript
export type UsageEventType = 
  | 'api_call'
  | 'storage_used'
  | 'your_custom_event' // Add here
```

2. **Add pricing configuration:**
```typescript
export const METERED_PRICING = {
  your_custom_event: 0.05 // $0.05 per usage
}
```

3. **Track the event:**
```typescript
await usageTracker.trackUsage({
  eventType: 'your_custom_event',
  quantity: 1
})
```

### Custom Alert Types

Add new alert types:

1. **Extend alert types:**
```typescript
export type AlertType = 
  | 'quota_warning'
  | 'quota_exceeded'
  | 'your_custom_alert' // Add here
```

2. **Create alert logic:**
```typescript
if (customCondition) {
  await createBillingAlert({
    alert_type: 'your_custom_alert',
    metadata: { custom_data: 'value' }
  })
}
```

### Custom UI Components

Extend existing components:

```typescript
import { UsageDashboard } from '@/components/billing/UsageDashboard'

function CustomBillingPage() {
  return (
    <div>
      <UsageDashboard 
        organizationId="org-123"
        customMetrics={['your_metric']}
        onUpgrade={handleCustomUpgrade}
      />
      <YourCustomComponent />
    </div>
  )
}
```

## 🚨 Troubleshooting

### Common Issues

**Quotas not updating**
- Check if usage events are being processed: `SELECT * FROM usage_events WHERE processed = false`
- Run billing processor manually: `POST /functions/v1/billing-processor`

**Alerts not triggering**
- Verify quota thresholds are configured correctly
- Check alert processing in edge functions logs

**Stripe webhook failures**
- Verify webhook secret in environment variables
- Check webhook URL is accessible from Stripe
- Review webhook event logs in Stripe dashboard

### Debug Queries

```sql
-- Check unprocessed usage events
SELECT COUNT(*) FROM usage_events WHERE processed = false;

-- View recent alerts
SELECT * FROM billing_alerts WHERE triggered_at > NOW() - INTERVAL '24 hours';

-- Check quota utilization
SELECT quota_type, utilization_percentage, status FROM quota_utilization;

-- View payment failures
SELECT * FROM payment_failures WHERE resolved = false;
```

## 📈 Performance Optimization

### Database Optimization

- Usage events are automatically cleaned up after 90 days
- Indexes are created for common query patterns
- Row Level Security policies ensure data isolation

### Caching Strategies

```typescript
// Cache quota data for performance
const quota = await getCachedQuota(userId, quotaType)

// Batch usage tracking for high-volume events
await batchTrackUsage(events)
```

### Monitoring

- Set up alerts for edge function failures
- Monitor Stripe webhook delivery success rates  
- Track database performance for billing queries

## 🤝 Contributing

To extend the billing module:

1. Follow the existing code patterns
2. Add proper TypeScript types
3. Include validation schemas
4. Write tests for new features
5. Update documentation

## 📄 License

This billing module is part of the Lean-SaaS template under MIT License.
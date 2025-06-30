-- UPDATED: 2025-06-30 - Enhanced seed data with usage tracking and metered billing examples

-- First, run the existing seed.sql, then add this advanced billing data

-- Insert sample usage quotas for all users
INSERT INTO public.usage_quotas (id, user_id, organization_id, quota_type, limit_value, current_usage, reset_period, last_reset, created_at, updated_at) VALUES
    -- Individual user quotas (John Doe - Pro plan)
    ('quota-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', NULL, 'api_calls', 50000, 12500, 'monthly', NOW() - INTERVAL '15 days', NOW() - INTERVAL '30 days', NOW()),
    ('quota-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', NULL, 'storage_gb', 100, 25, 'monthly', NOW() - INTERVAL '15 days', NOW() - INTERVAL '30 days', NOW()),
    ('quota-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', NULL, 'projects', -1, 8, 'monthly', NOW() - INTERVAL '15 days', NOW() - INTERVAL '30 days', NOW()),
    ('quota-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111111', NULL, 'team_members', 10, 3, 'monthly', NOW() - INTERVAL '15 days', NOW() - INTERVAL '30 days', NOW()),
    ('quota-1111-1111-1111-111111111115', '11111111-1111-1111-1111-111111111111', NULL, 'email_sends', 10000, 2500, 'monthly', NOW() - INTERVAL '15 days', NOW() - INTERVAL '30 days', NOW()),
    ('quota-1111-1111-1111-111111111116', '11111111-1111-1111-1111-111111111111', NULL, 'exports', 100, 15, 'monthly', NOW() - INTERVAL '15 days', NOW() - INTERVAL '30 days', NOW()),
    
    -- Jane Smith (Free plan) - some limits exceeded
    ('quota-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', NULL, 'api_calls', 1000, 950, 'monthly', NOW() - INTERVAL '15 days', NOW() - INTERVAL '30 days', NOW()),
    ('quota-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', NULL, 'storage_gb', 1, 1, 'monthly', NOW() - INTERVAL '15 days', NOW() - INTERVAL '30 days', NOW()),
    ('quota-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222222', NULL, 'projects', 3, 3, 'monthly', NOW() - INTERVAL '15 days', NOW() - INTERVAL '30 days', NOW()),
    ('quota-2222-2222-2222-222222222224', '22222222-2222-2222-2222-222222222222', NULL, 'team_members', 1, 1, 'monthly', NOW() - INTERVAL '15 days', NOW() - INTERVAL '30 days', NOW()),
    ('quota-2222-2222-2222-222222222225', '22222222-2222-2222-2222-222222222222', NULL, 'email_sends', 100, 85, 'monthly', NOW() - INTERVAL '15 days', NOW() - INTERVAL '30 days', NOW()),
    
    -- Organization quotas (Acme Corporation - Enterprise)
    ('quota-aaaa-aaaa-aaaa-aaaaaaaaaaaa1', NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'api_calls', -1, 125000, 'monthly', NOW() - INTERVAL '15 days', NOW() - INTERVAL '30 days', NOW()),
    ('quota-aaaa-aaaa-aaaa-aaaaaaaaaaaa2', NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'storage_gb', 1000, 150, 'monthly', NOW() - INTERVAL '15 days', NOW() - INTERVAL '30 days', NOW()),
    ('quota-aaaa-aaaa-aaaa-aaaaaaaaaaaa3', NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'projects', -1, 25, 'monthly', NOW() - INTERVAL '15 days', NOW() - INTERVAL '30 days', NOW()),
    ('quota-aaaa-aaaa-aaaa-aaaaaaaaaaaa4', NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'team_members', 50, 15, 'monthly', NOW() - INTERVAL '15 days', NOW() - INTERVAL '30 days', NOW()),
    ('quota-aaaa-aaaa-aaaa-aaaaaaaaaaaa5', NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'email_sends', 100000, 35000, 'monthly', NOW() - INTERVAL '15 days', NOW() - INTERVAL '30 days', NOW()),
    ('quota-aaaa-aaaa-aaaa-aaaaaaaaaaaa6', NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'custom_domains', 10, 3, 'monthly', NOW() - INTERVAL '15 days', NOW() - INTERVAL '30 days', NOW()),
    
    -- Tech Startup Inc (Pro plan)
    ('quota-bbbb-bbbb-bbbb-bbbbbbbbbbbb1', NULL, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'api_calls', 50000, 38000, 'monthly', NOW() - INTERVAL '15 days', NOW() - INTERVAL '30 days', NOW()),
    ('quota-bbbb-bbbb-bbbb-bbbbbbbbbbbb2', NULL, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'storage_gb', 100, 45, 'monthly', NOW() - INTERVAL '15 days', NOW() - INTERVAL '30 days', NOW()),
    ('quota-bbbb-bbbb-bbbb-bbbbbbbbbbbb3', NULL, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'projects', -1, 12, 'monthly', NOW() - INTERVAL '15 days', NOW() - INTERVAL '30 days', NOW()),
    ('quota-bbbb-bbbb-bbbb-bbbbbbbbbbbb4', NULL, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'team_members', 10, 6, 'monthly', NOW() - INTERVAL '15 days', NOW() - INTERVAL '30 days', NOW()),
    ('quota-bbbb-bbbb-bbbb-bbbbbbbbbbbb5', NULL, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'email_sends', 10000, 4200, 'monthly', NOW() - INTERVAL '15 days', NOW() - INTERVAL '30 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert sample usage events for the current month
INSERT INTO public.usage_events (id, user_id, organization_id, event_type, quantity, unit_price, metadata, created_at, billing_period_start, billing_period_end, processed) VALUES
    -- John Doe's usage events
    ('event-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', NULL, 'api_call', 250, 0.001, '{"endpoint": "/api/projects", "method": "GET"}', NOW() - INTERVAL '1 hour', DATE_TRUNC('month', NOW()), DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day', true),
    ('event-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', NULL, 'storage_used', 2, 0.1, '{"file_type": "image", "size_mb": 2048}', NOW() - INTERVAL '2 hours', DATE_TRUNC('month', NOW()), DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day', true),
    ('event-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', NULL, 'email_sent', 50, 0.001, '{"template": "welcome", "recipients": 50}', NOW() - INTERVAL '3 hours', DATE_TRUNC('month', NOW()), DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day', true),
    ('event-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111111', NULL, 'project_created', 1, 0, '{"project_name": "New Website", "template": "blank"}', NOW() - INTERVAL '1 day', DATE_TRUNC('month', NOW()), DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day', true),
    ('event-1111-1111-1111-111111111115', '11111111-1111-1111-1111-111111111111', NULL, 'export_generated', 1, 0.05, '{"format": "csv", "records": 1500}', NOW() - INTERVAL '2 days', DATE_TRUNC('month', NOW()), DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day', true),
    
    -- Jane Smith's usage events (approaching limits)
    ('event-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', NULL, 'api_call', 100, 0.001, '{"endpoint": "/api/dashboard", "method": "GET"}', NOW() - INTERVAL '30 minutes', DATE_TRUNC('month', NOW()), DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day', true),
    ('event-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', NULL, 'storage_used', 1, 0.1, '{"file_type": "document", "size_mb": 512}', NOW() - INTERVAL '1 hour', DATE_TRUNC('month', NOW()), DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day', true),
    ('event-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222222', NULL, 'email_sent', 10, 0.001, '{"template": "notification", "recipients": 10}', NOW() - INTERVAL '2 hours', DATE_TRUNC('month', NOW()), DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day', true),
    
    -- Acme Corporation usage events (high volume)
    ('event-aaaa-aaaa-aaaa-aaaaaaaaaaaa1', NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'api_call', 5000, 0.001, '{"endpoint": "/api/data", "method": "POST", "batch": true}', NOW() - INTERVAL '15 minutes', DATE_TRUNC('month', NOW()), DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day', true),
    ('event-aaaa-aaaa-aaaa-aaaaaaaaaaaa2', NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'storage_used', 50, 0.1, '{"file_type": "backup", "size_gb": 50}', NOW() - INTERVAL '30 minutes', DATE_TRUNC('month', NOW()), DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day', true),
    ('event-aaaa-aaaa-aaaa-aaaaaaaaaaaa3', NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'email_sent', 1000, 0.001, '{"template": "newsletter", "recipients": 1000}', NOW() - INTERVAL '45 minutes', DATE_TRUNC('month', NOW()), DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day', true),
    ('event-aaaa-aaaa-aaaa-aaaaaaaaaaaa4', NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'backup_created', 1, 0.1, '{"type": "full", "size_gb": 100}', NOW() - INTERVAL '1 hour', DATE_TRUNC('month', NOW()), DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day', true),
    ('event-aaaa-aaaa-aaaa-aaaaaaaaaaaa5', NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'custom_domain', 1, 5.0, '{"domain": "app.acmecorp.com", "ssl": true}', NOW() - INTERVAL '2 hours', DATE_TRUNC('month', NOW()), DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day', true),
    
    -- Tech Startup Inc usage events
    ('event-bbbb-bbbb-bbbb-bbbbbbbbbbbb1', NULL, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'api_call', 1500, 0.001, '{"endpoint": "/api/analytics", "method": "GET"}', NOW() - INTERVAL '20 minutes', DATE_TRUNC('month', NOW()), DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day', true),
    ('event-bbbb-bbbb-bbbb-bbbbbbbbbbbb2', NULL, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'storage_used', 10, 0.1, '{"file_type": "media", "size_gb": 10}', NOW() - INTERVAL '40 minutes', DATE_TRUNC('month', NOW()), DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day', true),
    ('event-bbbb-bbbb-bbbb-bbbbbbbbbbbb3', NULL, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'export_generated', 3, 0.05, '{"format": "json", "records": 5000}', NOW() - INTERVAL '1 hour', DATE_TRUNC('month', NOW()), DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day', true),
    
    -- Some unprocessed events for testing
    ('event-unproc-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', NULL, 'api_call', 75, NULL, '{"endpoint": "/api/reports", "method": "GET"}', NOW() - INTERVAL '5 minutes', DATE_TRUNC('month', NOW()), DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day', false),
    ('event-unproc-aaaa-aaaa-aaaaaaaaaaaa', NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'email_sent', 500, NULL, '{"template": "marketing", "recipients": 500}', NOW() - INTERVAL '10 minutes', DATE_TRUNC('month', NOW()), DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day', false)
ON CONFLICT (id) DO NOTHING;

-- Insert sample invoice items for usage billing
INSERT INTO public.invoice_items (id, subscription_id, stripe_invoice_item_id, description, amount, quantity, unit_price, period_start, period_end, usage_type, metadata, created_at) VALUES
    -- John Doe's invoice items (Pro subscription)
    ('invoice-item-1111-1111-1111-111111', 'sub-4444-4444-4444-444444444444', 'ii_test_john_api_calls', 'API Calls usage - 12,500 calls', 1250, 12500, 0.1, DATE_TRUNC('month', NOW()), NOW(), 'api_call', '{"billing_month": "current"}', NOW() - INTERVAL '1 hour'),
    ('invoice-item-1111-1111-1111-111112', 'sub-4444-4444-4444-444444444444', 'ii_test_john_storage', 'Storage usage - 25 GB', 250, 25, 10, DATE_TRUNC('month', NOW()), NOW(), 'storage_used', '{"billing_month": "current"}', NOW() - INTERVAL '1 hour'),
    ('invoice-item-1111-1111-1111-111113', 'sub-4444-4444-4444-444444444444', 'ii_test_john_emails', 'Email sending - 2,500 emails', 250, 2500, 0.1, DATE_TRUNC('month', NOW()), NOW(), 'email_sent', '{"billing_month": "current"}', NOW() - INTERVAL '1 hour'),
    
    -- Acme Corporation's invoice items (Enterprise subscription)
    ('invoice-item-aaaa-aaaa-aaaa-aaaaaaa1', 'sub-1111-1111-1111-111111111111', 'ii_test_acme_api_calls', 'API Calls usage - 125,000 calls', 12500, 125000, 0.1, DATE_TRUNC('month', NOW()), NOW(), 'api_call', '{"billing_month": "current"}', NOW() - INTERVAL '2 hours'),
    ('invoice-item-aaaa-aaaa-aaaa-aaaaaaa2', 'sub-1111-1111-1111-111111111111', 'ii_test_acme_storage', 'Storage usage - 150 GB', 1500, 150, 10, DATE_TRUNC('month', NOW()), NOW(), 'storage_used', '{"billing_month": "current"}', NOW() - INTERVAL '2 hours'),
    ('invoice-item-aaaa-aaaa-aaaa-aaaaaaa3', 'sub-1111-1111-1111-111111111111', 'ii_test_acme_emails', 'Email sending - 35,000 emails', 3500, 35000, 0.1, DATE_TRUNC('month', NOW()), NOW(), 'email_sent', '{"billing_month": "current"}', NOW() - INTERVAL '2 hours'),
    ('invoice-item-aaaa-aaaa-aaaa-aaaaaaa4', 'sub-1111-1111-1111-111111111111', 'ii_test_acme_domains', 'Custom domains - 3 domains', 1500, 3, 500, DATE_TRUNC('month', NOW()), NOW(), 'custom_domain', '{"billing_month": "current"}', NOW() - INTERVAL '2 hours')
ON CONFLICT (id) DO NOTHING;

-- Insert sample billing alerts
INSERT INTO public.billing_alerts (id, user_id, organization_id, alert_type, quota_type, threshold_percentage, current_usage, limit_value, triggered_at, acknowledged, acknowledged_at, metadata) VALUES
    -- Jane Smith's quota warnings (Free plan user approaching limits)
    ('alert-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', NULL, 'quota_warning', 'api_calls', 95, 950, 1000, NOW() - INTERVAL '2 hours', false, NULL, '{"warning_level": "high", "days_remaining": 10}'),
    ('alert-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', NULL, 'quota_exceeded', 'storage_gb', 100, 1, 1, NOW() - INTERVAL '1 hour', false, NULL, '{"exceeded_by": 0, "upgrade_required": true}'),
    ('alert-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222222', NULL, 'quota_warning', 'email_sends', 85, 85, 100, NOW() - INTERVAL '3 hours', true, NOW() - INTERVAL '1 hour', '{"warning_level": "medium"}'),
    
    -- Tech Startup Inc warnings (Pro plan approaching limits)
    ('alert-bbbb-bbbb-bbbb-bbbbbbbbbbbb1', NULL, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'quota_warning', 'api_calls', 76, 38000, 50000, NOW() - INTERVAL '6 hours', false, NULL, '{"warning_level": "low", "trend": "increasing"}'),
    
    -- Sample payment failure alert
    ('alert-payment-fail-1111-1111-1111', '22222222-2222-2222-2222-222222222222', NULL, 'payment_failed', NULL, NULL, NULL, NULL, NOW() - INTERVAL '1 day', false, NULL, '{"invoice_id": "in_test_failed_payment", "amount": 999, "retry_count": 2}'),
    
    -- Sample trial ending alert
    ('alert-trial-end-5555-5555-5555-555', '55555555-5555-5555-5555-555555555555', NULL, 'trial_ending', NULL, NULL, NULL, NULL, NOW() - INTERVAL '12 hours', false, NULL, '{"days_remaining": 3, "trial_end_date": "2025-07-03"}')
ON CONFLICT (id) DO NOTHING;

-- Insert sample payment failures for testing
INSERT INTO public.payment_failures (id, subscription_id, stripe_invoice_id, failure_reason, retry_count, next_retry_at, resolved, resolved_at, created_at, updated_at) VALUES
    ('payment-failure-1111-1111-1111-11', 'sub-2222-2222-2222-222222222222', 'in_test_failed_payment_jane', 'Your card was declined. Please update your payment method.', 2, NOW() + INTERVAL '1 day', false, NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
    ('payment-failure-2222-2222-2222-22', 'sub-3333-3333-3333-333333333333', 'in_test_failed_payment_design', 'Insufficient funds in account.', 1, NOW() + INTERVAL '3 days', false, NULL, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours')
ON CONFLICT (id) DO NOTHING;

-- Update subscription sample to add some test data with different statuses
UPDATE public.subscriptions 
SET status = 'past_due', updated_at = NOW() 
WHERE stripe_subscription_id = 'sub_test_startup_pro';

-- Create some additional comments and documentation
COMMENT ON TABLE public.usage_events IS 'Tracks all billable usage events for metered billing - populated automatically by usage tracking';
COMMENT ON TABLE public.usage_quotas IS 'Manages usage limits and current usage per user/organization - automatically updated by usage tracking';
COMMENT ON TABLE public.invoice_items IS 'Stores detailed invoice line items for usage-based billing - synced with Stripe invoice items';
COMMENT ON TABLE public.billing_alerts IS 'Manages usage warnings and billing notifications - automatically created when quotas are exceeded';
COMMENT ON TABLE public.payment_failures IS 'Tracks payment failures and retry logic - populated by Stripe webhook events';

-- Create some helpful views for reporting
CREATE OR REPLACE VIEW usage_summary AS
SELECT 
    COALESCE(ue.organization_id::text, ue.user_id::text) as context_id,
    CASE 
        WHEN ue.organization_id IS NOT NULL THEN 'organization'
        ELSE 'user'
    END as context_type,
    ue.event_type,
    COUNT(*) as event_count,
    SUM(ue.quantity) as total_quantity,
    SUM(ue.quantity * COALESCE(ue.unit_price, 0)) as total_cost,
    DATE_TRUNC('day', ue.created_at) as usage_date
FROM usage_events ue 
WHERE ue.created_at >= DATE_TRUNC('month', NOW())
AND ue.processed = true
GROUP BY 
    COALESCE(ue.organization_id::text, ue.user_id::text),
    CASE WHEN ue.organization_id IS NOT NULL THEN 'organization' ELSE 'user' END,
    ue.event_type,
    DATE_TRUNC('day', ue.created_at)
ORDER BY usage_date DESC, total_cost DESC;

CREATE OR REPLACE VIEW quota_utilization AS
SELECT 
    COALESCE(uq.organization_id::text, uq.user_id::text) as context_id,
    CASE 
        WHEN uq.organization_id IS NOT NULL THEN 'organization'
        ELSE 'user'
    END as context_type,
    uq.quota_type,
    uq.current_usage,
    uq.limit_value,
    CASE 
        WHEN uq.limit_value = -1 THEN 0
        WHEN uq.limit_value = 0 THEN 100
        ELSE ROUND((uq.current_usage::numeric / uq.limit_value::numeric) * 100, 2)
    END as utilization_percentage,
    CASE 
        WHEN uq.limit_value = -1 THEN 'unlimited'
        WHEN uq.limit_value = 0 THEN 'no_quota'
        WHEN (uq.current_usage::numeric / uq.limit_value::numeric) >= 1 THEN 'exceeded'
        WHEN (uq.current_usage::numeric / uq.limit_value::numeric) >= 0.8 THEN 'warning'
        ELSE 'healthy'
    END as status,
    uq.reset_period,
    uq.last_reset,
    uq.updated_at
FROM usage_quotas uq
ORDER BY utilization_percentage DESC;

-- Grant permissions on views
GRANT SELECT ON usage_summary TO authenticated;
GRANT SELECT ON quota_utilization TO authenticated;
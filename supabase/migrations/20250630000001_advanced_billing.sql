-- UPDATED: 2025-06-30 - Created advanced billing tables for usage tracking and metered billing

-- Usage events table for tracking billable activities
CREATE TABLE IF NOT EXISTS public.usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'api_call', 'storage_used', 'project_created', etc.
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER, -- in cents, for dynamic pricing
  metadata JSONB DEFAULT '{}', -- flexible data storage
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  billing_period_start TIMESTAMP WITH TIME ZONE,
  billing_period_end TIMESTAMP WITH TIME ZONE,
  processed BOOLEAN DEFAULT false -- for billing processing status
);

-- Usage quotas table for plan limits
CREATE TABLE IF NOT EXISTS public.usage_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  quota_type VARCHAR(50) NOT NULL, -- 'api_calls', 'storage_gb', 'projects', etc.
  limit_value INTEGER NOT NULL, -- -1 for unlimited
  current_usage INTEGER NOT NULL DEFAULT 0,
  reset_period VARCHAR(20) NOT NULL DEFAULT 'monthly', -- 'monthly', 'daily', 'yearly'
  last_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, organization_id, quota_type)
);

-- Invoice items table for detailed billing
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  stripe_invoice_item_id VARCHAR(255) UNIQUE,
  description TEXT NOT NULL,
  amount INTEGER NOT NULL, -- in cents
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL, -- in cents
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  usage_type VARCHAR(50), -- links to usage_events.event_type
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Billing alerts table for usage warnings
CREATE TABLE IF NOT EXISTS public.billing_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL, -- 'quota_warning', 'quota_exceeded', 'payment_failed'
  quota_type VARCHAR(50), -- what quota triggered the alert
  threshold_percentage INTEGER, -- e.g., 80 for 80% usage warning
  current_usage INTEGER,
  limit_value INTEGER,
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'
);

-- Payment failures table for retry logic
CREATE TABLE IF NOT EXISTS public.payment_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  stripe_invoice_id VARCHAR(255),
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_usage_events_user_type_created ON public.usage_events(user_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_events_org_type_created ON public.usage_events(organization_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_events_billing_period ON public.usage_events(billing_period_start, billing_period_end);
CREATE INDEX IF NOT EXISTS idx_usage_events_processed ON public.usage_events(processed, created_at);

CREATE INDEX IF NOT EXISTS idx_usage_quotas_user_quota_type ON public.usage_quotas(user_id, quota_type);
CREATE INDEX IF NOT EXISTS idx_usage_quotas_org_quota_type ON public.usage_quotas(organization_id, quota_type);
CREATE INDEX IF NOT EXISTS idx_usage_quotas_last_reset ON public.usage_quotas(last_reset);

CREATE INDEX IF NOT EXISTS idx_invoice_items_subscription ON public.invoice_items(subscription_id, period_start);
CREATE INDEX IF NOT EXISTS idx_invoice_items_stripe_id ON public.invoice_items(stripe_invoice_item_id);

CREATE INDEX IF NOT EXISTS idx_billing_alerts_user_type ON public.billing_alerts(user_id, alert_type, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_alerts_org_type ON public.billing_alerts(organization_id, alert_type, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_alerts_acknowledged ON public.billing_alerts(acknowledged, triggered_at);

CREATE INDEX IF NOT EXISTS idx_payment_failures_subscription ON public.payment_failures(subscription_id, resolved);
CREATE INDEX IF NOT EXISTS idx_payment_failures_retry ON public.payment_failures(next_retry_at, resolved);

-- Row Level Security Policies

-- Usage events policies
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage events" ON public.usage_events
  FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.uid() IN (
      SELECT user_id FROM public.organization_members 
      WHERE organization_id = usage_events.organization_id 
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "System can insert usage events" ON public.usage_events
  FOR INSERT WITH CHECK (true);

-- Usage quotas policies
ALTER TABLE public.usage_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quotas" ON public.usage_quotas
  FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.uid() IN (
      SELECT user_id FROM public.organization_members 
      WHERE organization_id = usage_quotas.organization_id 
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "System can manage quotas" ON public.usage_quotas
  FOR ALL WITH CHECK (true);

-- Invoice items policies
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their invoice items" ON public.invoice_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.id = invoice_items.subscription_id
      AND (s.user_id = auth.uid() OR s.organization_id IN (
        SELECT organization_id FROM public.organization_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      ))
    )
  );

-- Billing alerts policies
ALTER TABLE public.billing_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their billing alerts" ON public.billing_alerts
  FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.uid() IN (
      SELECT user_id FROM public.organization_members 
      WHERE organization_id = billing_alerts.organization_id 
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can acknowledge their alerts" ON public.billing_alerts
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    auth.uid() IN (
      SELECT user_id FROM public.organization_members 
      WHERE organization_id = billing_alerts.organization_id 
      AND role IN ('owner', 'admin')
    )
  );

-- Payment failures policies
ALTER TABLE public.payment_failures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their payment failures" ON public.payment_failures
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.id = payment_failures.subscription_id
      AND (s.user_id = auth.uid() OR s.organization_id IN (
        SELECT organization_id FROM public.organization_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      ))
    )
  );

-- Add helpful comments
COMMENT ON TABLE public.usage_events IS 'Tracks billable usage events for metered billing';
COMMENT ON TABLE public.usage_quotas IS 'Manages usage limits and current usage per user/organization';
COMMENT ON TABLE public.invoice_items IS 'Stores detailed invoice line items for usage-based billing';
COMMENT ON TABLE public.billing_alerts IS 'Manages usage warnings and billing notifications';
COMMENT ON TABLE public.payment_failures IS 'Tracks payment failures and retry logic';

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON public.usage_events TO authenticated;
GRANT ALL ON public.usage_quotas TO authenticated;
GRANT ALL ON public.invoice_items TO authenticated;
GRANT ALL ON public.billing_alerts TO authenticated;
GRANT ALL ON public.payment_failures TO authenticated;
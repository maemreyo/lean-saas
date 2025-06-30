-- Marketing & Growth Module Database Schema
-- Following patterns from billing module with RLS, proper indexes, and relationships

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- LANDING PAGES & A/B TESTING
-- ================================================

-- Landing pages table for page builder
CREATE TABLE public.landing_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    slug VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    config JSONB NOT NULL DEFAULT '{}',
    seo_meta JSONB DEFAULT '{}',
    published BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    view_count INTEGER DEFAULT 0,
    conversion_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- A/B testing experiments
CREATE TABLE public.ab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    hypothesis TEXT,
    target_metric VARCHAR(100) NOT NULL, -- 'conversion_rate', 'signup_rate', etc.
    variants JSONB NOT NULL DEFAULT '[]',
    traffic_split JSONB NOT NULL DEFAULT '{"A": 50, "B": 50}',
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed')),
    confidence_level DECIMAL(3,2) DEFAULT 0.95,
    statistical_significance DECIMAL(5,4),
    winner_variant VARCHAR(10),
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    results JSONB DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- A/B test sessions (track which variant users see)
CREATE TABLE public.ab_test_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ab_test_id UUID NOT NULL REFERENCES public.ab_tests(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL, -- Anonymous session ID
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    variant_id VARCHAR(10) NOT NULL,
    converted BOOLEAN DEFAULT false,
    conversion_event VARCHAR(100),
    conversion_value DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- LEAD CAPTURE & EMAIL MARKETING
-- ================================================

-- Lead captures from forms
CREATE TABLE public.lead_captures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    source VARCHAR(100), -- 'landing_page', 'blog', 'referral', etc.
    landing_page_id UUID REFERENCES public.landing_pages(id) ON DELETE SET NULL,
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    utm_content VARCHAR(100),
    utm_term VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    subscribed BOOLEAN DEFAULT true,
    unsubscribed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email marketing campaigns
CREATE TABLE public.email_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    template_id UUID,
    campaign_type VARCHAR(50) DEFAULT 'newsletter' CHECK (campaign_type IN ('newsletter', 'welcome', 'drip', 'promotional', 'transactional')),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused')),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    recipient_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    bounced_count INTEGER DEFAULT 0,
    unsubscribed_count INTEGER DEFAULT 0,
    settings JSONB DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email campaign recipients
CREATE TABLE public.email_campaign_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.lead_captures(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'opened', 'clicked', 'bounced', 'unsubscribed')),
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    bounced_at TIMESTAMP WITH TIME ZONE,
    unsubscribed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- REFERRAL & VIRAL GROWTH
-- ================================================

-- Referral codes and tracking
CREATE TABLE public.referral_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    reward_type VARCHAR(50) DEFAULT 'discount' CHECK (reward_type IN ('discount', 'credit', 'commission', 'custom')),
    reward_value DECIMAL(10,2),
    reward_description TEXT,
    max_uses INTEGER, -- NULL = unlimited
    current_uses INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Referral tracking
CREATE TABLE public.referral_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_code_id UUID NOT NULL REFERENCES public.referral_codes(id) ON DELETE CASCADE,
    referrer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    referred_email VARCHAR(255),
    conversion_type VARCHAR(50) DEFAULT 'signup' CHECK (conversion_type IN ('signup', 'trial', 'subscription', 'purchase')),
    conversion_value DECIMAL(10,2),
    commission_amount DECIMAL(10,2),
    commission_paid BOOLEAN DEFAULT false,
    commission_paid_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Social sharing tracking
CREATE TABLE public.social_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content_type VARCHAR(50) NOT NULL, -- 'landing_page', 'blog_post', 'feature', etc.
    content_id VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL, -- 'twitter', 'facebook', 'linkedin', etc.
    share_url TEXT NOT NULL,
    click_count INTEGER DEFAULT 0,
    conversion_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- SEO & CONTENT MARKETING
-- ================================================

-- SEO metadata management
CREATE TABLE public.seo_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    page_type VARCHAR(50) NOT NULL, -- 'landing_page', 'blog_post', 'product', etc.
    page_id VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    description TEXT,
    keywords TEXT[],
    canonical_url TEXT,
    og_title VARCHAR(255),
    og_description TEXT,
    og_image TEXT,
    og_type VARCHAR(50) DEFAULT 'website',
    twitter_card VARCHAR(50) DEFAULT 'summary_large_image',
    twitter_title VARCHAR(255),
    twitter_description TEXT,
    twitter_image TEXT,
    structured_data JSONB DEFAULT '{}',
    meta_robots VARCHAR(100) DEFAULT 'index,follow',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(organization_id, page_type, page_id)
);

-- ================================================
-- GROWTH ANALYTICS & METRICS
-- ================================================

-- Growth metrics tracking
CREATE TABLE public.growth_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    metric_type VARCHAR(100) NOT NULL, -- 'page_view', 'signup', 'conversion', 'referral', etc.
    metric_value DECIMAL(15,4) NOT NULL,
    dimensions JSONB DEFAULT '{}', -- Additional context (source, campaign, etc.)
    date_recorded DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Growth experiments tracking
CREATE TABLE public.growth_experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    hypothesis TEXT,
    experiment_type VARCHAR(50) NOT NULL, -- 'landing_page', 'email', 'onboarding', etc.
    status VARCHAR(20) DEFAULT 'planning' CHECK (status IN ('planning', 'running', 'analyzing', 'implemented', 'rejected')),
    success_criteria TEXT,
    baseline_metrics JSONB DEFAULT '{}',
    experiment_metrics JSONB DEFAULT '{}',
    results JSONB DEFAULT '{}',
    learnings TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- INDEXES FOR PERFORMANCE
-- ================================================

-- Landing pages indexes
CREATE INDEX idx_landing_pages_organization ON public.landing_pages(organization_id);
CREATE INDEX idx_landing_pages_slug ON public.landing_pages(slug) WHERE published = true;
CREATE INDEX idx_landing_pages_published ON public.landing_pages(published, created_at);

-- A/B tests indexes
CREATE INDEX idx_ab_tests_organization ON public.ab_tests(organization_id);
CREATE INDEX idx_ab_tests_status ON public.ab_tests(status);
CREATE INDEX idx_ab_test_sessions_test_id ON public.ab_test_sessions(ab_test_id);
CREATE INDEX idx_ab_test_sessions_session ON public.ab_test_sessions(session_id);

-- Lead captures indexes
CREATE INDEX idx_lead_captures_organization ON public.lead_captures(organization_id);
CREATE INDEX idx_lead_captures_email ON public.lead_captures(email);
CREATE INDEX idx_lead_captures_source ON public.lead_captures(source);
CREATE INDEX idx_lead_captures_created ON public.lead_captures(created_at);

-- Email campaigns indexes
CREATE INDEX idx_email_campaigns_organization ON public.email_campaigns(organization_id);
CREATE INDEX idx_email_campaigns_status ON public.email_campaigns(status);
CREATE INDEX idx_email_campaign_recipients_campaign ON public.email_campaign_recipients(campaign_id);
CREATE INDEX idx_email_campaign_recipients_email ON public.email_campaign_recipients(email);

-- Referral indexes
CREATE INDEX idx_referral_codes_organization ON public.referral_codes(organization_id);
CREATE INDEX idx_referral_codes_user ON public.referral_codes(user_id);
CREATE INDEX idx_referral_codes_code ON public.referral_codes(code) WHERE active = true;
CREATE INDEX idx_referral_conversions_code ON public.referral_conversions(referral_code_id);
CREATE INDEX idx_referral_conversions_referrer ON public.referral_conversions(referrer_user_id);

-- Social shares indexes
CREATE INDEX idx_social_shares_organization ON public.social_shares(organization_id);
CREATE INDEX idx_social_shares_content ON public.social_shares(content_type, content_id);
CREATE INDEX idx_social_shares_platform ON public.social_shares(platform);

-- SEO metadata indexes
CREATE INDEX idx_seo_metadata_organization ON public.seo_metadata(organization_id);
CREATE INDEX idx_seo_metadata_page ON public.seo_metadata(page_type, page_id);

-- Growth metrics indexes
CREATE INDEX idx_growth_metrics_organization ON public.growth_metrics(organization_id);
CREATE INDEX idx_growth_metrics_type_date ON public.growth_metrics(metric_type, date_recorded);
CREATE INDEX idx_growth_metrics_date ON public.growth_metrics(date_recorded);

-- Growth experiments indexes
CREATE INDEX idx_growth_experiments_organization ON public.growth_experiments(organization_id);
CREATE INDEX idx_growth_experiments_status ON public.growth_experiments(status);

-- ================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================

-- Enable RLS on all tables
ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_experiments ENABLE ROW LEVEL SECURITY;

-- Landing pages policies
CREATE POLICY "Users can view landing pages in their organization"
    ON public.landing_pages FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create landing pages in their organization"
    ON public.landing_pages FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update landing pages in their organization"
    ON public.landing_pages FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete landing pages in their organization"
    ON public.landing_pages FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- A/B tests policies (similar pattern)
CREATE POLICY "Users can view ab_tests in their organization"
    ON public.ab_tests FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage ab_tests in their organization"
    ON public.ab_tests FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- A/B test sessions policies (public read for tracking)
CREATE POLICY "Anyone can insert ab_test_sessions"
    ON public.ab_test_sessions FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can view ab_test_sessions for their organization"
    ON public.ab_test_sessions FOR SELECT
    USING (
        ab_test_id IN (
            SELECT id FROM public.ab_tests 
            WHERE organization_id IN (
                SELECT organization_id FROM public.organization_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Lead captures policies
CREATE POLICY "Anyone can insert lead captures"
    ON public.lead_captures FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can view lead captures in their organization"
    ON public.lead_captures FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update lead captures in their organization"
    ON public.lead_captures FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Email campaigns policies (organization-scoped)
CREATE POLICY "Users can manage email campaigns in their organization"
    ON public.email_campaigns FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage email campaign recipients in their organization"
    ON public.email_campaign_recipients FOR ALL
    USING (
        campaign_id IN (
            SELECT id FROM public.email_campaigns 
            WHERE organization_id IN (
                SELECT organization_id FROM public.organization_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Referral codes policies
CREATE POLICY "Users can view referral codes in their organization"
    ON public.referral_codes FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid()
        ) OR user_id = auth.uid()
    );

CREATE POLICY "Users can manage their own referral codes"
    ON public.referral_codes FOR ALL
    USING (user_id = auth.uid());

-- Referral conversions policies
CREATE POLICY "Users can view referral conversions for their codes"
    ON public.referral_conversions FOR SELECT
    USING (
        referrer_user_id = auth.uid() OR
        referral_code_id IN (
            SELECT id FROM public.referral_codes 
            WHERE organization_id IN (
                SELECT organization_id FROM public.organization_members 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Anyone can insert referral conversions"
    ON public.referral_conversions FOR INSERT
    WITH CHECK (true);

-- Social shares policies
CREATE POLICY "Users can manage social shares in their organization"
    ON public.social_shares FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- SEO metadata policies
CREATE POLICY "Users can manage seo metadata in their organization"
    ON public.seo_metadata FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Growth metrics policies
CREATE POLICY "Users can manage growth metrics in their organization"
    ON public.growth_metrics FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Growth experiments policies
CREATE POLICY "Users can manage growth experiments in their organization"
    ON public.growth_experiments FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- ================================================
-- USEFUL VIEWS FOR ANALYTICS
-- ================================================

-- Marketing overview view
CREATE VIEW public.marketing_overview AS
SELECT 
    lp.organization_id,
    COUNT(DISTINCT lp.id) as total_landing_pages,
    COUNT(DISTINCT lc.id) as total_leads,
    COUNT(DISTINCT rc.id) as total_referral_codes,
    COUNT(DISTINCT CASE WHEN lp.published = true THEN lp.id END) as published_pages,
    COUNT(DISTINCT CASE WHEN lc.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN lc.id END) as leads_last_30_days,
    COALESCE(SUM(lp.view_count), 0) as total_page_views,
    COALESCE(SUM(lp.conversion_count), 0) as total_conversions,
    CASE 
        WHEN SUM(lp.view_count) > 0 
        THEN ROUND((SUM(lp.conversion_count)::DECIMAL / SUM(lp.view_count)) * 100, 2)
        ELSE 0 
    END as overall_conversion_rate
FROM public.landing_pages lp
LEFT JOIN public.lead_captures lc ON lc.organization_id = lp.organization_id
LEFT JOIN public.referral_codes rc ON rc.organization_id = lp.organization_id
GROUP BY lp.organization_id;

-- Growth metrics summary view
CREATE VIEW public.growth_metrics_summary AS
SELECT 
    organization_id,
    metric_type,
    date_recorded,
    SUM(metric_value) as total_value,
    COUNT(*) as event_count,
    AVG(metric_value) as avg_value
FROM public.growth_metrics
GROUP BY organization_id, metric_type, date_recorded;

-- ================================================
-- FUNCTIONS & TRIGGERS
-- ================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_landing_pages_updated_at
    BEFORE UPDATE ON public.landing_pages
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ab_tests_updated_at
    BEFORE UPDATE ON public.ab_tests
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_campaigns_updated_at
    BEFORE UPDATE ON public.email_campaigns
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_referral_codes_updated_at
    BEFORE UPDATE ON public.referral_codes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_seo_metadata_updated_at
    BEFORE UPDATE ON public.seo_metadata
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_growth_experiments_updated_at
    BEFORE UPDATE ON public.growth_experiments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists BOOLEAN := true;
BEGIN
    WHILE exists LOOP
        code := upper(substr(md5(random()::text), 1, 8));
        SELECT COUNT(*) > 0 INTO exists FROM public.referral_codes WHERE code = code;
    END LOOP;
    RETURN code;
END;
$$ LANGUAGE plpgsql;
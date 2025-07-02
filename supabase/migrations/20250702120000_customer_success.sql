-- Customer Success Module Database Schema
-- Following patterns from billing and marketing modules

-- ================================================
-- ENUMS
-- ================================================

-- Onboarding status enum
CREATE TYPE onboarding_status AS ENUM (
  'not_started',
  'in_progress', 
  'completed',
  'skipped',
  'abandoned'
);

-- Feature tour status enum
CREATE TYPE tour_status AS ENUM (
  'active',
  'completed',
  'skipped',
  'paused'
);

-- Feedback type enum
CREATE TYPE feedback_type AS ENUM (
  'nps',
  'csat',
  'rating',
  'comment',
  'bug_report',
  'feature_request',
  'survey_response'
);

-- Support ticket status enum
CREATE TYPE ticket_status AS ENUM (
  'open',
  'in_progress',
  'waiting_customer',
  'resolved',
  'closed',
  'escalated'
);

-- Support ticket priority enum
CREATE TYPE ticket_priority AS ENUM (
  'low',
  'medium',
  'high',
  'urgent',
  'critical'
);

-- Knowledge base article status enum
CREATE TYPE article_status AS ENUM (
  'draft',
  'published',
  'archived',
  'under_review'
);

-- Customer health status enum
CREATE TYPE health_status AS ENUM (
  'healthy',
  'at_risk',
  'critical',
  'churned',
  'recovering'
);

-- Feature adoption status enum
CREATE TYPE adoption_status AS ENUM (
  'not_adopted',
  'exploring',
  'active',
  'power_user',
  'churned'
);

-- Message type enum
CREATE TYPE message_type AS ENUM (
  'notification',
  'announcement',
  'tips',
  'feature_highlight',
  'survey_prompt',
  'support_followup'
);

-- Survey type enum
CREATE TYPE survey_type AS ENUM (
  'nps',
  'csat',
  'onboarding_feedback',
  'feature_feedback',
  'churn_survey',
  'product_feedback'
);

-- ================================================
-- TABLES
-- ================================================

-- 1. User Onboarding Table
CREATE TABLE user_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Onboarding configuration
  flow_name VARCHAR(255) NOT NULL DEFAULT 'default',
  current_step INTEGER NOT NULL DEFAULT 1,
  total_steps INTEGER NOT NULL DEFAULT 5,
  status onboarding_status NOT NULL DEFAULT 'not_started',
  
  -- Progress tracking
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  
  -- Step completion tracking (JSON array of completed step numbers)
  completed_steps JSONB DEFAULT '[]'::jsonb,
  skipped_steps JSONB DEFAULT '[]'::jsonb,
  step_data JSONB DEFAULT '{}'::jsonb, -- Store step-specific data
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Feature Tours Table
CREATE TABLE feature_tours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Tour configuration
  tour_name VARCHAR(255) NOT NULL,
  tour_version VARCHAR(50) DEFAULT '1.0',
  status tour_status NOT NULL DEFAULT 'active',
  
  -- Progress tracking
  current_step INTEGER NOT NULL DEFAULT 1,
  total_steps INTEGER NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  last_step_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Step tracking
  completed_steps JSONB DEFAULT '[]'::jsonb,
  step_timings JSONB DEFAULT '{}'::jsonb, -- Time spent on each step
  
  -- User interaction data
  interactions JSONB DEFAULT '{}'::jsonb, -- Clicks, hovers, etc.
  feedback_score INTEGER CHECK (feedback_score >= 1 AND feedback_score <= 5),
  feedback_comment TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. User Feedback Table
CREATE TABLE user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Feedback details
  feedback_type feedback_type NOT NULL,
  title VARCHAR(255),
  content TEXT,
  
  -- Rating data
  rating INTEGER CHECK (rating >= 1 AND rating <= 10),
  nps_score INTEGER CHECK (nps_score >= 0 AND nps_score <= 10),
  csat_score INTEGER CHECK (csat_score >= 1 AND csat_score <= 5),
  
  -- Context information
  page_url TEXT,
  feature_name VARCHAR(255),
  user_segment VARCHAR(100),
  
  -- Survey information
  survey_id UUID,
  survey_response JSONB DEFAULT '{}'::jsonb,
  
  -- Processing status
  processed BOOLEAN DEFAULT FALSE,
  sentiment_score DECIMAL(3,2), -- -1.00 to 1.00
  sentiment_label VARCHAR(20), -- positive, negative, neutral
  
  -- Follow-up tracking
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_completed BOOLEAN DEFAULT FALSE,
  follow_up_notes TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Support Tickets Table
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Ticket details
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  status ticket_status NOT NULL DEFAULT 'open',
  priority ticket_priority NOT NULL DEFAULT 'medium',
  
  -- Assignment and routing
  assigned_to_user_id UUID REFERENCES auth.users(id),
  category VARCHAR(100),
  tags TEXT[], -- Array of tags for categorization
  
  -- Communication tracking
  last_response_at TIMESTAMPTZ,
  last_response_by_user_id UUID REFERENCES auth.users(id),
  response_count INTEGER DEFAULT 0,
  
  -- SLA tracking
  first_response_deadline TIMESTAMPTZ,
  resolution_deadline TIMESTAMPTZ,
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  
  -- Customer satisfaction
  satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  satisfaction_feedback TEXT,
  
  -- Resolution tracking
  resolution_notes TEXT,
  resolution_type VARCHAR(100), -- fixed, workaround, duplicate, etc.
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Knowledge Base Table
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Article details
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  status article_status NOT NULL DEFAULT 'draft',
  
  -- Content organization
  category VARCHAR(100),
  subcategory VARCHAR(100),
  tags TEXT[],
  slug VARCHAR(255) UNIQUE NOT NULL,
  
  -- SEO and discoverability
  meta_title VARCHAR(255),
  meta_description VARCHAR(500),
  keywords TEXT[],
  
  -- Author and versioning
  author_id UUID REFERENCES auth.users(id),
  last_edited_by UUID REFERENCES auth.users(id),
  version INTEGER DEFAULT 1,
  
  -- Analytics
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  search_rank_score DECIMAL(5,2) DEFAULT 0,
  
  -- Publishing
  published_at TIMESTAMPTZ,
  featured BOOLEAN DEFAULT FALSE,
  featured_order INTEGER,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Customer Health Table
CREATE TABLE customer_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Health scoring
  health_score INTEGER NOT NULL CHECK (health_score >= 0 AND health_score <= 100),
  health_status health_status NOT NULL DEFAULT 'healthy',
  previous_score INTEGER,
  score_trend VARCHAR(20), -- improving, declining, stable
  
  -- Score components
  usage_score INTEGER DEFAULT 0 CHECK (usage_score >= 0 AND usage_score <= 100),
  engagement_score INTEGER DEFAULT 0 CHECK (engagement_score >= 0 AND engagement_score <= 100),
  satisfaction_score INTEGER DEFAULT 0 CHECK (satisfaction_score >= 0 AND satisfaction_score <= 100),
  support_score INTEGER DEFAULT 0 CHECK (support_score >= 0 AND support_score <= 100),
  billing_score INTEGER DEFAULT 0 CHECK (billing_score >= 0 AND billing_score <= 100),
  
  -- Risk assessment
  churn_risk_score DECIMAL(5,2) DEFAULT 0.00, -- 0.00 to 1.00
  churn_probability_percentage INTEGER DEFAULT 0,
  days_to_predicted_churn INTEGER,
  
  -- Key metrics
  login_frequency DECIMAL(5,2), -- Logins per week
  feature_adoption_rate DECIMAL(5,2), -- Percentage of features used
  support_ticket_count INTEGER DEFAULT 0,
  nps_score INTEGER,
  
  -- Intervention tracking
  intervention_required BOOLEAN DEFAULT FALSE,
  intervention_type VARCHAR(100),
  intervention_scheduled_at TIMESTAMPTZ,
  intervention_completed_at TIMESTAMPTZ,
  intervention_notes TEXT,
  
  -- Calculation metadata
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  data_sources JSONB DEFAULT '{}'::jsonb,
  calculation_method VARCHAR(100) DEFAULT 'standard',
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Feature Adoption Table
CREATE TABLE feature_adoption (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Feature identification
  feature_name VARCHAR(255) NOT NULL,
  feature_category VARCHAR(100),
  feature_version VARCHAR(50) DEFAULT '1.0',
  
  -- Adoption tracking
  adoption_status adoption_status NOT NULL DEFAULT 'not_adopted',
  first_used_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  total_usage_count INTEGER DEFAULT 0,
  
  -- Usage analytics
  usage_frequency DECIMAL(5,2) DEFAULT 0, -- Uses per week
  session_duration_avg INTEGER DEFAULT 0, -- Average seconds per session
  power_user_threshold_met BOOLEAN DEFAULT FALSE,
  
  -- Adoption funnel
  feature_discovered_at TIMESTAMPTZ,
  first_click_at TIMESTAMPTZ,
  feature_activated_at TIMESTAMPTZ, -- First meaningful use
  feature_retained_at TIMESTAMPTZ, -- Used again within 7 days
  
  -- User behavior
  help_viewed BOOLEAN DEFAULT FALSE,
  tutorial_completed BOOLEAN DEFAULT FALSE,
  support_tickets_created INTEGER DEFAULT 0,
  
  -- Engagement metrics
  depth_of_use_score INTEGER DEFAULT 0 CHECK (depth_of_use_score >= 0 AND depth_of_use_score <= 100),
  feature_satisfaction_rating INTEGER CHECK (feature_satisfaction_rating >= 1 AND feature_satisfaction_rating <= 5),
  
  -- Recommendations
  recommended_next_features TEXT[],
  blockers JSONB DEFAULT '[]'::jsonb,
  feedback_provided TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. In-App Messages Table
CREATE TABLE in_app_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Message content
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  message_type message_type NOT NULL DEFAULT 'notification',
  
  -- Targeting
  target_user_ids UUID[], -- Specific users (if null, targets all)
  target_user_segments TEXT[], -- User segments
  target_conditions JSONB DEFAULT '{}'::jsonb, -- Complex targeting rules
  
  -- Display configuration
  display_type VARCHAR(50) DEFAULT 'banner', -- banner, modal, toast, popup
  display_position VARCHAR(50) DEFAULT 'top',
  display_priority INTEGER DEFAULT 0,
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT TRUE,
  
  -- Delivery tracking
  total_targeted_users INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  viewed_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  dismissed_count INTEGER DEFAULT 0,
  
  -- Call to action
  cta_text VARCHAR(100),
  cta_url TEXT,
  cta_click_count INTEGER DEFAULT 0,
  
  -- A/B testing
  experiment_id UUID,
  variant_name VARCHAR(100),
  
  -- Creator information
  created_by_user_id UUID REFERENCES auth.users(id),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Product Surveys Table
CREATE TABLE product_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Survey configuration
  title VARCHAR(255) NOT NULL,
  description TEXT,
  survey_type survey_type NOT NULL,
  
  -- Questions and structure
  questions JSONB NOT NULL, -- Array of question objects
  logic_rules JSONB DEFAULT '{}'::jsonb, -- Conditional logic
  
  -- Targeting and scheduling
  target_audience JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN DEFAULT FALSE,
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  
  -- Distribution settings
  trigger_conditions JSONB DEFAULT '{}'::jsonb,
  frequency_limit INTEGER DEFAULT 1, -- How many times to show per user
  display_settings JSONB DEFAULT '{}'::jsonb,
  
  -- Response tracking
  total_invitations INTEGER DEFAULT 0,
  total_responses INTEGER DEFAULT 0,
  completion_rate DECIMAL(5,2) DEFAULT 0.00,
  average_completion_time INTEGER DEFAULT 0, -- Seconds
  
  -- Results
  results_summary JSONB DEFAULT '{}'::jsonb,
  nps_score DECIMAL(5,2),
  csat_average DECIMAL(5,2),
  
  -- Creator information
  created_by_user_id UUID REFERENCES auth.users(id),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. User Sessions Table (for behavior tracking)
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Session identification
  session_id VARCHAR(255) NOT NULL,
  device_id VARCHAR(255),
  
  -- Session details
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  -- Device and browser info
  user_agent TEXT,
  device_type VARCHAR(50), -- desktop, mobile, tablet
  browser VARCHAR(100),
  operating_system VARCHAR(100),
  screen_resolution VARCHAR(20),
  
  -- Geographic data
  country VARCHAR(100),
  city VARCHAR(100),
  timezone VARCHAR(100),
  ip_address INET,
  
  -- Engagement metrics
  page_views INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  features_used TEXT[],
  actions_performed JSONB DEFAULT '[]'::jsonb,
  
  -- Session quality indicators
  bounce_session BOOLEAN DEFAULT FALSE,
  engaged_session BOOLEAN DEFAULT FALSE, -- Spent meaningful time
  conversion_session BOOLEAN DEFAULT FALSE,
  
  -- Performance metrics
  page_load_times JSONB DEFAULT '{}'::jsonb,
  error_count INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- INDEXES FOR PERFORMANCE
-- ================================================

-- User Onboarding Indexes
CREATE INDEX idx_user_onboarding_user_id ON user_onboarding(user_id);
CREATE INDEX idx_user_onboarding_organization_id ON user_onboarding(organization_id);
CREATE INDEX idx_user_onboarding_status ON user_onboarding(status);
CREATE INDEX idx_user_onboarding_flow_status ON user_onboarding(flow_name, status);
CREATE INDEX idx_user_onboarding_last_activity ON user_onboarding(last_activity_at DESC);

-- Feature Tours Indexes
CREATE INDEX idx_feature_tours_user_id ON feature_tours(user_id);
CREATE INDEX idx_feature_tours_organization_id ON feature_tours(organization_id);
CREATE INDEX idx_feature_tours_status ON feature_tours(status);
CREATE INDEX idx_feature_tours_tour_name ON feature_tours(tour_name);

-- User Feedback Indexes
CREATE INDEX idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX idx_user_feedback_organization_id ON user_feedback(organization_id);
CREATE INDEX idx_user_feedback_type ON user_feedback(feedback_type);
CREATE INDEX idx_user_feedback_rating ON user_feedback(rating);
CREATE INDEX idx_user_feedback_created_at ON user_feedback(created_at DESC);
CREATE INDEX idx_user_feedback_processed ON user_feedback(processed);

-- Support Tickets Indexes
CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_organization_id ON support_tickets(organization_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX idx_support_tickets_assigned_to ON support_tickets(assigned_to_user_id);
CREATE INDEX idx_support_tickets_category ON support_tickets(category);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at DESC);

-- Knowledge Base Indexes
CREATE INDEX idx_knowledge_base_organization_id ON knowledge_base(organization_id);
CREATE INDEX idx_knowledge_base_status ON knowledge_base(status);
CREATE INDEX idx_knowledge_base_category ON knowledge_base(category);
CREATE INDEX idx_knowledge_base_slug ON knowledge_base(slug);
CREATE INDEX idx_knowledge_base_featured ON knowledge_base(featured, featured_order);
CREATE INDEX idx_knowledge_base_search ON knowledge_base USING gin(to_tsvector('english', title || ' ' || content));

-- Customer Health Indexes
CREATE INDEX idx_customer_health_user_id ON customer_health(user_id);
CREATE INDEX idx_customer_health_organization_id ON customer_health(organization_id);
CREATE INDEX idx_customer_health_score ON customer_health(health_score);
CREATE INDEX idx_customer_health_status ON customer_health(health_status);
CREATE INDEX idx_customer_health_churn_risk ON customer_health(churn_risk_score DESC);
CREATE INDEX idx_customer_health_calculated_at ON customer_health(calculated_at DESC);

-- Feature Adoption Indexes
CREATE INDEX idx_feature_adoption_user_id ON feature_adoption(user_id);
CREATE INDEX idx_feature_adoption_organization_id ON feature_adoption(organization_id);
CREATE INDEX idx_feature_adoption_feature_name ON feature_adoption(feature_name);
CREATE INDEX idx_feature_adoption_status ON feature_adoption(adoption_status);
CREATE INDEX idx_feature_adoption_last_used ON feature_adoption(last_used_at DESC);

-- In-App Messages Indexes
CREATE INDEX idx_in_app_messages_organization_id ON in_app_messages(organization_id);
CREATE INDEX idx_in_app_messages_active ON in_app_messages(active);
CREATE INDEX idx_in_app_messages_scheduled ON in_app_messages(scheduled_at);
CREATE INDEX idx_in_app_messages_type ON in_app_messages(message_type);

-- Product Surveys Indexes
CREATE INDEX idx_product_surveys_organization_id ON product_surveys(organization_id);
CREATE INDEX idx_product_surveys_active ON product_surveys(active);
CREATE INDEX idx_product_surveys_type ON product_surveys(survey_type);
CREATE INDEX idx_product_surveys_created_by ON product_surveys(created_by_user_id);

-- User Sessions Indexes
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_organization_id ON user_sessions(organization_id);
CREATE INDEX idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX idx_user_sessions_started_at ON user_sessions(started_at DESC);
CREATE INDEX idx_user_sessions_device_type ON user_sessions(device_type);

-- ================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================

-- Enable RLS on all tables
ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_adoption ENABLE ROW LEVEL SECURITY;
ALTER TABLE in_app_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- User Onboarding Policies
CREATE POLICY "Users can view their own onboarding data" ON user_onboarding
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding data" ON user_onboarding
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Organization members can view onboarding data" ON user_onboarding
  FOR SELECT USING (
    organization_id IN (
      SELECT id FROM organizations 
      WHERE id = organization_id 
      AND (created_by = auth.uid() OR auth.uid() = ANY(member_ids))
    )
  );

-- Feature Tours Policies
CREATE POLICY "Users can manage their own feature tours" ON feature_tours
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Organization admins can view all tours" ON feature_tours
  FOR SELECT USING (
    organization_id IN (
      SELECT id FROM organizations 
      WHERE created_by = auth.uid()
    )
  );

-- User Feedback Policies
CREATE POLICY "Users can manage their own feedback" ON user_feedback
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Organization members can view feedback" ON user_feedback
  FOR SELECT USING (
    organization_id IN (
      SELECT id FROM organizations 
      WHERE id = organization_id 
      AND (created_by = auth.uid() OR auth.uid() = ANY(member_ids))
    )
  );

-- Support Tickets Policies
CREATE POLICY "Users can manage their own tickets" ON support_tickets
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Assigned agents can manage tickets" ON support_tickets
  FOR ALL USING (auth.uid() = assigned_to_user_id);

CREATE POLICY "Organization members can view tickets" ON support_tickets
  FOR SELECT USING (
    organization_id IN (
      SELECT id FROM organizations 
      WHERE id = organization_id 
      AND (created_by = auth.uid() OR auth.uid() = ANY(member_ids))
    )
  );

-- Knowledge Base Policies (Public read access)
CREATE POLICY "Anyone can read published articles" ON knowledge_base
  FOR SELECT USING (status = 'published');

CREATE POLICY "Organization members can manage articles" ON knowledge_base
  FOR ALL USING (
    organization_id IN (
      SELECT id FROM organizations 
      WHERE created_by = auth.uid()
    )
  );

-- Customer Health Policies
CREATE POLICY "Users can view their own health data" ON customer_health
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Organization admins can view all health data" ON customer_health
  FOR SELECT USING (
    organization_id IN (
      SELECT id FROM organizations 
      WHERE created_by = auth.uid()
    )
  );

-- Feature Adoption Policies
CREATE POLICY "Users can view their own adoption data" ON feature_adoption
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Organization admins can view adoption data" ON feature_adoption
  FOR SELECT USING (
    organization_id IN (
      SELECT id FROM organizations 
      WHERE created_by = auth.uid()
    )
  );

-- In-App Messages Policies
CREATE POLICY "Users can view messages targeted to them" ON in_app_messages
  FOR SELECT USING (
    active = true 
    AND (scheduled_at IS NULL OR scheduled_at <= NOW())
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (
      target_user_ids IS NULL 
      OR auth.uid() = ANY(target_user_ids)
      OR organization_id IN (
        SELECT id FROM organizations 
        WHERE id = organization_id 
        AND (created_by = auth.uid() OR auth.uid() = ANY(member_ids))
      )
    )
  );

CREATE POLICY "Organization admins can manage messages" ON in_app_messages
  FOR ALL USING (
    organization_id IN (
      SELECT id FROM organizations 
      WHERE created_by = auth.uid()
    )
  );

-- Product Surveys Policies
CREATE POLICY "Users can view active surveys" ON product_surveys
  FOR SELECT USING (
    active = true 
    AND (scheduled_start IS NULL OR scheduled_start <= NOW())
    AND (scheduled_end IS NULL OR scheduled_end > NOW())
  );

CREATE POLICY "Organization admins can manage surveys" ON product_surveys
  FOR ALL USING (
    organization_id IN (
      SELECT id FROM organizations 
      WHERE created_by = auth.uid()
    )
  );

-- User Sessions Policies
CREATE POLICY "Users can view their own sessions" ON user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Organization admins can view sessions" ON user_sessions
  FOR SELECT USING (
    organization_id IN (
      SELECT id FROM organizations 
      WHERE created_by = auth.uid()
    )
  );

-- ================================================
-- FUNCTIONS AND TRIGGERS
-- ================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to all tables
CREATE TRIGGER update_user_onboarding_updated_at 
  BEFORE UPDATE ON user_onboarding 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_tours_updated_at 
  BEFORE UPDATE ON feature_tours 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_feedback_updated_at 
  BEFORE UPDATE ON user_feedback 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at 
  BEFORE UPDATE ON support_tickets 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_base_updated_at 
  BEFORE UPDATE ON knowledge_base 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_health_updated_at 
  BEFORE UPDATE ON customer_health 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_adoption_updated_at 
  BEFORE UPDATE ON feature_adoption 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_in_app_messages_updated_at 
  BEFORE UPDATE ON in_app_messages 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_surveys_updated_at 
  BEFORE UPDATE ON product_surveys 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_sessions_updated_at 
  BEFORE UPDATE ON user_sessions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- HELPER VIEWS FOR ANALYTICS
-- ================================================

-- Customer Success Overview View
CREATE VIEW customer_success_overview AS
SELECT 
  u.id as user_id,
  u.email,
  o.name as organization_name,
  
  -- Onboarding status
  uo.status as onboarding_status,
  uo.completion_percentage,
  uo.completed_at as onboarding_completed_at,
  
  -- Health metrics
  ch.health_score,
  ch.health_status,
  ch.churn_risk_score,
  
  -- Recent activity
  GREATEST(uo.last_activity_at, ft.last_step_at, us.started_at) as last_activity_at,
  
  -- Feature adoption count
  (SELECT COUNT(*) FROM feature_adoption fa 
   WHERE fa.user_id = u.id AND fa.adoption_status = 'active') as active_features_count,
   
  -- Support tickets count
  (SELECT COUNT(*) FROM support_tickets st 
   WHERE st.user_id = u.id AND st.status != 'closed') as open_tickets_count,
   
  -- Recent feedback
  (SELECT rating FROM user_feedback uf 
   WHERE uf.user_id = u.id 
   ORDER BY uf.created_at DESC LIMIT 1) as latest_feedback_rating

FROM auth.users u
LEFT JOIN organizations o ON o.created_by = u.id OR u.id = ANY(o.member_ids)
LEFT JOIN user_onboarding uo ON uo.user_id = u.id
LEFT JOIN customer_health ch ON ch.user_id = u.id
LEFT JOIN feature_tours ft ON ft.user_id = u.id
LEFT JOIN user_sessions us ON us.user_id = u.id
WHERE u.id IS NOT NULL;

-- Feature Adoption Summary View
CREATE VIEW feature_adoption_summary AS
SELECT 
  feature_name,
  feature_category,
  COUNT(*) as total_users,
  COUNT(CASE WHEN adoption_status = 'active' THEN 1 END) as active_users,
  COUNT(CASE WHEN adoption_status = 'power_user' THEN 1 END) as power_users,
  ROUND(
    COUNT(CASE WHEN adoption_status IN ('active', 'power_user') THEN 1 END)::DECIMAL / 
    COUNT(*)::DECIMAL * 100, 2
  ) as adoption_rate_percentage,
  AVG(usage_frequency) as avg_usage_frequency,
  AVG(depth_of_use_score) as avg_depth_score
FROM feature_adoption
GROUP BY feature_name, feature_category
ORDER BY adoption_rate_percentage DESC;

-- Support Metrics View
CREATE VIEW support_metrics_summary AS
SELECT 
  DATE_TRUNC('week', created_at) as week,
  COUNT(*) as total_tickets,
  COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_tickets,
  COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority_tickets,
  AVG(
    CASE WHEN resolved_at IS NOT NULL THEN 
      EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600 
    END
  ) as avg_resolution_time_hours,
  AVG(satisfaction_rating) as avg_satisfaction_rating
FROM support_tickets
GROUP BY DATE_TRUNC('week', created_at)
ORDER BY week DESC;

-- ================================================
-- COMMENTS
-- ================================================

COMMENT ON TABLE user_onboarding IS 'Tracks user onboarding progress and completion';
COMMENT ON TABLE feature_tours IS 'Manages interactive product tours and walkthroughs';
COMMENT ON TABLE user_feedback IS 'Stores customer feedback, surveys, and NPS data';
COMMENT ON TABLE support_tickets IS 'Customer support ticket management system';
COMMENT ON TABLE knowledge_base IS 'Help center articles and documentation';
COMMENT ON TABLE customer_health IS 'Customer health scoring and churn prediction';
COMMENT ON TABLE feature_adoption IS 'Feature usage tracking and adoption analytics';
COMMENT ON TABLE in_app_messages IS 'In-app notifications and announcements';
COMMENT ON TABLE product_surveys IS 'Survey campaigns and responses';
COMMENT ON TABLE user_sessions IS 'User session tracking for behavior analysis';
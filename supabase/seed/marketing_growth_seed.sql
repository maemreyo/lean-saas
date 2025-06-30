-- Marketing & Growth Module Sample Data
-- Following patterns from billing module seed data

-- ================================================
-- SAMPLE LANDING PAGES
-- ================================================

-- Sample landing page templates
INSERT INTO public.landing_pages (id, organization_id, slug, title, description, config, seo_meta, published, view_count, conversion_count) VALUES
-- SaaS Landing Page Template
('550e8400-e29b-41d4-a716-446655440001', 
 (SELECT id FROM public.organizations WHERE name = 'Acme Corp' LIMIT 1),
 'saas-homepage',
 'The Ultimate SaaS Solution for Modern Teams',
 'Boost your team productivity with our comprehensive SaaS platform',
 '{
   "hero": {
     "headline": "The Ultimate SaaS Solution for Modern Teams",
     "subheadline": "Boost your team productivity with our comprehensive SaaS platform. Get started in minutes, scale to millions.",
     "cta_text": "Start Free Trial",
     "background_image": "/images/hero-bg.jpg"
   },
   "features": [
     {"title": "Real-time Collaboration", "description": "Work together seamlessly across teams and time zones"},
     {"title": "Advanced Analytics", "description": "Get insights that drive better business decisions"},
     {"title": "Enterprise Security", "description": "Bank-level security with SOC2 compliance"}
   ],
   "pricing": {
     "plans": [
       {"name": "Starter", "price": 29, "features": ["5 Users", "10 Projects", "Basic Support"]},
       {"name": "Pro", "price": 99, "features": ["25 Users", "Unlimited Projects", "Priority Support"]},
       {"name": "Enterprise", "price": 299, "features": ["Unlimited Users", "Advanced Features", "Dedicated Support"]}
     ]
   },
   "testimonials": [
     {"name": "John Doe", "company": "TechCorp", "text": "This platform revolutionized our workflow!", "avatar": "/avatars/john.jpg"},
     {"name": "Jane Smith", "company": "StartupXYZ", "text": "Best investment we ever made for our team.", "avatar": "/avatars/jane.jpg"}
   ]
 }',
 '{
   "title": "The Ultimate SaaS Solution for Modern Teams | Acme Corp",
   "description": "Boost your team productivity with our comprehensive SaaS platform. Start free trial today.",
   "keywords": ["saas", "productivity", "team collaboration", "project management"],
   "og_title": "The Ultimate SaaS Solution for Modern Teams",
   "og_description": "Boost your team productivity with our comprehensive SaaS platform",
   "og_image": "/images/og-saas.jpg"
 }',
 true, 1250, 89),

-- Product Launch Landing Page
('550e8400-e29b-41d4-a716-446655440002',
 (SELECT id FROM public.organizations WHERE name = 'Acme Corp' LIMIT 1),
 'product-launch',
 'Introducing ProjectAI - The Future of Project Management',
 'Revolutionary AI-powered project management tool launching soon',
 '{
   "hero": {
     "headline": "Introducing ProjectAI",
     "subheadline": "The Future of Project Management is Here. AI-powered insights, automated workflows, and predictive analytics.",
     "cta_text": "Join Waitlist",
     "countdown_date": "2025-08-01T00:00:00Z",
     "video_url": "https://player.vimeo.com/video/123456789"
   },
   "features": [
     {"title": "AI-Powered Insights", "description": "Get intelligent recommendations for project optimization"},
     {"title": "Predictive Analytics", "description": "Forecast project outcomes with 95% accuracy"},
     {"title": "Automated Workflows", "description": "Let AI handle routine tasks while you focus on strategy"}
   ],
   "early_bird_offer": {
     "discount": 50,
     "valid_until": "2025-07-15T23:59:59Z",
     "description": "50% off first year for early adopters"
   }
 }',
 '{
   "title": "ProjectAI - AI-Powered Project Management | Launching Soon",
   "description": "Revolutionary AI-powered project management tool. Join the waitlist for 50% early bird discount.",
   "keywords": ["ai", "project management", "artificial intelligence", "productivity"],
   "og_title": "ProjectAI - The Future of Project Management",
   "og_description": "Revolutionary AI-powered project management tool launching soon",
   "og_image": "/images/og-projectai.jpg"
 }',
 true, 890, 124),

-- Lead Magnet Landing Page
('550e8400-e29b-41d4-a716-446655440003',
 (SELECT id FROM public.organizations WHERE name = 'Acme Corp' LIMIT 1),
 'startup-growth-guide',
 'The Complete Startup Growth Playbook',
 'Free comprehensive guide to scaling your startup from 0 to $1M ARR',
 '{
   "hero": {
     "headline": "The Complete Startup Growth Playbook",
     "subheadline": "Learn the exact strategies used by 100+ successful startups to reach $1M ARR. Free 50-page guide with templates and case studies.",
     "cta_text": "Download Free Guide",
     "form_fields": ["email", "company", "role"]
   },
   "benefits": [
     "50+ proven growth strategies",
     "Real case studies from successful startups",
     "Ready-to-use templates and frameworks",
     "Bonus: Growth metrics tracking spreadsheet"
   ],
   "social_proof": {
     "download_count": 2847,
     "companies": ["Stripe", "Notion", "Linear", "Vercel"]
   }
 }',
 '{
   "title": "Free Startup Growth Playbook - 0 to $1M ARR Guide",
   "description": "Complete guide to scaling your startup with proven strategies, templates, and case studies. Download free.",
   "keywords": ["startup growth", "business growth", "scaling", "entrepreneurship"],
   "og_title": "The Complete Startup Growth Playbook",
   "og_description": "Learn the exact strategies to scale your startup from 0 to $1M ARR",
   "og_image": "/images/og-growth-guide.jpg"
 }',
 true, 2340, 387);

-- ================================================
-- SAMPLE A/B TESTS
-- ================================================

-- A/B test for homepage hero section
INSERT INTO public.ab_tests (id, organization_id, name, description, hypothesis, target_metric, variants, traffic_split, status, confidence_level) VALUES
('660e8400-e29b-41d4-a716-446655440001',
 (SELECT id FROM public.organizations WHERE name = 'Acme Corp' LIMIT 1),
 'Homepage Hero CTA Test',
 'Testing different CTA button texts on the homepage hero section',
 'Changing the CTA from "Start Free Trial" to "Get Started Free" will increase conversion rate by 15%',
 'conversion_rate',
 '[
   {"id": "A", "name": "Original", "config": {"cta_text": "Start Free Trial", "cta_color": "blue"}},
   {"id": "B", "name": "Variant", "config": {"cta_text": "Get Started Free", "cta_color": "green"}}
 ]',
 '{"A": 50, "B": 50}',
 'running',
 0.95),

-- A/B test for pricing page
('660e8400-e29b-41d4-a716-446655440002',
 (SELECT id FROM public.organizations WHERE name = 'Acme Corp' LIMIT 1),
 'Pricing Page Layout Test',
 'Testing 3-column vs 2-column pricing layout',
 'Simplifying to 2 columns will reduce choice paralysis and increase conversions',
 'signup_rate',
 '[
   {"id": "A", "name": "3 Columns", "config": {"layout": "3-column", "highlight_plan": "Pro"}},
   {"id": "B", "name": "2 Columns", "config": {"layout": "2-column", "highlight_plan": "Pro"}}
 ]',
 '{"A": 60, "B": 40}',
 'completed',
 0.95);

-- ================================================
-- SAMPLE LEAD CAPTURES
-- ================================================

-- Sample lead captures from different sources
INSERT INTO public.lead_captures (id, organization_id, email, name, source, landing_page_id, utm_source, utm_medium, utm_campaign, metadata) VALUES
-- Leads from homepage
('770e8400-e29b-41d4-a716-446655440001',
 (SELECT id FROM public.organizations WHERE name = 'Acme Corp' LIMIT 1),
 'john.startup@example.com',
 'John Startup',
 'landing_page',
 '550e8400-e29b-41d4-a716-446655440001',
 'google',
 'cpc',
 'saas_launch_2025',
 '{"company": "StartupCorp", "role": "CEO", "team_size": "5-10"}'),

('770e8400-e29b-41d4-a716-446655440002',
 (SELECT id FROM public.organizations WHERE name = 'Acme Corp' LIMIT 1),
 'sarah.product@techcorp.com',
 'Sarah Product',
 'landing_page',
 '550e8400-e29b-41d4-a716-446655440001',
 'linkedin',
 'social',
 'product_hunt_launch',
 '{"company": "TechCorp", "role": "Product Manager", "team_size": "20-50"}'),

-- Leads from growth guide
('770e8400-e29b-41d4-a716-446655440003',
 (SELECT id FROM public.organizations WHERE name = 'Acme Corp' LIMIT 1),
 'mike.growth@scale.io',
 'Mike Growth',
 'landing_page',
 '550e8400-e29b-41d4-a716-446655440003',
 'twitter',
 'social',
 'growth_content_2025',
 '{"company": "Scale.io", "role": "Growth Lead", "interested_in": "scaling_strategies"}'),

-- Organic leads
('770e8400-e29b-41d4-a716-446655440004',
 (SELECT id FROM public.organizations WHERE name = 'Acme Corp' LIMIT 1),
 'anna.founder@newstartup.com',
 'Anna Founder',
 'blog',
 NULL,
 'google',
 'organic',
 NULL,
 '{"company": "NewStartup", "role": "Founder", "referral_source": "blog_post_scaling_guide"}');

-- ================================================
-- SAMPLE EMAIL CAMPAIGNS
-- ================================================

-- Welcome email series
INSERT INTO public.email_campaigns (id, organization_id, name, subject, content, campaign_type, status, recipient_count, delivered_count, opened_count, clicked_count) VALUES
('880e8400-e29b-41d4-a716-446655440001',
 (SELECT id FROM public.organizations WHERE name = 'Acme Corp' LIMIT 1),
 'Welcome Series - Email 1',
 'Welcome to Acme Corp! Let''s get you started 🚀',
 'Hi {{name}},\n\nWelcome to Acme Corp! We''re thrilled to have you on board.\n\nHere''s what you can expect:\n- Quick setup in under 5 minutes\n- Free onboarding call with our team\n- 24/7 support whenever you need help\n\nReady to get started?\n\n[Get Started Now]({{app_url}}/onboarding)\n\nBest regards,\nThe Acme Team',
 'welcome',
 'sent',
 156,
 154,
 89,
 34),

('880e8400-e29b-41d4-a716-446655440002',
 (SELECT id FROM public.organizations WHERE name = 'Acme Corp' LIMIT 1),
 'Product Update Newsletter - January',
 'New Features Alert: AI-Powered Analytics & More! 📊',
 'Hi there!\n\nWe''ve been busy building amazing new features for you:\n\n🤖 AI-Powered Analytics\nGet intelligent insights about your data automatically\n\n📱 Mobile App Update\nNow with offline mode and push notifications\n\n🔗 New Integrations\nConnect with Slack, Notion, and 20+ other tools\n\n[See What''s New]({{app_url}}/changelog)\n\nHappy building!\nThe Product Team',
 'newsletter',
 'sent',
 1247,
 1198,
 523,
 187);

-- ================================================
-- SAMPLE REFERRAL CODES
-- ================================================

-- Referral codes for users
INSERT INTO public.referral_codes (id, organization_id, user_id, code, description, reward_type, reward_value, reward_description, max_uses, current_uses) VALUES
('990e8400-e29b-41d4-a716-446655440001',
 (SELECT id FROM public.organizations WHERE name = 'Acme Corp' LIMIT 1),
 (SELECT id FROM auth.users WHERE email = 'john@example.com' LIMIT 1),
 'JOHN2025',
 'John''s referral code for friends and colleagues',
 'discount',
 20.00,
 '20% off first 3 months',
 NULL,
 3),

('990e8400-e29b-41d4-a716-446655440002',
 (SELECT id FROM public.organizations WHERE name = 'Acme Corp' LIMIT 1),
 (SELECT id FROM auth.users WHERE email = 'jane@example.com' LIMIT 1),
 'JANE2025',
 'Jane''s referral code',
 'credit',
 50.00,
 '$50 account credit',
 10,
 2);

-- ================================================
-- SAMPLE REFERRAL CONVERSIONS
-- ================================================

-- Sample successful referrals
INSERT INTO public.referral_conversions (id, referral_code_id, referrer_user_id, referred_email, conversion_type, conversion_value, commission_amount) VALUES
('aa0e8400-e29b-41d4-a716-446655440001',
 '990e8400-e29b-41d4-a716-446655440001',
 (SELECT id FROM auth.users WHERE email = 'john@example.com' LIMIT 1),
 'friend1@example.com',
 'subscription',
 99.00,
 19.80),

('aa0e8400-e29b-41d4-a716-446655440002',
 '990e8400-e29b-41d4-a716-446655440001',
 (SELECT id FROM auth.users WHERE email = 'john@example.com' LIMIT 1),
 'colleague@company.com',
 'trial',
 0.00,
 0.00);

-- ================================================
-- SAMPLE SOCIAL SHARES
-- ================================================

-- Social sharing data
INSERT INTO public.social_shares (id, organization_id, content_type, content_id, platform, share_url, click_count, conversion_count) VALUES
('bb0e8400-e29b-41d4-a716-446655440001',
 (SELECT id FROM public.organizations WHERE name = 'Acme Corp' LIMIT 1),
 'landing_page',
 '550e8400-e29b-41d4-a716-446655440001',
 'twitter',
 'https://twitter.com/intent/tweet?url=https://acme.com/saas-homepage',
 23,
 4),

('bb0e8400-e29b-41d4-a716-446655440002',
 (SELECT id FROM public.organizations WHERE name = 'Acme Corp' LIMIT 1),
 'landing_page',
 '550e8400-e29b-41d4-a716-446655440003',
 'linkedin',
 'https://linkedin.com/sharing/share-offsite/?url=https://acme.com/startup-growth-guide',
 67,
 12);

-- ================================================
-- SAMPLE SEO METADATA
-- ================================================

-- SEO data for different pages
INSERT INTO public.seo_metadata (id, organization_id, page_type, page_id, title, description, keywords, og_title, og_description, structured_data) VALUES
('cc0e8400-e29b-41d4-a716-446655440001',
 (SELECT id FROM public.organizations WHERE name = 'Acme Corp' LIMIT 1),
 'landing_page',
 '550e8400-e29b-41d4-a716-446655440001',
 'Best SaaS Platform for Teams | Acme Corp - Free Trial',
 'Boost team productivity with Acme Corp''s comprehensive SaaS platform. Advanced analytics, real-time collaboration, enterprise security. Start free trial today.',
 ARRAY['saas platform', 'team productivity', 'project management', 'business software'],
 'Best SaaS Platform for Teams | Acme Corp',
 'Boost team productivity with our comprehensive SaaS platform. Start free trial today.',
 '{
   "@context": "https://schema.org",
   "@type": "SoftwareApplication",
   "name": "Acme Corp SaaS Platform",
   "applicationCategory": "BusinessApplication",
   "operatingSystem": "Web",
   "offers": {
     "@type": "Offer",
     "price": "29",
     "priceCurrency": "USD"
   }
 }'),

('cc0e8400-e29b-41d4-a716-446655440002',
 (SELECT id FROM public.organizations WHERE name = 'Acme Corp' LIMIT 1),
 'blog_post',
 'ultimate-guide-to-saas-growth',
 'Ultimate Guide to SaaS Growth: 0 to $1M ARR in 24 Months',
 'Complete guide to scaling your SaaS startup with proven strategies, growth hacks, and real case studies from successful companies.',
 ARRAY['saas growth', 'startup scaling', 'revenue growth', 'business strategy'],
 'Ultimate Guide to SaaS Growth: 0 to $1M ARR',
 'Learn proven strategies to scale your SaaS startup with real case studies',
 '{
   "@context": "https://schema.org",
   "@type": "Article",
   "headline": "Ultimate Guide to SaaS Growth: 0 to $1M ARR in 24 Months",
   "author": {
     "@type": "Organization",
     "name": "Acme Corp"
   },
   "publisher": {
     "@type": "Organization",
     "name": "Acme Corp"
   }
 }');

-- ================================================
-- SAMPLE GROWTH METRICS
-- ================================================

-- Sample growth metrics for the last 30 days
INSERT INTO public.growth_metrics (id, organization_id, metric_type, metric_value, dimensions, date_recorded) VALUES
-- Page views
('dd0e8400-e29b-41d4-a716-446655440001',
 (SELECT id FROM public.organizations WHERE name = 'Acme Corp' LIMIT 1),
 'page_view',
 125.0,
 '{"page": "homepage", "source": "organic"}',
 CURRENT_DATE - INTERVAL '1 day'),

('dd0e8400-e29b-41d4-a716-446655440002',
 (SELECT id FROM public.organizations WHERE name = 'Acme Corp' LIMIT 1),
 'page_view',
 89.0,
 '{"page": "pricing", "source": "direct"}',
 CURRENT_DATE - INTERVAL '1 day'),

-- Signups
('dd0e8400-e29b-41d4-a716-446655440003',
 (SELECT id FROM public.organizations WHERE name = 'Acme Corp' LIMIT 1),
 'signup',
 12.0,
 '{"source": "landing_page", "campaign": "saas_launch_2025"}',
 CURRENT_DATE - INTERVAL '1 day'),

-- Conversions
('dd0e8400-e29b-41d4-a716-446655440004',
 (SELECT id FROM public.organizations WHERE name = 'Acme Corp' LIMIT 1),
 'conversion',
 3.0,
 '{"plan": "pro", "source": "referral"}',
 CURRENT_DATE - INTERVAL '1 day'),

-- Weekly metrics for trends
('dd0e8400-e29b-41d4-a716-446655440005',
 (SELECT id FROM public.organizations WHERE name = 'Acme Corp' LIMIT 1),
 'page_view',
 1340.0,
 '{"page": "homepage", "period": "week"}',
 CURRENT_DATE - INTERVAL '7 days'),

('dd0e8400-e29b-41d4-a716-446655440006',
 (SELECT id FROM public.organizations WHERE name = 'Acme Corp' LIMIT 1),
 'signup',
 84.0,
 '{"period": "week", "source": "all"}',
 CURRENT_DATE - INTERVAL '7 days');

-- ================================================
-- SAMPLE GROWTH EXPERIMENTS
-- ================================================

-- Sample growth experiments
INSERT INTO public.growth_experiments (id, organization_id, name, description, hypothesis, experiment_type, status, success_criteria, baseline_metrics, results) VALUES
('ee0e8400-e29b-41d4-a716-446655440001',
 (SELECT id FROM public.organizations WHERE name = 'Acme Corp' LIMIT 1),
 'Email Signup Form Optimization',
 'Testing minimal vs detailed signup forms on landing pages',
 'Reducing form fields from 5 to 2 will increase conversion rate by 25%',
 'landing_page',
 'implemented',
 'Increase conversion rate from 3.2% to 4.0%+',
 '{"conversion_rate": 3.2, "bounce_rate": 67.5, "time_on_page": 45}',
 '{"conversion_rate": 4.8, "bounce_rate": 62.1, "time_on_page": 52, "improvement": "50% increase in conversions"}'),

('ee0e8400-e29b-41d4-a716-446655440002',
 (SELECT id FROM public.organizations WHERE name = 'Acme Corp' LIMIT 1),
 'Onboarding Flow Simplification',
 'Reducing onboarding steps from 6 to 3 to improve activation',
 'Simpler onboarding will increase activation rate by 30%',
 'onboarding',
 'running',
 'Increase 7-day activation from 65% to 85%+',
 '{"activation_rate_7d": 65.0, "completion_rate": 78.0, "drop_off_step": 3}',
 '{}');

-- ================================================
-- UPDATE COUNTERS & STATS
-- ================================================

-- Update landing page stats based on our sample data
UPDATE public.landing_pages 
SET view_count = 1250, conversion_count = 89 
WHERE slug = 'saas-homepage';

UPDATE public.landing_pages 
SET view_count = 890, conversion_count = 124 
WHERE slug = 'product-launch';

UPDATE public.landing_pages 
SET view_count = 2340, conversion_count = 387 
WHERE slug = 'startup-growth-guide';

-- ================================================
-- SAMPLE A/B TEST SESSIONS
-- ================================================

-- Sample A/B test sessions (anonymous data)
INSERT INTO public.ab_test_sessions (id, ab_test_id, session_id, variant_id, converted, conversion_event) VALUES
('ff0e8400-e29b-41d4-a716-446655440001',
 '660e8400-e29b-41d4-a716-446655440001',
 'session_001',
 'A',
 true,
 'signup'),

('ff0e8400-e29b-41d4-a716-446655440002',
 '660e8400-e29b-41d4-a716-446655440001',
 'session_002',
 'B',
 false,
 NULL),

('ff0e8400-e29b-41d4-a716-446655440003',
 '660e8400-e29b-41d4-a716-446655440001',
 'session_003',
 'B',
 true,
 'signup'),

('ff0e8400-e29b-41d4-a716-446655440004',
 '660e8400-e29b-41d4-a716-446655440001',
 'session_004',
 'A',
 false,
 NULL);
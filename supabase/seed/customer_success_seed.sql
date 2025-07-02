-- Customer Success Module Sample Data
-- Following patterns from billing and marketing seed data

-- ================================================
-- SAMPLE KNOWLEDGE BASE ARTICLES
-- ================================================

INSERT INTO knowledge_base (
  id,
  organization_id,
  title,
  content,
  excerpt,
  status,
  category,
  subcategory,
  tags,
  slug,
  meta_title,
  meta_description,
  keywords,
  author_id,
  view_count,
  helpful_count,
  featured,
  featured_order,
  published_at,
  created_at
) VALUES 
(
  'kb_001',
  NULL, -- Global articles
  'Getting Started with Your New Account',
  '# Getting Started with Your New Account

Welcome to our platform! This guide will help you get up and running in just a few minutes.

## Step 1: Complete Your Profile
Start by filling out your profile information in the Settings section. This helps us personalize your experience.

## Step 2: Set Up Your First Project
Navigate to the Projects section and click "Create New Project" to get started.

## Step 3: Invite Your Team
Use the Team Management feature to invite colleagues and collaborators.

## Step 4: Explore Key Features
Take some time to explore our main features:
- Dashboard analytics
- Project management tools  
- Team collaboration features
- Billing and usage tracking

## Need Help?
If you have questions, use our in-app chat or browse more help articles.',
  'A comprehensive guide to help new users get started with the platform quickly and efficiently.',
  'published',
  'Getting Started',
  'Account Setup',
  ARRAY['onboarding', 'setup', 'beginner', 'account'],
  'getting-started-new-account',
  'Getting Started Guide - Your New Account Setup',
  'Learn how to set up your new account and start using our platform effectively in just a few minutes.',
  ARRAY['getting started', 'account setup', 'onboarding', 'new user'],
  NULL,
  247,
  189,
  TRUE,
  1,
  NOW() - INTERVAL '7 days',
  NOW() - INTERVAL '7 days'
),
(
  'kb_002',
  NULL,
  'How to Create Your First Project',
  '# How to Create Your First Project

Creating your first project is easy! Follow these steps to get started.

## Prerequisites
- Completed account setup
- Admin or Member role in your organization

## Step-by-Step Instructions

### 1. Navigate to Projects
Click on "Projects" in the main navigation menu.

### 2. Click Create Project
Look for the "Create New Project" button in the top right corner.

### 3. Fill in Project Details
- **Project Name**: Choose a descriptive name
- **Description**: Add a brief description of your project goals
- **Template**: Select a template or start from scratch
- **Privacy**: Choose between public or private

### 4. Configure Settings
- Set up project permissions
- Choose billing settings if applicable
- Configure integrations

### 5. Invite Team Members
Add team members who will work on this project.

## Best Practices
- Use clear, descriptive project names
- Set up proper permissions from the start
- Document your project goals in the description

## Troubleshooting
If you encounter issues, check that you have the necessary permissions or contact support.',
  'Step-by-step guide to creating your first project on the platform.',
  'published',
  'Projects',
  'Project Management',
  ARRAY['projects', 'creation', 'setup', 'tutorial'],
  'create-first-project',
  'How to Create Your First Project - Step by Step Guide',
  'Learn how to create and set up your first project with our easy step-by-step tutorial.',
  ARRAY['project creation', 'setup', 'tutorial', 'guide'],
  NULL,
  156,
  134,
  TRUE,
  2,
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '5 days'
),
(
  'kb_003',
  NULL,
  'Understanding Your Usage and Billing',
  '# Understanding Your Usage and Billing

Learn how to monitor your usage, understand billing, and manage your subscription.

## Usage Tracking

### What We Track
- API calls made to our services
- Storage space used for your files
- Number of active projects
- Team member count
- Email sends and notifications

### Real-Time Monitoring
Access your usage dashboard to see:
- Current usage vs. limits
- Historical usage trends
- Projected monthly costs
- Usage alerts and warnings

## Billing Information

### Subscription Plans
- **Starter**: Perfect for individuals and small teams
- **Professional**: For growing businesses
- **Enterprise**: For large organizations with advanced needs

### Payment Methods
We accept all major credit cards and bank transfers for enterprise customers.

### Billing Cycle
- Subscriptions are billed monthly or annually
- Usage-based charges are calculated at the end of each billing period
- Invoices are sent via email

## Managing Your Subscription

### Upgrading or Downgrading
You can change your plan at any time from the Billing settings.

### Cancellation
Subscriptions can be cancelled anytime with no penalties.

## Need Help?
Contact our billing support team for any questions about your account.',
  'Comprehensive guide to understanding usage tracking, billing, and subscription management.',
  'published',
  'Billing',
  'Usage Tracking',
  ARRAY['billing', 'usage', 'subscription', 'pricing'],
  'understanding-usage-billing',
  'Usage and Billing Guide - Understand Your Subscription',
  'Complete guide to understanding your usage metrics, billing cycle, and subscription management options.',
  ARRAY['billing', 'usage tracking', 'subscription', 'pricing'],
  NULL,
  89,
  76,
  FALSE,
  NULL,
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '3 days'
),
(
  'kb_004',
  NULL,
  'Troubleshooting Common Issues',
  '# Troubleshooting Common Issues

Quick solutions to the most common problems users encounter.

## Login and Access Issues

### Cannot Log In
1. Check your email and password
2. Try resetting your password
3. Clear browser cookies and cache
4. Disable browser extensions
5. Contact support if issues persist

### Account Locked
If your account is locked, wait 15 minutes before trying again, or contact support.

## Project Issues

### Cannot Create Project
- Check that you have proper permissions
- Verify you haven''t reached your project limit
- Ensure your subscription is active

### Project Not Loading
- Refresh the page
- Check your internet connection
- Try accessing from an incognito window

## Performance Issues

### Slow Loading Times
- Check your internet connection
- Clear browser cache
- Try using a different browser
- Contact support if the issue persists

## Feature-Specific Issues

### File Upload Problems
- Check file size limits (max 10MB)
- Ensure file format is supported
- Try uploading one file at a time

### Email Notifications Not Working
- Check your email settings
- Look in spam/junk folders
- Verify email address is correct

## Getting More Help

If these solutions don''t resolve your issue:
1. Check our status page for known issues
2. Search our knowledge base for more specific solutions
3. Contact our support team with details about your problem

## Reporting Bugs
Help us improve by reporting bugs through the feedback widget or support chat.',
  'Quick solutions and troubleshooting steps for common platform issues.',
  'published',
  'Troubleshooting',
  'Common Issues',
  ARRAY['troubleshooting', 'problems', 'solutions', 'help'],
  'troubleshooting-common-issues',
  'Troubleshooting Guide - Common Issues and Solutions',
  'Find quick solutions to common problems including login issues, performance problems, and feature-specific troubleshooting.',
  ARRAY['troubleshooting', 'common issues', 'solutions', 'help'],
  NULL,
  203,
  156,
  FALSE,
  NULL,
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days'
);

-- ================================================
-- SAMPLE ONBOARDING FLOWS
-- ================================================

-- Sample onboarding data (will be populated when users actually sign up)
-- This is just for reference structure

-- ================================================
-- SAMPLE FEATURE TOURS
-- ================================================

-- Sample feature tour configurations (will be managed by admin interface)

-- ================================================
-- SAMPLE PRODUCT SURVEYS
-- ================================================

INSERT INTO product_surveys (
  id,
  organization_id,
  title,
  description,
  survey_type,
  questions,
  target_audience,
  active,
  scheduled_start,
  frequency_limit,
  display_settings,
  created_at
) VALUES 
(
  'survey_nps_001',
  NULL, -- Global survey
  'Net Promoter Score Survey',
  'Help us improve by sharing how likely you are to recommend our platform.',
  'nps',
  '[
    {
      "id": "nps_question",
      "type": "nps",
      "question": "How likely are you to recommend our platform to a friend or colleague?",
      "required": true,
      "scale": {"min": 0, "max": 10, "labels": {"0": "Not at all likely", "10": "Extremely likely"}}
    },
    {
      "id": "nps_reason",
      "type": "text",
      "question": "What is the primary reason for your score?",
      "required": false,
      "condition": {"trigger": "nps_question", "operator": "answered"}
    },
    {
      "id": "improvements",
      "type": "textarea",
      "question": "What could we do to improve your experience?",
      "required": false,
      "maxLength": 500
    }
  ]'::jsonb,
  '{
    "user_segments": ["active_users"],
    "min_days_since_signup": 14,
    "min_login_count": 5
  }'::jsonb,
  FALSE, -- Will be activated by admin
  NOW() + INTERVAL '1 day',
  1, -- Show once per user
  '{
    "display_type": "modal",
    "trigger": "time_on_page",
    "trigger_value": 30,
    "position": "center"
  }'::jsonb,
  NOW()
),
(
  'survey_onboarding_001',
  NULL,
  'Onboarding Experience Feedback',
  'Tell us about your onboarding experience to help us improve for new users.',
  'onboarding_feedback',
  '[
    {
      "id": "onboarding_rating",
      "type": "rating",
      "question": "How would you rate your onboarding experience?",
      "required": true,
      "scale": {"min": 1, "max": 5, "labels": {"1": "Poor", "5": "Excellent"}}
    },
    {
      "id": "onboarding_clarity",
      "type": "rating",
      "question": "How clear were the setup instructions?",
      "required": true,
      "scale": {"min": 1, "max": 5, "labels": {"1": "Very unclear", "5": "Very clear"}}
    },
    {
      "id": "onboarding_time",
      "type": "multiple_choice",
      "question": "How long did it take you to complete onboarding?",
      "required": false,
      "options": ["Less than 5 minutes", "5-10 minutes", "10-20 minutes", "20-30 minutes", "More than 30 minutes"]
    },
    {
      "id": "onboarding_improvements",
      "type": "textarea",
      "question": "What would have made the onboarding process better?",
      "required": false,
      "maxLength": 300
    }
  ]'::jsonb,
  '{
    "user_segments": ["recently_onboarded"],
    "trigger_after_onboarding_completion": true
  }'::jsonb,
  FALSE,
  NOW() + INTERVAL '2 days',
  1,
  '{
    "display_type": "slide_in",
    "trigger": "onboarding_completion",
    "delay_seconds": 300,
    "position": "bottom_right"
  }'::jsonb,
  NOW()
);

-- ================================================
-- SAMPLE IN-APP MESSAGES
-- ================================================

INSERT INTO in_app_messages (
  id,
  organization_id,
  title,
  content,
  message_type,
  target_user_segments,
  display_type,
  display_position,
  scheduled_at,
  expires_at,
  active,
  cta_text,
  cta_url,
  created_at
) VALUES 
(
  'msg_welcome_001',
  NULL,
  'Welcome to the Platform!',
  'Welcome! We''re excited to have you here. Take a moment to explore your dashboard and discover all the powerful features available to you.',
  'notification',
  ARRAY['new_users'],
  'banner',
  'top',
  NOW(),
  NOW() + INTERVAL '30 days',
  TRUE,
  'Take a Tour',
  '/tour/getting-started',
  NOW()
),
(
  'msg_feature_highlight_001',
  NULL,
  'New Feature: Advanced Analytics',
  'Check out our new advanced analytics dashboard with real-time insights, custom reports, and data visualization tools.',
  'feature_highlight',
  ARRAY['active_users', 'power_users'],
  'modal',
  'center',
  NOW() - INTERVAL '1 day',
  NOW() + INTERVAL '14 days',
  TRUE,
  'Explore Analytics',
  '/dashboard/analytics',
  NOW() - INTERVAL '1 day'
),
(
  'msg_tips_001',
  NULL,
  'Pro Tip: Keyboard Shortcuts',
  'Did you know you can use Ctrl+K (or Cmd+K on Mac) to quickly search and navigate? Try it now!',
  'tips',
  ARRAY['active_users'],
  'toast',
  'bottom',
  NOW() - INTERVAL '2 days',
  NOW() + INTERVAL '7 days',
  TRUE,
  'Learn More',
  '/help/keyboard-shortcuts',
  NOW() - INTERVAL '2 days'
);

-- ================================================
-- SAMPLE HEALTH SCORING DATA
-- ================================================

-- Note: Customer health data will be calculated automatically by the system
-- This is just a reference for the data structure

-- ================================================
-- SAMPLE FEATURE ADOPTION DATA
-- ================================================

-- Sample feature definitions for tracking adoption
-- These would typically be configured through an admin interface

-- ================================================
-- COMMENTS AND DOCUMENTATION
-- ================================================

-- Sample onboarding flow structure for reference:
/*
Default Onboarding Flow Steps:
1. Welcome & Account Verification
2. Profile Setup
3. Create First Project
4. Invite Team Members (optional)
5. Complete Tutorial/Tour
6. Explore Key Features
7. Set Up Billing (if required)
8. Onboarding Complete - Celebration!

Sample onboarding step_data structure:
{
  "step_1": {
    "completed_at": "2024-01-15T10:30:00Z",
    "data": {"email_verified": true}
  },
  "step_2": {
    "completed_at": "2024-01-15T10:35:00Z", 
    "data": {"profile_completed": true, "avatar_uploaded": false}
  },
  "step_3": {
    "completed_at": "2024-01-15T10:42:00Z",
    "data": {"project_id": "proj_123", "project_name": "My First Project"}
  }
}
*/

-- Sample feature tour structure:
/*
Feature Tours Available:
- "dashboard_overview" - Introduction to dashboard features
- "project_management" - How to create and manage projects  
- "team_collaboration" - Team features and sharing
- "analytics_deep_dive" - Advanced analytics features
- "billing_and_usage" - Understanding billing and usage tracking

Sample tour step structure:
{
  "steps": [
    {
      "step": 1,
      "target": "#dashboard-nav",
      "title": "Dashboard Navigation",
      "content": "This is your main dashboard where you can see overview of all your projects.",
      "position": "bottom"
    },
    {
      "step": 2, 
      "target": ".projects-section",
      "title": "Your Projects",
      "content": "Here you can see all your projects and create new ones.",
      "position": "right"
    }
  ]
}
*/

-- Sample health scoring weights:
/*
Health Score Calculation Weights:
- Usage Score (30%): Login frequency, session duration, feature usage
- Engagement Score (25%): Feature adoption, deep usage, exploration
- Satisfaction Score (20%): NPS, CSAT, feedback ratings
- Support Score (15%): Ticket count, resolution time, support satisfaction  
- Billing Score (10%): Payment status, usage vs limits, plan appropriateness

Churn Risk Factors:
- Declining login frequency
- Reduced feature usage
- Negative feedback/ratings
- Multiple support tickets
- Payment issues
- Usage significantly below plan limits
*/
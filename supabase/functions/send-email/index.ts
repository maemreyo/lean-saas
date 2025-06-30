// Created send-email edge function with Resend integration

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { Resend } from 'https://esm.sh/resend@4.0.0'

// Email templates
interface EmailTemplate {
  subject: string
  html: string
  text?: string
}

interface WelcomeEmailData {
  name: string
  loginUrl?: string
}

interface PasswordResetEmailData {
  resetUrl: string
  name?: string
}

interface InvitationEmailData {
  organizationName: string
  inviterName: string
  inviteUrl: string
}

interface EmailRequest {
  to: string | string[]
  template: 'welcome' | 'password-reset' | 'invitation' | 'custom'
  data?: WelcomeEmailData | PasswordResetEmailData | InvitationEmailData | any
  subject?: string
  html?: string
  text?: string
  from?: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

// Initialize Resend
const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// Default from address
const DEFAULT_FROM = Deno.env.get('DEFAULT_FROM_EMAIL') || 'noreply@yourdomain.com'

// Email template generators
function generateWelcomeEmail(data: WelcomeEmailData): EmailTemplate {
  const { name, loginUrl = 'https://yourdomain.com/login' } = data
  
  return {
    subject: `Welcome to SaaS App, ${name}!`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to SaaS App</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">SaaS App</h1>
          </div>
          
          <h2 style="color: #1f2937;">Welcome, ${name}!</h2>
          
          <p>We're excited to have you on board. Your account has been successfully created and you can now start using all the features available in your plan.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Get Started</a>
          </div>
          
          <p>If you have any questions, feel free to reach out to our support team. We're here to help!</p>
          
          <p>Best regards,<br>The SaaS App Team</p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #6b7280;">
            If you didn't create this account, you can safely ignore this email.
          </p>
        </body>
      </html>
    `,
    text: `Welcome to SaaS App, ${name}!

We're excited to have you on board. Your account has been successfully created and you can now start using all the features available in your plan.

Get started: ${loginUrl}

If you have any questions, feel free to reach out to our support team.

Best regards,
The SaaS App Team

If you didn't create this account, you can safely ignore this email.`
  }
}

function generatePasswordResetEmail(data: PasswordResetEmailData): EmailTemplate {
  const { resetUrl, name = 'there' } = data
  
  return {
    subject: 'Reset your SaaS App password',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset your password</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">SaaS App</h1>
          </div>
          
          <h2 style="color: #1f2937;">Reset your password</h2>
          
          <p>Hi ${name},</p>
          
          <p>We received a request to reset your password for your SaaS App account.</p>
          
          <p>Click the button below to reset your password. This link will expire in 1 hour.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
          </div>
          
          <p>If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
          
          <p>Best regards,<br>The SaaS App Team</p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #6b7280;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${resetUrl}" style="color: #2563eb;">${resetUrl}</a>
          </p>
        </body>
      </html>
    `,
    text: `Reset your SaaS App password

Hi ${name},

We received a request to reset your password for your SaaS App account.

Click this link to reset your password (expires in 1 hour): ${resetUrl}

If you didn't request this password reset, you can safely ignore this email.

Best regards,
The SaaS App Team`
  }
}

function generateInvitationEmail(data: InvitationEmailData): EmailTemplate {
  const { organizationName, inviterName, inviteUrl } = data
  
  return {
    subject: `You've been invited to join ${organizationName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Team invitation</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">SaaS App</h1>
          </div>
          
          <h2 style="color: #1f2937;">You're invited!</h2>
          
          <p>${inviterName} has invited you to join <strong>${organizationName}</strong> on SaaS App.</p>
          
          <p>Join your team to start collaborating on projects and accessing shared resources.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Invitation</a>
          </div>
          
          <p>This invitation will expire in 7 days. If you don't want to join this team, you can safely ignore this email.</p>
          
          <p>Best regards,<br>The SaaS App Team</p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #6b7280;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${inviteUrl}" style="color: #2563eb;">${inviteUrl}</a>
          </p>
        </body>
      </html>
    `,
    text: `You're invited to join ${organizationName}!

${inviterName} has invited you to join ${organizationName} on SaaS App.

Join your team: ${inviteUrl}

This invitation will expire in 7 days.

Best regards,
The SaaS App Team`
  }
}

// Main function
serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verify the request is from an authenticated user or service
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError && !authHeader.includes('service_role')) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse request body
    const emailRequest: EmailRequest = await req.json()
    
    // Validate required fields
    if (!emailRequest.to) {
      return new Response(
        JSON.stringify({ error: 'Missing recipient email' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    let emailTemplate: EmailTemplate

    // Generate email based on template
    switch (emailRequest.template) {
      case 'welcome':
        emailTemplate = generateWelcomeEmail(emailRequest.data as WelcomeEmailData)
        break
      case 'password-reset':
        emailTemplate = generatePasswordResetEmail(emailRequest.data as PasswordResetEmailData)
        break
      case 'invitation':
        emailTemplate = generateInvitationEmail(emailRequest.data as InvitationEmailData)
        break
      case 'custom':
        if (!emailRequest.subject || !emailRequest.html) {
          return new Response(
            JSON.stringify({ error: 'Custom template requires subject and html' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }
        emailTemplate = {
          subject: emailRequest.subject,
          html: emailRequest.html,
          text: emailRequest.text
        }
        break
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid template type' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
    }

    // Send email using Resend
    const emailData = {
      from: emailRequest.from || DEFAULT_FROM,
      to: Array.isArray(emailRequest.to) ? emailRequest.to : [emailRequest.to],
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      ...(emailTemplate.text && { text: emailTemplate.text })
    }

    const { data, error } = await resend.emails.send(emailData)

    if (error) {
      console.error('Resend error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: error }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Log email sending (optional - for audit trail)
    if (user) {
      try {
        await supabase.from('email_logs').insert({
          user_id: user.id,
          template: emailRequest.template,
          recipient: Array.isArray(emailRequest.to) ? emailRequest.to.join(', ') : emailRequest.to,
          subject: emailTemplate.subject,
          status: 'sent',
          external_id: data?.id,
          created_at: new Date().toISOString()
        })
      } catch (logError) {
        console.warn('Failed to log email:', logError)
        // Don't fail the request if logging fails
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: data?.id,
        message: 'Email sent successfully' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Send email function error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

console.log('Send email function is running!')
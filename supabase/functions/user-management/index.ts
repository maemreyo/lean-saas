// UPDATED: 2025-06-30 - Created user-management edge function for user operations

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

// Types
interface UserProfile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  plan_type: 'free' | 'pro' | 'enterprise'
  onboarded: boolean
}

interface Organization {
  id: string
  name: string
  slug: string
  plan_type: 'free' | 'pro' | 'enterprise'
  owner_id: string
}

interface OrganizationMember {
  organization_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
}

interface CreateOrganizationRequest {
  name: string
  slug: string
}

interface InviteMemberRequest {
  organization_id: string
  email: string
  role: 'admin' | 'member'
}

interface UpdateMemberRoleRequest {
  organization_id: string
  user_id: string
  role: 'admin' | 'member'
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
}

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// Helper function to verify user authentication
async function getAuthenticatedUser(authHeader: string | null) {
  if (!authHeader) {
    throw new Error('No authorization header')
  }

  const { data: { user }, error } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  )

  if (error || !user) {
    throw new Error('Invalid authentication')
  }

  return user
}

// Helper function to check if user is admin of organization
async function isOrganizationAdmin(userId: string, organizationId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .single()

  if (error || !data) {
    return false
  }

  return ['owner', 'admin'].includes(data.role)
}

// Helper function to generate organization slug
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Helper function to ensure slug uniqueness
async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug
  let counter = 1

  while (true) {
    const { data, error } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single()

    if (error && error.code === 'PGRST116') {
      // No rows found, slug is available
      return slug
    }

    if (data) {
      // Slug exists, try with counter
      slug = `${baseSlug}-${counter}`
      counter++
    } else {
      // Other error
      throw new Error('Failed to check slug availability')
    }
  }
}

// Route handlers
async function handleGetProfile(user: any): Promise<Response> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Profile not found' }),
      { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  return new Response(
    JSON.stringify({ profile }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function handleUpdateProfile(user: any, body: any): Promise<Response> {
  const { full_name, avatar_url } = body

  const updates: any = {
    updated_at: new Date().toISOString()
  }

  if (full_name !== undefined) updates.full_name = full_name
  if (avatar_url !== undefined) updates.avatar_url = avatar_url

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to update profile' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  return new Response(
    JSON.stringify({ profile: data }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function handleCompleteOnboarding(user: any): Promise<Response> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ 
      onboarded: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id)
    .select()
    .single()

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to complete onboarding' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  return new Response(
    JSON.stringify({ profile: data }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function handleGetOrganizations(user: any): Promise<Response> {
  const { data: organizations, error } = await supabase
    .from('organizations')
    .select(`
      *,
      organization_members!inner(role)
    `)
    .eq('organization_members.user_id', user.id)

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch organizations' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  return new Response(
    JSON.stringify({ organizations }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function handleCreateOrganization(user: any, body: CreateOrganizationRequest): Promise<Response> {
  const { name } = body
  let { slug } = body

  if (!name) {
    return new Response(
      JSON.stringify({ error: 'Organization name is required' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  // Generate slug if not provided
  if (!slug) {
    slug = generateSlug(name)
  } else {
    slug = generateSlug(slug)
  }

  // Ensure slug is unique
  slug = await ensureUniqueSlug(slug)

  // Create organization
  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name,
      slug,
      owner_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (orgError) {
    return new Response(
      JSON.stringify({ error: 'Failed to create organization' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  // Add user as owner
  const { error: memberError } = await supabase
    .from('organization_members')
    .insert({
      organization_id: organization.id,
      user_id: user.id,
      role: 'owner',
      joined_at: new Date().toISOString()
    })

  if (memberError) {
    // Clean up organization if member insertion fails
    await supabase
      .from('organizations')
      .delete()
      .eq('id', organization.id)

    return new Response(
      JSON.stringify({ error: 'Failed to set organization ownership' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  return new Response(
    JSON.stringify({ organization }),
    { 
      status: 201, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function handleInviteMember(user: any, body: InviteMemberRequest): Promise<Response> {
  const { organization_id, email, role } = body

  if (!organization_id || !email || !role) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  // Check if user is admin of the organization
  const isAdmin = await isOrganizationAdmin(user.id, organization_id)
  if (!isAdmin) {
    return new Response(
      JSON.stringify({ error: 'Insufficient permissions' }),
      { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  // Check if user already exists
  const { data: existingUser, error: userError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()

  if (userError && userError.code !== 'PGRST116') {
    return new Response(
      JSON.stringify({ error: 'Failed to check user existence' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  if (existingUser) {
    // User exists, add to organization directly
    const { data: membership, error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id,
        user_id: existingUser.id,
        role,
        invited_by: user.id,
        joined_at: new Date().toISOString()
      })
      .select()
      .single()

    if (memberError) {
      if (memberError.code === '23505') {
        return new Response(
          JSON.stringify({ error: 'User is already a member of this organization' }),
          { 
            status: 409, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      return new Response(
        JSON.stringify({ error: 'Failed to add member' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({ membership, message: 'User added to organization' }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } else {
    // User doesn't exist, would need to send invitation email
    // This would require integration with the send-email function
    return new Response(
      JSON.stringify({ 
        message: 'Invitation functionality not yet implemented',
        suggestion: 'User should sign up first, then can be added to organization'
      }),
      { 
        status: 501, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}

async function handleUpdateMemberRole(user: any, body: UpdateMemberRoleRequest): Promise<Response> {
  const { organization_id, user_id, role } = body

  if (!organization_id || !user_id || !role) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  // Check if user is admin of the organization
  const isAdmin = await isOrganizationAdmin(user.id, organization_id)
  if (!isAdmin) {
    return new Response(
      JSON.stringify({ error: 'Insufficient permissions' }),
      { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  // Update member role
  const { data, error } = await supabase
    .from('organization_members')
    .update({ role })
    .eq('organization_id', organization_id)
    .eq('user_id', user_id)
    .select()
    .single()

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to update member role' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  return new Response(
    JSON.stringify({ membership: data }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function handleRemoveMember(user: any, organizationId: string, userId: string): Promise<Response> {
  if (!organizationId || !userId) {
    return new Response(
      JSON.stringify({ error: 'Missing required parameters' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  // Check if user is admin of the organization or removing themselves
  const isAdmin = await isOrganizationAdmin(user.id, organizationId)
  const isSelf = user.id === userId

  if (!isAdmin && !isSelf) {
    return new Response(
      JSON.stringify({ error: 'Insufficient permissions' }),
      { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  // Check if trying to remove the owner
  const { data: member, error: memberError } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .single()

  if (memberError) {
    return new Response(
      JSON.stringify({ error: 'Member not found' }),
      { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  if (member.role === 'owner') {
    return new Response(
      JSON.stringify({ error: 'Cannot remove organization owner' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  // Remove member
  const { error } = await supabase
    .from('organization_members')
    .delete()
    .eq('organization_id', organizationId)
    .eq('user_id', userId)

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to remove member' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  return new Response(
    JSON.stringify({ message: 'Member removed successfully' }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

// Main function
serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get authenticated user
    const authHeader = req.headers.get('Authorization')
    const user = await getAuthenticatedUser(authHeader)

    const url = new URL(req.url)
    const path = url.pathname.replace('/functions/v1/user-management', '')

    // Route the request
    switch (req.method) {
      case 'GET':
        if (path === '/profile') {
          return await handleGetProfile(user)
        } else if (path === '/organizations') {
          return await handleGetOrganizations(user)
        }
        break

      case 'POST':
        const body = await req.json()
        
        if (path === '/profile/complete-onboarding') {
          return await handleCompleteOnboarding(user)
        } else if (path === '/organizations') {
          return await handleCreateOrganization(user, body)
        } else if (path === '/organizations/invite') {
          return await handleInviteMember(user, body)
        }
        break

      case 'PUT':
        const putBody = await req.json()
        
        if (path === '/profile') {
          return await handleUpdateProfile(user, putBody)
        } else if (path === '/organizations/members/role') {
          return await handleUpdateMemberRole(user, putBody)
        }
        break

      case 'DELETE':
        const pathParts = path.split('/')
        if (pathParts[1] === 'organizations' && pathParts[3] === 'members') {
          const organizationId = pathParts[2]
          const userId = pathParts[4]
          return await handleRemoveMember(user, organizationId, userId)
        }
        break
    }

    return new Response(
      JSON.stringify({ error: 'Route not found' }),
      { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('User management function error:', error)
    
    if (error instanceof Error && error.message.includes('authentication')) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

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

console.log('User management function is running!')
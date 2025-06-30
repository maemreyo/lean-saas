-- Row Level Security policies for profiles table

-- Allow users to view their own profile
CREATE POLICY "users_can_view_own_profile" ON public.profiles
    FOR SELECT 
    TO authenticated
    USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "users_can_update_own_profile" ON public.profiles
    FOR UPDATE 
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Allow users to insert their own profile (for registration)
CREATE POLICY "users_can_insert_own_profile" ON public.profiles
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- Allow users to view profiles of organization members
CREATE POLICY "users_can_view_org_member_profiles" ON public.profiles
    FOR SELECT 
    TO authenticated
    USING (
        id IN (
            SELECT user_id 
            FROM public.organization_members 
            WHERE organization_id IN (
                SELECT organization_id 
                FROM public.organization_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Allow organization admins to view all member profiles
CREATE POLICY "org_admins_can_view_member_profiles" ON public.profiles
    FOR SELECT 
    TO authenticated
    USING (
        id IN (
            SELECT om.user_id 
            FROM public.organization_members om
            JOIN public.organization_members admin_om ON admin_om.organization_id = om.organization_id
            WHERE admin_om.user_id = auth.uid() 
            AND admin_om.role IN ('owner', 'admin')
        )
    );
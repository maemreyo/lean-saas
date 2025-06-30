-- Row Level Security policies for organization_members table

-- Allow users to view members of organizations they belong to
CREATE POLICY "users_can_view_org_members" ON public.organization_members
    FOR SELECT 
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Allow users to view their own memberships
CREATE POLICY "users_can_view_own_memberships" ON public.organization_members
    FOR SELECT 
    TO authenticated
    USING (user_id = auth.uid());

-- Allow organization owners and admins to invite new members
CREATE POLICY "admins_can_invite_members" ON public.organization_members
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- Allow organization owners and admins to update member roles (except their own if they're not owner)
CREATE POLICY "admins_can_update_member_roles" ON public.organization_members
    FOR UPDATE 
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
        AND (
            user_id != auth.uid() 
            OR EXISTS (
                SELECT 1 
                FROM public.organization_members 
                WHERE user_id = auth.uid() 
                AND organization_id = organization_members.organization_id 
                AND role = 'owner'
            )
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- Allow organization owners and admins to remove members (except the owner)
CREATE POLICY "admins_can_remove_members" ON public.organization_members
    FOR DELETE 
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
        AND role != 'owner'
    );

-- Allow users to leave organizations (remove their own membership, except if they're the owner)
CREATE POLICY "users_can_leave_organizations" ON public.organization_members
    FOR DELETE 
    TO authenticated
    USING (
        user_id = auth.uid() 
        AND role != 'owner'
    );
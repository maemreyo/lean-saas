-- Row Level Security policies for subscriptions table

-- Allow users to view their own individual subscriptions
CREATE POLICY "users_can_view_own_subscriptions" ON public.subscriptions
    FOR SELECT 
    TO authenticated
    USING (user_id = auth.uid());

-- Allow organization owners and admins to view organization subscriptions
CREATE POLICY "org_admins_can_view_org_subscriptions" ON public.subscriptions
    FOR SELECT 
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- Allow service role to manage all subscriptions (for Stripe webhooks)
CREATE POLICY "service_role_can_manage_subscriptions" ON public.subscriptions
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to create subscriptions for themselves
CREATE POLICY "users_can_create_own_subscriptions" ON public.subscriptions
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        user_id = auth.uid() 
        OR organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- Allow organization owners to update organization subscriptions
CREATE POLICY "org_owners_can_update_subscriptions" ON public.subscriptions
    FOR UPDATE 
    TO authenticated
    USING (
        user_id = auth.uid() 
        OR organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid() 
            AND role = 'owner'
        )
    )
    WITH CHECK (
        user_id = auth.uid() 
        OR organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid() 
            AND role = 'owner'
        )
    );

-- Allow users and org owners to cancel their subscriptions
CREATE POLICY "users_can_cancel_subscriptions" ON public.subscriptions
    FOR DELETE 
    TO authenticated
    USING (
        user_id = auth.uid() 
        OR organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid() 
            AND role = 'owner'
        )
    );
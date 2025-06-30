-- Row Level Security policies for organizations table

-- Allow users to view organizations they are members of
CREATE POLICY "users_can_view_member_organizations" ON public.organizations
    FOR SELECT 
    TO authenticated
    USING (
        id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Allow users to create new organizations (they become the owner)
CREATE POLICY "users_can_create_organizations" ON public.organizations
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = owner_id);

-- Allow organization owners to update their organizations
CREATE POLICY "owners_can_update_organizations" ON public.organizations
    FOR UPDATE 
    TO authenticated
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

-- Allow organization owners to delete their organizations
CREATE POLICY "owners_can_delete_organizations" ON public.organizations
    FOR DELETE 
    TO authenticated
    USING (auth.uid() = owner_id);

-- Allow organization admins to update organizations (but not change ownership)
CREATE POLICY "admins_can_update_organizations" ON public.organizations
    FOR UPDATE 
    TO authenticated
    USING (
        id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    )
    WITH CHECK (
        id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
        AND owner_id = (SELECT owner_id FROM public.organizations WHERE id = organizations.id)
    );
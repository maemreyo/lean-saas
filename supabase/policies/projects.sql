-- Row Level Security policies for projects table

-- Allow users to view projects from organizations they are members of
CREATE POLICY "org_members_can_view_projects" ON public.projects
    FOR SELECT 
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
        AND status != 'deleted'
    );

-- Allow organization members to create projects
CREATE POLICY "org_members_can_create_projects" ON public.projects
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
        AND created_by = auth.uid()
    );

-- Allow project creators and organization admins to update projects
CREATE POLICY "creators_and_admins_can_update_projects" ON public.projects
    FOR UPDATE 
    TO authenticated
    USING (
        (created_by = auth.uid() AND status != 'deleted')
        OR organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    )
    WITH CHECK (
        (created_by = auth.uid() AND status != 'deleted')
        OR organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- Allow organization owners and admins to soft delete projects (set status to 'deleted')
CREATE POLICY "admins_can_delete_projects" ON public.projects
    FOR UPDATE 
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    )
    WITH CHECK (status = 'deleted');

-- Allow organization owners to permanently delete projects
CREATE POLICY "owners_can_permanently_delete_projects" ON public.projects
    FOR DELETE 
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid() 
            AND role = 'owner'
        )
    );

-- Allow project creators to archive their own projects
CREATE POLICY "creators_can_archive_projects" ON public.projects
    FOR UPDATE 
    TO authenticated
    USING (created_by = auth.uid())
    WITH CHECK (status = 'archived');
-- Add permissive SELECT policy for authenticated users to read jobs
-- This allows the admin dashboard to display job information
CREATE POLICY "jobs_authenticated_read" 
ON public.jobs 
FOR SELECT 
TO authenticated
USING (true);

-- Add permissive INSERT/UPDATE policy for admins to manage jobs
CREATE POLICY "jobs_admin_write" 
ON public.jobs 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = (
      SELECT id FROM users WHERE auth_id = auth.uid()
    ) 
    AND user_roles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = (
      SELECT id FROM users WHERE auth_id = auth.uid()
    ) 
    AND user_roles.role = 'admin'
  )
);
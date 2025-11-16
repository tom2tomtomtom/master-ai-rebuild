-- Enable RLS on lesson_stages table
ALTER TABLE lesson_stages ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read published stages
CREATE POLICY "Users can view published lesson stages"
ON lesson_stages
FOR SELECT
TO authenticated
USING (is_published = true);

-- Policy: Allow service role to do everything (for migrations)
CREATE POLICY "Service role has full access to lesson stages"
ON lesson_stages
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Grant necessary permissions
GRANT SELECT ON lesson_stages TO authenticated;
GRANT ALL ON lesson_stages TO service_role;

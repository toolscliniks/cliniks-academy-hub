-- Add certificate_name column to profiles table
ALTER TABLE profiles ADD COLUMN certificate_name TEXT;

-- Add comment to the column
COMMENT ON COLUMN profiles.certificate_name IS 'Custom name to be used in certificates';
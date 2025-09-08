-- Create table for secure API key storage
CREATE TABLE IF NOT EXISTS secure_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name TEXT UNIQUE NOT NULL,
  encrypted_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE secure_api_keys ENABLE ROW LEVEL SECURITY;

-- Create policy to restrict access (only service role can access)
CREATE POLICY "Service role only" ON secure_api_keys
  FOR ALL USING (auth.role() = 'service_role');

-- Create function to get secure API key
CREATE OR REPLACE FUNCTION get_secure_api_key(p_key_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  api_key TEXT;
BEGIN
  -- Only allow service role to call this function
  IF auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  SELECT encrypted_key INTO api_key
  FROM secure_api_keys
  WHERE key_name = p_key_name;
  
  IF api_key IS NULL THEN
    RAISE EXCEPTION 'API key not found: %', p_key_name;
  END IF;
  
  RETURN api_key;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION get_secure_api_key(TEXT) TO service_role;

-- Insert Asaas API key (placeholder - needs to be updated with real key)
INSERT INTO secure_api_keys (key_name, encrypted_key)
VALUES ('asaas_api_key', '$aact_YTU5YTE0M2M2N2I4MTliNzk0YTI5N2U5MzMwNDI4MTQ6OjAwMDAwMDAwMDAwMDAwNzI2Mjk6OiRhYWNwXzJkNzQwZWJlLTNmNzMtNGJiNi1hNzI4LTNkNzI2YzI5YzI4Nw==')
ON CONFLICT (key_name) DO UPDATE SET
  encrypted_key = EXCLUDED.encrypted_key,
  updated_at = NOW();

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_secure_api_keys_updated_at
  BEFORE UPDATE ON secure_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
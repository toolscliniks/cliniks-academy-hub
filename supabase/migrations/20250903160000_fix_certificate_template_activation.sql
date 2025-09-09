-- Fix certificate template activation logic
-- Ensure only one template can be active at a time

-- Create function to handle template activation
CREATE OR REPLACE FUNCTION public.activate_certificate_template(template_id UUID)
RETURNS void AS $$
BEGIN
  -- Deactivate all templates first
  UPDATE public.certificate_templates 
  SET is_active = false;
  
  -- Activate the specified template
  UPDATE public.certificate_templates 
  SET is_active = true 
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function to ensure only one active template
CREATE OR REPLACE FUNCTION public.ensure_single_active_template()
RETURNS TRIGGER AS $$
BEGIN
  -- If the new/updated template is being set to active
  IF NEW.is_active = true THEN
    -- Deactivate all other templates
    UPDATE public.certificate_templates 
    SET is_active = false 
    WHERE id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce single active template
DROP TRIGGER IF EXISTS ensure_single_active_template_trigger ON public.certificate_templates;
CREATE TRIGGER ensure_single_active_template_trigger
  BEFORE INSERT OR UPDATE ON public.certificate_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_active_template();

-- Ensure we have at least one active template
-- If no template is active, activate the most recent one
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.certificate_templates WHERE is_active = true) THEN
    UPDATE public.certificate_templates 
    SET is_active = true 
    WHERE id = (
      SELECT id FROM public.certificate_templates 
      ORDER BY created_at DESC 
      LIMIT 1
    );
  END IF;
END $$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.activate_certificate_template(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_single_active_template() TO authenticated;
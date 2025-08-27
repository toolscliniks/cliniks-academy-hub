-- Create subscription management table for tracking plan changes
CREATE TABLE public.subscription_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subscription_id UUID,
  old_plan_id UUID,
  new_plan_id UUID,
  change_type TEXT NOT NULL, -- 'upgrade', 'downgrade', 'cancel', 'renew'
  effective_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB
);

-- Enable RLS
ALTER TABLE public.subscription_changes ENABLE ROW LEVEL SECURITY;

-- Policies for subscription changes
CREATE POLICY "Users can view their own subscription changes" ON public.subscription_changes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all subscription changes" ON public.subscription_changes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Update invoices table to support subscription management
ALTER TABLE public.invoices 
  ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'subscription',
  ADD COLUMN IF NOT EXISTS change_reason TEXT;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subscription_changes_user_id ON public.subscription_changes(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_changes_created_at ON public.subscription_changes(created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_user_status ON public.invoices(user_id, status);
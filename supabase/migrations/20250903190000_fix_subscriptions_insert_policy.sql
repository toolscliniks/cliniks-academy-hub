-- Fix subscriptions table RLS policy to allow users to create their own subscriptions
-- The error "new row violates row-level security policy for table subscriptions" occurs
-- because there's no INSERT policy for regular users

-- Add INSERT policy for subscriptions - users can create their own subscriptions
CREATE POLICY "Users can create their own subscriptions" ON public.subscriptions
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add UPDATE policy for subscriptions - users can update their own subscriptions
CREATE POLICY "Users can update their own subscriptions" ON public.subscriptions
FOR UPDATE USING (auth.uid() = user_id);

COMMENT ON POLICY "Users can create their own subscriptions" ON public.subscriptions IS 'Allows users to create subscriptions for themselves';
COMMENT ON POLICY "Users can update their own subscriptions" ON public.subscriptions IS 'Allows users to update their own subscription details';
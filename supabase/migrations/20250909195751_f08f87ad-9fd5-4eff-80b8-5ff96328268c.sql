-- Tabela para rastrear todos os eventos de pagamento
CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  user_id UUID REFERENCES auth.users(id),
  item JSONB NOT NULL,
  n8n_response JSONB,
  error_details JSONB,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para rastrear eventos de cadastro via webhook
CREATE TABLE IF NOT EXISTS signup_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  user_id UUID REFERENCES auth.users(id),
  user_data JSONB NOT NULL,
  n8n_response JSONB,
  error_details JSONB,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS nas tabelas
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE signup_webhook_events ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança para payment_events
CREATE POLICY "Users can insert their own payment events" 
ON payment_events 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select their own payment events" 
ON payment_events 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access to payment events" 
ON payment_events 
FOR ALL 
USING (auth.role() = 'service_role');

-- Políticas de segurança para signup_webhook_events
CREATE POLICY "Users can insert their own signup events" 
ON signup_webhook_events 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select their own signup events" 
ON signup_webhook_events 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access to signup events" 
ON signup_webhook_events 
FOR ALL 
USING (auth.role() = 'service_role');

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_payment_events_updated_at 
BEFORE UPDATE ON payment_events 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_signup_webhook_events_updated_at 
BEFORE UPDATE ON signup_webhook_events 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_payment_events_request_id ON payment_events(request_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_user_id ON payment_events(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_status ON payment_events(status);
CREATE INDEX IF NOT EXISTS idx_payment_events_created_at ON payment_events(created_at);

CREATE INDEX IF NOT EXISTS idx_signup_webhook_events_request_id ON signup_webhook_events(request_id);
CREATE INDEX IF NOT EXISTS idx_signup_webhook_events_user_id ON signup_webhook_events(user_id);
CREATE INDEX IF NOT EXISTS idx_signup_webhook_events_status ON signup_webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_signup_webhook_events_created_at ON signup_webhook_events(created_at);
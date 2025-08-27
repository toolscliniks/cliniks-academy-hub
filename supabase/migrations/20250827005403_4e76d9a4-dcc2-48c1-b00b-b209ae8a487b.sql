-- Add price column to courses table
ALTER TABLE courses ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) DEFAULT NULL;

-- Add currency column to courses table  
ALTER TABLE courses ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'BRL';
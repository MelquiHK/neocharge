-- Tipo de batería del cargador: Mel lo pone por producto en el admin.
-- Valores: 'litio' | 'gel' | 'lifepo4' | NULL (sin especificar).
ALTER TABLE products ADD COLUMN IF NOT EXISTS battery_type text;

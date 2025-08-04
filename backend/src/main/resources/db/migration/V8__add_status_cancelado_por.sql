DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='agendamentos' AND column_name='status'
    ) THEN
        ALTER TABLE agendamentos ADD COLUMN status VARCHAR(20) DEFAULT 'AGENDADO';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='agendamentos' AND column_name='cancelado_por'
    ) THEN
        ALTER TABLE agendamentos ADD COLUMN cancelado_por VARCHAR(20);
    END IF;
END $$;

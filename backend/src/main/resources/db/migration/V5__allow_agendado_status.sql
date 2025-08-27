ALTER TABLE horarios
  DROP CONSTRAINT IF EXISTS ck_horarios_status,
  ADD CONSTRAINT ck_horarios_status
    CHECK (status IN ('DISPONIVEL','INDISPONIVEL','AGENDADO'));

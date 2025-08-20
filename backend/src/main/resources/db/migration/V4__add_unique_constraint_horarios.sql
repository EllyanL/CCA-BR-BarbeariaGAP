-- Adds unique constraint to ensure no duplicate schedule per day, time and category
ALTER TABLE IF EXISTS horarios
    DROP CONSTRAINT IF EXISTS uc_horarios_dia_hora_categoria;

ALTER TABLE IF EXISTS horarios
    ADD CONSTRAINT uc_horarios_dia_hora_categoria UNIQUE (dia, horario, categoria);


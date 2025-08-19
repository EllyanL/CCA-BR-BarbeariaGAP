-- Recreates horarios table and seeds default time slots
DROP TABLE IF EXISTS horarios CASCADE;

CREATE TABLE horarios (
    id         SERIAL PRIMARY KEY,
    dia        VARCHAR(10) NOT NULL,
    horario    TIME WITHOUT TIME ZONE NOT NULL,
    categoria  VARCHAR(15) NOT NULL,
    status     VARCHAR(20) NOT NULL DEFAULT 'DISPONIVEL',
    CONSTRAINT ck_horarios_dia
        CHECK (dia IN ('segunda','terca','quarta','quinta','sexta','sabado','domingo')),
    CONSTRAINT ck_horarios_status
        CHECK (status IN ('DISPONIVEL','INDISPONIVEL')),
    CONSTRAINT uc_horarios_dia_hora_categoria
        UNIQUE (dia, horario, categoria)
);

CREATE INDEX idx_horarios_categoria_dia ON horarios (categoria, dia, horario);
CREATE INDEX idx_horarios_status        ON horarios (status);

-- Seed default schedule slots
DO $$
DECLARE
  h TIME;
  d TEXT;
  c TEXT;
BEGIN
  FOR h IN SELECT unnest(ARRAY[
    '08:00'::time,'08:30'::time,'09:00'::time,'09:30'::time,'10:00'::time,'10:30'::time,
    '11:00'::time,'11:30'::time,'12:00'::time,'12:30'::time,'13:00'::time,'13:30'::time,
    '14:00'::time,'14:30'::time,'15:00'::time,'15:30'::time,'16:00'::time,'16:30'::time,
    '17:00'::time
  ]) LOOP
    FOR d IN SELECT unnest(ARRAY['segunda','terca','quarta','quinta','sexta']) LOOP
      FOR c IN SELECT unnest(ARRAY['GRADUADO','OFICIAL']) LOOP
        INSERT INTO horarios (dia, horario, categoria, status)
        VALUES (d, h, c, 'DISPONIVEL');
      END LOOP;
    END LOOP;
  END LOOP;
END $$;


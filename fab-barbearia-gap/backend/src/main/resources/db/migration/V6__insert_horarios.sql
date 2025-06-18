DO $$
DECLARE
  h TEXT;
  d TEXT;
  c TEXT;
BEGIN
  FOR h IN SELECT unnest(ARRAY[
    '08:00','08:30','09:00',
    '09:30','10:00','10:30',
    '11:00','11:30','12:00',
    '12:30','13:00','13:30',
    '14:00','14:30','15:00',
    '15:30','16:00','17:00'
  ]) LOOP
    FOR d IN SELECT unnest(ARRAY['segunda','terça','quarta','quinta','sexta']) LOOP
      FOR c IN SELECT unnest(ARRAY['GRADUADO','OFICIAL']) LOOP
        INSERT INTO horarios (dia, horario, categoria, status)
        VALUES (d, h, c, 'DISPONIVEL')
        ON CONFLICT DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

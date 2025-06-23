
-- Senha -> secrethash123@!@
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM militares WHERE email = 'barbeiroadm@fab.mil.br') THEN
        INSERT INTO militares
        VALUES
        (nextval('militares_id_seq'), '0000000', 'Militar Barbeiro Administrador', 'S2', 'BARBEIRO ADM', 'barbeiroadm@fab.mil.br',
         'GAP-BR', '', '', '', '00000000000',
         '$2a$16$ftFPaUx7wJUKRTlR0OVMNek.HmF1MAgrXL52Qh6j8nGqGJt/l8h8W', 'ADMIN');
    END IF;
END $$;
ALTER TABLE agendamentos
    DROP CONSTRAINT IF EXISTS ck_agendamento_status;

ALTER TABLE agendamentos
    ADD CONSTRAINT ck_agendamento_status
    CHECK (status IN ('AGENDADO','REALIZADO','REAGENDADO','CANCELADO','ADMIN_CANCELADO'));

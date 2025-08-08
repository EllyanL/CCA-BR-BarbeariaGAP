-- Atualiza regra de unicidade para considerar apenas agendamentos ativos
ALTER TABLE agendamentos DROP CONSTRAINT IF EXISTS unique_agendamento;

CREATE UNIQUE INDEX IF NOT EXISTS unique_agendamento_idx
    ON agendamentos (data, hora, dia_semana, categoria)
    WHERE status <> 'CANCELADO';

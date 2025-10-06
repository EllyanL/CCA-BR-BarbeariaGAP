-- Adiciona a coluna de controle do último agendamento diretamente na tabela de militares
ALTER TABLE militares
    ADD COLUMN IF NOT EXISTS u_agendamento DATE;

-- Popula a coluna com a última data de agendamento ativo (agendado ou realizado) já registrada
UPDATE militares m
SET u_agendamento = ultimos.ultima_data
FROM (
    SELECT a.militar_id, MAX(a.data) AS ultima_data
    FROM agendamentos a
    WHERE a.status IN ('AGENDADO', 'REALIZADO')
    GROUP BY a.militar_id
) AS ultimos
WHERE m.id = ultimos.militar_id;

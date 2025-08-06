CREATE TABLE configuracoes_agendamento (
    id SERIAL PRIMARY KEY,
    horario_inicio TIME NOT NULL,
    horario_fim TIME NOT NULL,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO configuracoes_agendamento (id, horario_inicio, horario_fim)
VALUES (1, '08:00', '18:00');

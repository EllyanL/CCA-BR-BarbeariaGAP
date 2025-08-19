-- Renames configuracao_horario table and its columns to new naming convention
ALTER TABLE configuracao_horario RENAME TO configuracoes_agendamento;
ALTER TABLE configuracoes_agendamento RENAME COLUMN inicio TO horario_inicio;
ALTER TABLE configuracoes_agendamento RENAME COLUMN fim TO horario_fim;

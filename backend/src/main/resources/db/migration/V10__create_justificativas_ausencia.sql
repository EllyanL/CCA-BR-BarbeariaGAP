CREATE TABLE IF NOT EXISTS justificativas_ausencia (
    id SERIAL PRIMARY KEY,
    agendamento_id INTEGER NOT NULL,
    militar_id INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'AGUARDANDO',
    justificativa VARCHAR(250) NOT NULL,
    data_solicitacao TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_resposta TIMESTAMP WITHOUT TIME ZONE,
    avaliado_por_posto_grad VARCHAR(20),
    avaliado_por_nome_guerra VARCHAR(40),
    CONSTRAINT fk_justificativa_agendamento FOREIGN KEY (agendamento_id)
        REFERENCES agendamentos (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_justificativa_militar FOREIGN KEY (militar_id)
        REFERENCES militares (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT ck_justificativa_status CHECK (status IN ('AGUARDANDO', 'APROVADO', 'RECUSADO')),
    CONSTRAINT uk_justificativa_agendamento UNIQUE (agendamento_id)
);

CREATE INDEX IF NOT EXISTS idx_justificativa_agendamento ON justificativas_ausencia (agendamento_id);
CREATE INDEX IF NOT EXISTS idx_justificativa_militar ON justificativas_ausencia (militar_id);
CREATE INDEX IF NOT EXISTS idx_justificativa_status ON justificativas_ausencia (status);

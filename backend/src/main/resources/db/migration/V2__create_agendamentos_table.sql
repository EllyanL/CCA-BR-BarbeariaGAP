CREATE TABLE agendamentos (
    id SERIAL PRIMARY KEY,
    
    data DATE NOT NULL,
    hora TIME WITHOUT TIME ZONE NOT NULL,
    dia_semana VARCHAR(15) NOT NULL,
    
    militar_id BIGINT,
    categoria VARCHAR(15),

    -- Status: PENDENTE, EFETUADO, CANCELADO, ADMIN_CANCELADO
    status VARCHAR(20) DEFAULT 'PENDENTE' NOT NULL,

    -- Quem cancelou: USER ou ADMIN (null se não foi cancelado)
    cancelado_por VARCHAR(10),

    -- Relacionamento com tabela de militares
    CONSTRAINT fk_militar_id FOREIGN KEY (militar_id) REFERENCES militares(id),

    -- Impede que duas pessoas da mesma categoria agendem no mesmo horário
    CONSTRAINT unique_agendamento UNIQUE (data, hora, dia_semana, categoria)
);

CREATE TABLE agendamentos (
    id SERIAL PRIMARY KEY,
    data DATE NOT NULL,
    hora TIME NOT NULL,
    dia_semana VARCHAR(15) NOT NULL,
    militar_id BIGINT,
    categoria VARCHAR(15),
    CONSTRAINT fk_militar_id FOREIGN KEY (militar_id) REFERENCES militares(id),
    CONSTRAINT unique_agendamento UNIQUE (data, hora, dia_semana, categoria)
);

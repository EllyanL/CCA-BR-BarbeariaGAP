CREATE TABLE horarios (
    id SERIAL PRIMARY KEY,
    dia VARCHAR(10) NOT NULL,
    horario VARCHAR(5) NOT NULL,
    categoria VARCHAR(15) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DISPONIVEL',
    CONSTRAINT uc_dia_horario_categoria UNIQUE (dia, horario, categoria)
);
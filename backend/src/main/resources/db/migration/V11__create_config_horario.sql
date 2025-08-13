CREATE TABLE config_horario (
    id SERIAL PRIMARY KEY,
    inicio TIME NOT NULL,
    fim TIME NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO config_horario (id, inicio, fim)
VALUES (1, '08:00', '18:00');

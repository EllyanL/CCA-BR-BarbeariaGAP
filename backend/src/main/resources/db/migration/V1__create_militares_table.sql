CREATE TABLE militares (
    id SERIAL PRIMARY KEY,
    saram VARCHAR(15),
    nome_completo VARCHAR(100),
    posto_grad VARCHAR(10),
    nome_de_guerra VARCHAR(20),
    email VARCHAR(50),
    om VARCHAR(15),
    quadro VARCHAR(15),
    secao VARCHAR(10),
    ramal VARCHAR(15),
    cpf VARCHAR(15) UNIQUE,
    senha VARCHAR(255),
    categoria VARCHAR(10)
);

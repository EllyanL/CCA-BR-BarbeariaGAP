-- Define valor padrão para senha e limpa senhas existentes de usuários não-admin
ALTER TABLE militares
    ALTER COLUMN senha DROP NOT NULL;

ALTER TABLE militares
    ALTER COLUMN senha SET DEFAULT 'Autenticado no LDAP';

UPDATE militares
SET senha = 'Autenticado no LDAP'
WHERE cpf <> '00000000000';

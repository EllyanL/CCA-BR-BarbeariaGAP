-- Limpa senhas existentes de usuários não-admin
UPDATE militares
SET senha = 'Autenticado no LDAP'
WHERE cpf <> '00000000000';

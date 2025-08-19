-- =====================================================================
-- Esquema Barberia GAP-BR (criação do zero)
-- PostgreSQL
-- =====================================================================

-- (Opcional) Coloque tudo sob uma transação:
BEGIN;

-- =====================================================================
-- TABELA: militares
-- =====================================================================
-- DROP TABLE IF EXISTS agendamentos CASCADE;
-- DROP TABLE IF EXISTS horarios CASCADE;
-- DROP TABLE IF EXISTS configuracao_horario CASCADE;
-- DROP TABLE IF EXISTS militares CASCADE;

CREATE TABLE militares (
    id              SERIAL PRIMARY KEY,
    saram           VARCHAR(15),
    nome_completo   VARCHAR(100),
    posto_grad      VARCHAR(10),
    nome_de_guerra  VARCHAR(50),
    email           VARCHAR(80),
    om              VARCHAR(15),
    quadro          VARCHAR(15),
    secao           VARCHAR(20),
    ramal           VARCHAR(20),
    cpf             VARCHAR(15) UNIQUE,
    senha           VARCHAR(255),
    -- OBS: aqui "categoria" é o PERFIL (ex.: ADMIN / USUARIO), conforme seu uso atual
    categoria       VARCHAR(10),

    CONSTRAINT uq_militares_email UNIQUE (email)
);

-- Índices auxiliares
CREATE INDEX idx_militares_saram       ON militares (saram);
CREATE INDEX idx_militares_nome_guerra ON militares (nome_de_guerra);
CREATE INDEX idx_militares_quadro      ON militares (quadro);
CREATE INDEX idx_militares_categoria   ON militares (categoria);

-- =====================================================================
-- TABELA: agendamentos
-- =====================================================================
CREATE TABLE agendamentos (
    id             SERIAL PRIMARY KEY,

    data           DATE NOT NULL,
    hora           TIME WITHOUT TIME ZONE NOT NULL,
    dia_semana     VARCHAR(15) NOT NULL,  -- 'segunda'...'domingo' (sem acento)

    militar_id     INTEGER,
    categoria      VARCHAR(15),           -- 'GRADUADO' | 'OFICIAL'

    -- Status do registro (do histórico)
    -- 'AGENDADO' | 'REALIZADO' | 'CANCELADO' | 'ADMIN_CANCELADO'
    status         VARCHAR(20) NOT NULL DEFAULT 'AGENDADO',

    -- Quem cancelou (null se não foi cancelado): 'USUARIO' | 'ADMIN'
    cancelado_por  VARCHAR(10),

    CONSTRAINT fk_agendamento_militar
        FOREIGN KEY (militar_id) REFERENCES militares(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT ck_agendamento_status
        CHECK (status IN ('AGENDADO','REALIZADO','CANCELADO','ADMIN_CANCELADO')),

    CONSTRAINT ck_agendamento_cancelado_por
        CHECK (cancelado_por IS NULL OR cancelado_por IN ('USUARIO','ADMIN'))
);

-- Único “ativo”: impede dois agendamentos iguais quando não cancelados
-- (parcial, só considera status <> 'CANCELADO' e <> 'ADMIN_CANCELADO')
CREATE UNIQUE INDEX uq_agendamento_ativo
    ON agendamentos (data, hora, dia_semana, categoria)
    WHERE status NOT IN ('CANCELADO','ADMIN_CANCELADO');

-- Índices úteis para regras de 15 dias e relatórios
CREATE INDEX idx_agenda_militar_data        ON agendamentos (militar_id, data);
CREATE INDEX idx_agenda_categoria_data_hora ON agendamentos (categoria, data, hora);
CREATE INDEX idx_agenda_status              ON agendamentos (status);

-- =====================================================================
-- TABELA: horarios (grade base por dia da semana)
-- =====================================================================
CREATE TABLE horarios (
    id         SERIAL PRIMARY KEY,
    dia        VARCHAR(10) NOT NULL,                    -- 'segunda'...'domingo'
    horario    TIME WITHOUT TIME ZONE NOT NULL,         -- HH:MM
    categoria  VARCHAR(15) NOT NULL,                    -- 'GRADUADO' | 'OFICIAL'
    status     VARCHAR(20) NOT NULL DEFAULT 'DISPONIVEL', -- 'DISPONIVEL' | 'INDISPONIVEL'

    CONSTRAINT ck_horarios_dia
        CHECK (dia IN ('segunda','terca','quarta','quinta','sexta','sabado','domingo')),

    CONSTRAINT ck_horarios_status
        CHECK (status IN ('DISPONIVEL','INDISPONIVEL')),

    CONSTRAINT uc_horarios_dia_hora_categoria
        UNIQUE (dia, horario, categoria)
);

CREATE INDEX idx_horarios_categoria_dia ON horarios (categoria, dia, horario);
CREATE INDEX idx_horarios_status        ON horarios (status);

-- =====================================================================
-- TABELA: configuracao_horario (janela de funcionamento)
-- =====================================================================
CREATE TABLE configuracao_horario (
    id          SERIAL PRIMARY KEY,
    inicio      TIME WITHOUT TIME ZONE NOT NULL,
    fim         TIME WITHOUT TIME ZONE NOT NULL,
    atualizado_em TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ck_conf_horario_intervalo
        CHECK (inicio < fim)
);

-- Semente padrão (08:00 às 18:00)
INSERT INTO configuracao_horario (id, inicio, fim)
VALUES (1, '08:00', '18:00');

-- =====================================================================
-- SEMENTE: usuário administrador
-- senha (bcrypt): secrethash123@!@
-- =====================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM militares WHERE email = 'barbeiroadm@fab.mil.br') THEN
        INSERT INTO militares (
            saram, nome_completo, posto_grad, nome_de_guerra, email,
            om, quadro, secao, ramal, cpf, senha, categoria
        ) VALUES (
            '0000000',
            'Militar Barbeiro Administrador',
            'S2',
            'BARBEIRO ADM',
            'barbeiroadm@fab.mil.br',
            'GAP-BR',
            '',
            '',
            '',
            '00000000000',
            '$2a$16$ftFPaUx7wJUKRTlR0OVMNek.HmF1MAgrXL52Qh6j8nGqGJt/l8h8W',
            'ADMIN'
        );
    END IF;
END $$;

-- =====================================================================
-- SEMENTE: geração de horários (SEG-SEX) por categoria (30 min)
-- Use ASCII nos dias para evitar problema com acentuação ('terca' em vez de 'terça')
-- =====================================================================
DO $$
DECLARE
  h TIME;
  d TEXT;
  c TEXT;
BEGIN
  FOR h IN SELECT unnest(ARRAY[
    '08:00'::time,'08:30'::time,'09:00'::time,'09:30'::time,'10:00'::time,'10:30'::time,
    '11:00'::time,'11:30'::time,'12:00'::time,'12:30'::time,'13:00'::time,'13:30'::time,
    '14:00'::time,'14:30'::time,'15:00'::time,'15:30'::time,'16:00'::time,'16:30'::time,
    '17:00'::time
  ]) LOOP
    FOR d IN SELECT unnest(ARRAY['segunda','terca','quarta','quinta','sexta']) LOOP
      FOR c IN SELECT unnest(ARRAY['GRADUADO','OFICIAL']) LOOP
        INSERT INTO horarios (dia, horario, categoria, status)
        VALUES (d, h, c, 'DISPONIVEL')
        ON CONFLICT (dia, horario, categoria) DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- =====================================================================
-- COMENTÁRIOS ÚTEIS (documentação no catálogo)
-- =====================================================================
COMMENT ON TABLE militares IS 'Cadastro de militares (perfil em "categoria": ADMIN/USUARIO).';
COMMENT ON COLUMN militares.categoria IS 'Perfil do usuário (ex.: ADMIN).';

COMMENT ON TABLE agendamentos IS 'Histórico de agendamentos (cada registro com status próprio).';
COMMENT ON COLUMN agendamentos.status IS 'AGENDADO | REALIZADO | CANCELADO | ADMIN_CANCELADO';
COMMENT ON COLUMN agendamentos.cancelado_por IS 'Quem cancelou: USUARIO | ADMIN';

COMMENT ON TABLE horarios IS 'Grade base por dia da semana/categoria. Representa disponibilidade visual.';
COMMENT ON COLUMN horarios.status IS 'DISPONIVEL | INDISPONIVEL';

COMMENT ON TABLE configuracao_horario IS 'Janela de funcionamento (início/fim) configurada pelo admin.';

-- =====================================================================
-- Finaliza transação
-- =====================================================================
COMMIT;

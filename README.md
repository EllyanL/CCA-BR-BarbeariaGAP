# Barbearia GAP

Aplicação web completa (Angular + Spring Boot) para gerenciamento de
agendamentos de cortes de cabelo no prédio do Ministério da Aeronáutica.

## Visão Geral
- **Backend**: Spring Boot 3 com PostgreSQL. Usa Flyway para migrações e JWT
  para autenticação.
- **Frontend**: Angular 16 com Angular Material.
- **Integrações**: autenticação via LDAP e consulta ao WebService CCABR.
- Scripts de inicialização local e build de produção.

## Arquitetura
Frontend (Angular) → API (Spring Boot) → Banco PostgreSQL

## Estrutura do Projeto
fab-barbearia-gap/
├── backend/ # API Spring Boot
├── frontend/ # Aplicação Angular
├── docs/ # Notas e instruções extras
├── start-dev.sh # Executa backend e frontend em modo dev
└── build-prod.sh # Gera build Angular e inicia o backend


## Setup do Ambiente
### Desenvolvimento com script
1. Configure as variáveis de ambiente (veja abaixo).
2. Verifique se os scripts possuem permissão de execução (especialmente em
   sistemas onde as permissões possam ser perdidas após o clone). Caso
   necessário, execute:
   ```bash
   chmod +x start-dev.sh build-prod.sh backend/mvnw
   ```
3. Na raiz do projeto, execute:
   ```bash
   ./start-dev.sh
   ```
   O script inicia o backend em http://localhost:8080 e o frontend em http://localhost:4200
   (o perfil `dev` é definido automaticamente).

### Backend
1. `cd backend`
2. `./mvnw spring-boot:run`

### Frontend
1. `cd frontend`
2. `npm install`
3. `npm start`

### Ambiente de Produção
1. Gere o build Angular e copie os arquivos para o backend:
   ```bash
   ./build-prod.sh
   ```
   Os arquivos são copiados para `backend/src/main/resources/static/` e o backend é iniciado em seguida
   (o perfil `prod` é definido automaticamente).

## Variáveis de Ambiente
Defina no sistema as seguintes variáveis antes de rodar o backend:

| Variável              | Descrição                               | Obrigatória? |
| --------------------- | --------------------------------------- | ------------ |
| `DB_URL`              | URL JDBC do banco PostgreSQL            |              |
| `DB_DRIVER_CLASS`     | Classe do driver JDBC (opcional)        |              |
| `DB_USERNAME`         | Usuário do banco                        |              |
| `DB_PASSWORD`         | Senha do banco                          | Sim          |
| `JWT_SECRET`          | Chave para assinar tokens JWT           | Sim          |
| `LDAP_BASE`           | Base de pesquisa do servidor LDAP       |              |
| `LDAP_URL`            | URL do servidor LDAP                    |              |
| `WEBSERVICE_API_URL`  | URL base do WebService CCABR            |              |
| `WEBSERVICE_USERNAME` | Usuário para autenticação no WebService |              |
| `WEBSERVICE_PASSWORD` | Senha para autenticação no WebService   | Sim          |

As variáveis `DB_PASSWORD`, `JWT_SECRET` e `WEBSERVICE_PASSWORD` devem
ser definidas no ambiente; valores padrão não são fornecidos por
questões de segurança. A configuração utiliza `application.yml` com
perfis (`dev`, `prod`) para definir valores seguros para os demais
parâmetros.

Valores de exemplo podem ser vistos em
`backend/src/main/resources/application-dev.yml`

## Regras de Negócio
- Horários são gerados de 30 em 30 minutos dentro da janela configurada.
- Agendamentos são aceitos somente de segunda a sexta entre os limites da janela.
- Agendar ou cancelar exige antecedência mínima de 30 minutos.
- Cada militar só pode agendar novamente após 15 dias do último corte.
- Administradores não podem liberar todo um dia se houver horários já agendados nem bloquear diretamente um horário agendado.

## Área Admin
- `/admin/dashboard`: painel com indicadores gerais.
- `/admin/horarios`: gerenciamento de horários disponíveis.
- `/admin/usuarios`: cadastro e permissões de usuários.
- `/admin/gerenciar-registros`: revisão ou exclusão de registros.

## Área Usuário
- `/auth/login`: autenticação no sistema.
- `/oficiais` e `/graduados`: páginas de agendamento conforme perfil.
- `/meus-agendamentos`: consulta e cancelamento dos próprios horários.
- Restrições: horários de 30 minutos dentro da janela configurada; antecedência mínima de 30 minutos para agendar ou cancelar; novo agendamento apenas após 15 dias do último corte.

## Fluxo de Agendamento e Cancelamento
1. Autentique-se em `/auth/login`.
2. Acesse `/oficiais` ou `/graduados` e escolha um horário disponível.
3. Confirme o agendamento.
4. Para cancelar, vá a `/meus-agendamentos` e selecione o horário desejado.

## Execução do Backend e Frontend
- Tudo de uma vez: `./start-dev.sh` (inicia backend em `http://localhost:8080` e frontend em `http://localhost:4200`).
- Somente backend: `cd backend && ./mvnw spring-boot:run`.
- Somente frontend: `cd frontend && npm install && npm start`.

## Convenções de Código
### Backend
- Formatação automática com [Spotless](https://github.com/diffplug/spotless):
  ```bash
  ./format-code.sh
  ```

### Frontend
- Lint: `npm run lint`
- Formatação: `npm run format`

## Endpoints Principais
| Método | Endpoint | Descrição |
| ------ | -------- | --------- |
| `POST` | `/api/auth/login` | Autentica e retorna token JWT |
| `GET` | `/api/horarios` | Lista horários disponíveis |
| `POST` | `/api/agendamentos` | Cria novo agendamento |
| `GET` | `/api/agendamentos/meus` | Lista agendamentos do usuário |
| `PUT` | `/api/agendamentos/{id}/cancelar` | Cancela agendamento |
| `GET` | `/api/agendamentos/admin?inicio=YYYY-MM-DD&fim=YYYY-MM-DD` | Consulta agendamentos por período (admin) |

## Executando Testes

### Pré-requisitos para Testes do Backend
Para rodar os testes é necessário ter o **JDK** instalado (o projeto usa Java 18).
Também é recomendável possuir o **Maven** configurado. Caso não tenha o Maven
localmente, o wrapper `./mvnw` realizará o download automático na primeira
execução.

### Backend
Para rodar os testes do backend execute:
```bash
cd backend && ./mvnw test
```
Certifique-se de configurar as variáveis de ambiente necessárias (por exemplo,
definições de banco de dados) antes de rodar os testes.

### Frontend
1. Instale as dependências:
    cd frontend
    npm install

2. Caso o comando ng não esteja disponível:
    npm install -g @angular/cli

3. Compile o frontend para garantir que não há erros de build:
    npm run build

4. Execute os testes:
    npm test

## Troubleshooting
- **Permissão de execução**: certifique-se de que `backend/mvnw` e `start-dev.sh` estão marcados como executáveis.
- **Variáveis de ambiente**: valores ausentes podem impedir a inicialização.
- **Download de dependências**: a primeira execução de Maven ou NPM requer acesso à internet.
- **Portas em uso**: libere as portas `8080` (API) e `4200` (frontend).
- **Erros de build do frontend**: remova `node_modules` e execute `npm install` novamente.

## Documentação
Informações detalhadas sobre regras de agendamento e desenvolvimento estão em `docs/ANOTATIONS.md`.

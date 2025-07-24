# Barbearia GAP

Aplicação web completa (Angular + Spring Boot) para gerenciamento de
agendamentos de cortes de cabelo no prédio do Ministério da Aeronáutica.

## Visão Geral
- **Backend**: Spring Boot 3 com PostgreSQL. Usa Flyway para migrações e JWT
  para autenticação.
- **Frontend**: Angular 16 com Angular Material.
- **Integrações**: autenticação via LDAP e consulta ao WebService CCABR.
- Scripts de inicialização local e build de produção.

## Estrutura do Projeto
fab-barbearia-gap/
├── backend/ # API Spring Boot
├── frontend/ # Aplicação Angular
├── docs/ # Notas e instruções extras
├── start-dev.sh # Executa backend e frontend em modo dev
└── build-prod.sh # Gera build Angular e inicia o backend


## Como Executar
### Ambiente de Desenvolvimento
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
   O script inicia o backend em http://localhost:8080 e o frontend em http://localhost:4200
   (o perfil `dev` é definido automaticamente)

### Ambiente de Produção
1. Gere o build Angular e copie os arquivos para o backend:
    ./build-prod.sh
    Os arquivos são copiados para backend/src/main/resources/static/ e o backend é iniciado em seguida
    (o perfil `prod` é definido automaticamente)

## Variáveis de Ambiente
Defina no sistema as seguintes variáveis antes de rodar o backend:

| Variável              | Descrição                               |
| --------------------- | --------------------------------------- |
| `DB_URL`              | URL JDBC do banco PostgreSQL            |
| `DB_DRIVER_CLASS`     | Classe do driver JDBC (opcional)        |
| `DB_USERNAME`         | Usuário do banco                        |
| `DB_PASSWORD`         | Senha do banco                          |
| `JWT_SECRET`          | Chave para assinar tokens JWT           |
| `LDAP_BASE`           | Base de pesquisa do servidor LDAP       |
| `LDAP_URL`            | URL do servidor LDAP                    |
| `WEBSERVICE_API_URL`  | URL base do WebService CCABR            |
| `WEBSERVICE_USERNAME` | Usuário para autenticação no WebService |
| `WEBSERVICE_PASSWORD` | Senha para autenticação no WebService   |

As variáveis `DB_PASSWORD` e `WEBSERVICE_PASSWORD` devem ser definidas
no ambiente para que o backend consiga acessar o banco de dados e o
WebService externo com segurança.

Valores de exemplo podem ser vistos em `backend/src/main/resources/application-dev.properties`

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

### Dicas de Solução de Problemas
Se o comando `./mvnw test` falhar, verifique os seguintes pontos:
- **Permissão de execução**: certifique-se de que `backend/mvnw` está
  marcado como executável (`chmod +x backend/mvnw`).
- **Variáveis de ambiente**: faltas ou valores incorretos podem impedir a
  inicialização do contexto de testes.
- **Download de dependências**: a primeira execução do wrapper requer acesso à
  internet para baixar o Maven e bibliotecas. Caso esteja atrás de um proxy,
  configure as variáveis de proxy do Maven conforme a sua rede.

## Documentação
Informaçães detalhadas sobre regras de agendamento e desenvolvimento estão em docs/ANOTATIONS.md

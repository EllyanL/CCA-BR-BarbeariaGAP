# Aplicação Web para Barbearia do Prédio do Ministério da Aeronáutica  

Este projeto é uma aplicação web desenvolvida para gerenciar agendamentos de corte de cabelo na barbearia do prédio do Ministério da Aeronáutica.  

## 🚀 Como Executar  

### Ambiente de Desenvolvimento  
Para iniciar o ambiente de desenvolvimento, execute o script abaixo:  
```sh
./start-dev.sh
```  
- O frontend será iniciado em **http://localhost:4200**  
- O backend será iniciado em **http://localhost:8080**  

### Ambiente de Produção  
Para gerar o build de produção e iniciar a aplicação, utilize o seguinte comando:  
```sh
./build-prod.sh
```  
Esse script compilará o frontend do Angular e copiará os arquivos gerados para a pasta do backend:  
```
/backend/src/main/resources/static/
```  
Após isso, o backend será iniciado e servirá o frontend automaticamente.

### Variáveis de Ambiente Necessárias

A aplicação lê diversas configurações a partir de variáveis de ambiente. Antes de iniciar o backend certifique‑se de definir as seguintes variáveis:

| Variável | Descrição |
|----------|-----------|
| `DB_URL` | URL de conexão JDBC do banco de dados PostgreSQL |
| `DB_USERNAME` | Usuário do banco de dados |
| `DB_PASSWORD` | Senha do banco de dados |
| `JWT_SECRET` | Chave utilizada para assinar os tokens JWT |
| `LDAP_BASE` | Base de pesquisa para o servidor LDAP |
| `LDAP_URL` | URL do servidor LDAP |
| `WEBSERVICE_API_URL` | URL base do WebService CCABR |
| `WEBSERVICE_USERNAME` | Usuário para autenticação no WebService |
| `WEBSERVICE_PASSWORD` | Senha para autenticação no WebService |

---  
📌 **Tecnologias Utilizadas**:  
- **Frontend**: Angular  
- **Backend**: Spring Boot  
- **Banco de Dados**: PostgreSQL  

### Executando Testes

Para rodar os testes do Angular, instale as dependências antes de executar o comando:
```sh
cd frontend
npm install
```
Se o comando `ng` não estiver disponível, instale o Angular CLI globalmente:
```sh
npm install -g @angular/cli
```
Após a instalação, rode:
```sh
npm test
```

#### Documentação
Notas de desenvolvimento adicionais estão disponíveis na pasta `docs/`.

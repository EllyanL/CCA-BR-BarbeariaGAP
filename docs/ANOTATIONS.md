Vamos detalhar passo a passo como implementar as funcionalidades solicitadas para o gerenciamento de horários no **tela do admin**, seguindo os requisitos da query. O objetivo é garantir que o admin tenha controle total sobre os horários de uma role específica, com uma interface intuitiva e regras claras para lidar com horários agendados e disponíveis.

---

## **Visão Geral**
Ao acessar o gerenciamento de horários da role desejada, o admin deve ter as seguintes capacidades:
1. Disponibilizar, indisponibilizar e cadastrar novos horários.
2. Visualizar e interagir com horários agendados (botões laranja).
3. Indisponibilizar horários disponíveis (não agendados) e, se necessário, disponibilizá-los novamente.
4. Respeitar restrições específicas para horários agendados, como a impossibilidade de disponibilizar todos os horários de uma vez ou indisponibilizar diretamente um horário agendado.

Abaixo, abordaremos cada ponto da query de forma estruturada.

---

## **Passo 1: Disponibilizar, Indisponibilizar e Cadastrar Novos Horários**
O admin precisa ter ferramentas básicas para gerenciar os horários da role:
- **Disponibilizar Horários**: O admin pode liberar horários para agendamento, seja individualmente ou para um dia inteiro (com restrições que veremos mais adiante).
- **Indisponibilizar Horários**: O admin pode bloquear horários específicos ou todos os horários de um dia.
- **Cadastrar Novos Horários**: O admin pode adicionar novos horários base para a role, ampliando as opções disponíveis.

### **Solução**
- **Frontend**: 
  - Use botões ou opções na interface (como "Disponibilizar Dia" ou "Adicionar Horário") que chamem métodos específicos no serviço de horários.
  - Exemplo: Um botão "Cadastrar Novo Horário" que permita ao admin inserir um horário base (ex.: "08:00") para a role.
- **Backend**: 
  - Implemente endpoints para:
    - Adicionar horários base (ex.: `POST /api/horarios/base`).
    - Disponibilizar todos os horários de um dia (ex.: `POST /api/horarios/disponibilizar-dia`).
    - Indisponibilizar todos os horários de um dia (ex.: `POST /api/horarios/indisponibilizar-dia`).
- **Restrição**: Ao disponibilizar todos os horários, preserve os horários agendados (detalhado no Passo 3.2).

---

## **Passo 2: Caso - Horários Agendados**
Os horários agendados têm um tratamento especial para visualização e interação.

### **2.1 - Visualizar Horários Agendados**
- **Requisito**: Botões de horários agendados devem aparecer em laranja, ainda exibindo o horário (ex.: "08:00 - AGENDADO").
- **Solução**:
  - No frontend, use uma condição para estilizar os botões:
    - Se o horário tiver um agendamento associado a um usuário (militar), aplique a cor laranja (ex.: `color="accent"` em Angular Material).
    - Mantenha o texto do horário visível no botão.

### **2.3 - Clicar no Botão Agendado**
- **Requisito**: Ao clicar no botão laranja, as informações do usuário que agendou devem ser exibidas.
- **Solução**:
  - **Frontend**: 
    - Ao clicar no botão, chame um método que busca os detalhes do agendamento:
      ```typescript
      abrirInformacoesAgendamento(dia: string, horario: string) {
        this.agendamentoService.getAgendamentoPorHorario(dia, horario, this.roleSelecionada)
          .subscribe(agendamento => {
            this.dialog.open(InformacoesAgendamentoComponent, { data: agendamento });
          });
      }
      ```
    - Use um diálogo (ex.: MatDialog no Angular) para mostrar nome, contato ou outros dados do usuário.
  - **Backend**: 
    - Crie um endpoint para buscar o agendamento:
      ```
      GET /api/agendamentos/check?dia={dia}&horario={horario}&role={role}
      ```

### **2.4 - Desmarcar o Horário**
- **Requisito**: No diálogo com as informações do usuário, o admin pode desmarcar o horário com um botão.
- **Solução**:
  - **Frontend**: 
    - Adicione um botão "Desmarcar" no diálogo:
      ```typescript
      desmarcarAgendamento(id: number) {
        this.agendamentoService.cancelarAgendamento(id).subscribe(() => {
          this.snackBar.open('Horário desmarcado com sucesso!', 'OK', { duration: SNACKBAR_DURATION });
          this.atualizarHorarios();
        });
      }
      ```
    - Após desmarcar, o horário volta a ser disponível (botão azul).
  - **Backend**: 
    - Endpoint para remover o agendamento:
      ```
      PUT /api/agendamentos/{id}/cancelar
      ```

---

## **Passo 3: Caso - Horários Disponíveis Mas Não Agendados**
Horários disponíveis (não agendados) devem ser fáceis de gerenciar.

### **3.1 - Indisponibilizar Horário Disponível**
- **Requisito**: O admin clica em um horário disponível (botão azul) e o indisponibiliza.
- **Solução**:
  - **Frontend**: 
    - Ao clicar no botão azul, chame um método para indisponibilizar:
      ```typescript
      indisponibilizarHorario(dia: string, horario: string) {
        const agendamentoFicticio = { dia, horario, role: this.roleSelecionada, usuario: null };
        this.horarioService.indisponibilizarHorario(agendamentoFicticio).subscribe(() => {
          this.atualizarHorarios();
        });
      }
      ```
    - O botão muda para vermelho, indicando que está indisponível.
  - **Backend**: 
    - Crie um agendamento fictício (sem usuário) para bloquear o horário:
      ```
      POST /api/agendamentos/indisponibilizar
      ```

### **3.1.1 - Disponibilizar Novamente**
- **Requisito**: O admin pode clicar no horário indisponível (botão vermelho) para torná-lo disponível novamente.
- **Solução**:
  - **Frontend**: 
    - Ao clicar no botão vermelho, remova o agendamento fictício:
      ```typescript
      disponibilizarHorario(dia: string, horario: string) {
        this.horarioService.disponibilizarHorario(dia, horario, this.roleSelecionada).subscribe(() => {
          this.atualizarHorarios();
        });
      }
      ```
    - O botão volta a ser azul.
  - **Backend**: 
    - Endpoint para remover o agendamento fictício:
      ```
      POST /api/agendamentos/disponibilizar
      ```

### **3.2 - Restrições para Horários Agendados**
- **Requisito 3.2**: O admin não pode disponibilizar TODOS os horários de um dia se algum estiver agendado; é necessário desmarcar individualmente.
- **Solução**:
  - **Backend**: 
    - No endpoint `disponibilizar-dia`, verifique se há horários agendados:
      ```java
      if (agendamentos.stream().anyMatch(a -> a.getUsuario() != null)) {
        return ResponseEntity.badRequest().body("Desmarque os horários agendados antes de disponibilizar o dia.");
      }
      ```
    - Apenas remova agendamentos fictícios, mantendo os reais.

- **Requisito 3.2.2**: O admin não pode indisponibilizar um horário agendado diretamente; precisa desmarcá-lo primeiro.
- **Solução**:
  - **Frontend**: 
    - Desabilite o clique para indisponibilizar em botões laranja (ex.: `[disabled]="status === 'Agendado'"`).
  - **Backend**: 
    - No endpoint `indisponibilizar`, rejeite se o horário já estiver agendado:
      ```java
      if (existingAgendamento.isPresent() && existingAgendamento.get().getUsuario() != null) {
        return ResponseEntity.badRequest().body("Horário agendado não pode ser indisponibilizado.");
      }
      ```

---

## **Resumo da Implementação**
- **Cores dos Botões**:
  - Azul: Disponível.
  - Laranja: Agendado.
  - Vermelho: Indisponível (fictício).
- **Ações**:
  - Clique em azul → Indisponibiliza (vira vermelho).
  - Clique em vermelho → Disponibiliza (vira azul).
  - Clique em laranja → Abre diálogo para visualizar/desmarcar (vira azul após desmarcar).
- **Restrições**:
  - "Disponibilizar Dia" só funciona se não houver agendamentos reais.
  - Horários agendados exigem desmarcação antes de qualquer outra ação.

Com isso, o admin terá um gerenciamento eficiente e intuitivo dos horários, respeitando todas as regras especificadas!

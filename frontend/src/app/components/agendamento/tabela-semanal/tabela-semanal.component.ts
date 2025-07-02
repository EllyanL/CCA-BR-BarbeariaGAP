import { ChangeDetectorRef, Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { HorariosPorDia, HorariosService } from 'src/app/services/horarios.service';
import { Observable, Subscription, of } from 'rxjs';
import { animate, style, transition, trigger } from '@angular/animations';
import { catchError, map, take, tap, timeout } from 'rxjs/operators';

import { Agendamento } from 'src/app/models/agendamento';
import { AgendamentoService } from 'src/app/services/agendamento.service';
import { AuthService } from 'src/app/services/auth.service';
import { DialogoAgendamentoComponent } from '../dialogo-agendamento/dialogo-agendamento.component';
import { DialogoCancelamentoComponent } from '../dialogo-cancelamento/dialogo-cancelamento.component';
import { DialogoDetalhesAgendamentoComponent } from '../dialogo-detalhes-agendamento/dialogo-detalhes-agendamento.component';
import { Horario } from 'src/app/models/horario';
import { LoggingService } from 'src/app/services/logging.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Militar } from 'src/app/models/militar';
import { MilitarService } from 'src/app/services/militar.service';
import { Router } from '@angular/router';
import { ServerTimeService } from 'src/app/services/server-time.service';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'app-tabela-semanal',
  templateUrl: './tabela-semanal.component.html',
  styleUrls: ['./tabela-semanal.component.css'],
  animations: [
    trigger('agendarAnimacao', [
      transition(':enter', [
        style({ transform: 'scale(0.5)' }),
        animate('300ms ease-out', style({ transform: 'scale(1)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'scale(0.5)' }))
      ])
    ]),
    trigger('cancelarAnimacao', [
      transition(':enter', [
        style({ transform: 'scale(0.5)' }),
        animate('300ms ease-out', style({ transform: 'scale(1)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'scale(0.5)' }))
      ])
    ])
  ]
})
export class TabelaSemanalComponent implements OnInit, OnDestroy, OnChanges {
  @Input() categoria: string = '';
  @Input() opcoesPostoGrad: string[] = [];
  @Input() horariosPorDia: { [key: string]: { horario: string, status: string, usuarioId?: number }[] } = {};
  @Input() saramUsuario!: string;
  @Input() idMilitarLogado: number | null | undefined;

  oficiais: Militar[] = [];
  graduados: Militar[] = [];
  militarLogado: string = '';
  omMilitar: string = '';
  cpfMilitarLogado: string = '';
  saramMilitarLogado: string = '';
  postos: string[] = ['AP', '2T', '1T', 'CP', 'MJ', 'TC', 'CL', 'BG', 'MB', 'TB'];
  graduacoes = ['S2', 'S1', 'CB', '3S', '2S', '1S', 'SO'];

  agendamentos: Agendamento[] = [];
  inicioDaSemana!: Date;
  fimDaSemana!: Date;
  diasDaSemana = ['segunda', 'terça', 'quarta', 'quinta', 'sexta'];
  diasComData: string[] = []; //Apenas Exibição
  horariosBaseSemana: string[] = [];
  feedbackMessageTitle: string = '';
  timeOffsetMs: number = 0;
  usuarioCarregado = false;
  private userDataSubscription?: Subscription;
  private horariosSub?: Subscription;
  private storageKey: string = '';

  constructor(
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private agendamentoService: AgendamentoService,
    private militarService: MilitarService,
    private horariosService: HorariosService,
    private userService: UserService,
    private serverTimeService: ServerTimeService,
    private authService: AuthService,
    private logger: LoggingService,
    private cdr: ChangeDetectorRef
  ) {}

  private saveAgendamentos(): void {
    if (this.storageKey) {
      try {
        sessionStorage.setItem(this.storageKey, JSON.stringify(this.agendamentos));
      } catch (e) {
        this.logger.error('Erro ao salvar agendamentos no storage:', e);
      }
    }
  }

  // Carrega do sessionStorage os agendamentos associados ao usuário atual.
  // A chave é definida em initAfterTime() e dados anteriores são limpos
  // quando ocorre troca de usuário.
  private loadAgendamentosFromStorage(): void {
    if (this.storageKey) {
      const data = sessionStorage.getItem(this.storageKey);
      if (data) {
        try {
          this.agendamentos = JSON.parse(data);
        } catch (e) {
          this.logger.error('Erro ao carregar agendamentos do storage:', e);
          this.agendamentos = [];
        }
      }
    }

  }

  

  ngOnInit(): void {
    // this.idMilitarLogado = this.authService.getUsuarioAutenticado()?.id;
    this.idMilitarLogado = this.authService.getUsuarioAutenticado()?.id ?? null;
    this.serverTimeService.getServerTime().subscribe({
      next: (res) => {
        this.timeOffsetMs = res.timestamp - Date.now();
        if (Math.abs(this.timeOffsetMs) > 60 * 1000) {
          this.snackBar.open('Atenção: horário do dispositivo diferente do servidor.', 'Ciente', { duration: 5000 });
        }
        this.initAfterTime();
      },
      error: (err) => {
        this.logger.error('Erro ao obter hora do servidor:', err);
        this.initAfterTime();
      }
    });
  }

  ngOnChanges(_changes: SimpleChanges): void {
    this.cdr.detectChanges();
  }

  // Define a chave de armazenamento baseada no CPF do usuário
  // e carrega os agendamentos salvos para ele.
  private initAfterTime(): void {
    this.userDataSubscription = this.userService.userData$
      .pipe(
        take(1),
        timeout(5000),
        catchError(err => {
          this.logger.error('Erro ou timeout ao obter dados do usuário:', err);
        
          const fallback = this.authService.getUsuarioAutenticado();
          if (fallback?.id) {
            this.idMilitarLogado = fallback.id;
          }
        
          this.usuarioCarregado = true;
          this.loadAllData();
          this.cdr.detectChanges();
        
          return of([]);
        })
        
      )
      .subscribe(userData => {
        if (userData && userData.length > 0 && userData[0].saram) {
          const newKey = `agendamentos-${userData[0].cpf}`;
          if (this.storageKey && this.storageKey !== newKey) {
            sessionStorage.removeItem(this.storageKey);
            this.agendamentos = [];
          }
          this.militarLogado = userData[0].nomeDeGuerra;
          this.omMilitar = userData[0].om;
          this.cpfMilitarLogado = userData[0].cpf;
          this.saramMilitarLogado = userData[0].saram;
          // this.idMilitarLogado = userData[0].id;
          this.idMilitarLogado = userData[0].id ?? null;

          // 👀 After assigning the user properties we trigger change detection
          // so that UI elements that depend on these values (e.g. button states)
          // are updated immediately.
          this.cdr.detectChanges();

          this.storageKey = newKey;
          this.loadAgendamentosFromStorage();
          this.logger.log('🔐 userData carregado. Chamando loadAllData()');
          this.cdr.detectChanges();
          this.loadAllData();
        } else {
          this.logger.warn('Dados de usuário indisponíveis. Usando dados de fallback.');
          this.usuarioCarregado = true;
          this.loadAllData();
        }
      });
  }

  private loadAllData() {  //Chama todos os load*() necessários.
    if (this.isCurrentRoute('/graduados')) {
      this.categoria = 'GRADUADO';
    } else if (this.isCurrentRoute('/oficiais')) {
      this.categoria = 'OFICIAL';
    }
    this.horariosService.startPollingHorarios(this.categoria);
    this.horariosSub = this.horariosService.horariosPorDia$.subscribe({
      next: horarios => {
        this.horariosPorDia = horarios;
        const todosHorarios = new Set<string>();
        Object.values(this.horariosPorDia).forEach(lista => {
          lista.forEach(h => todosHorarios.add(h.horario));
        });
        this.horariosBaseSemana = Array.from(todosHorarios).sort();
        this.logger.log('Horários atualizados:', this.horariosPorDia);
      },
      error: err => this.logger.error('Erro ao atualizar horários:', err)
    });
  
    this.desabilitarTodosOsBotoes();
    this.setDiasSemanaAtual();
    this.loadHorariosBase();
    this.loadMilitares(this.categoria);
    this.loadAgendamentos(this.categoria);
  }
  
  getLabelDiaComData(dia: string): string {
    const index = this.diasDaSemana.findIndex(d => d.toLowerCase() === dia.toLowerCase());
    return this.diasComData[index]; // Exemplo: "sexta - 07/06"
  }
  
  agendarCorte(diaSemana: string, hora: string) {
    const diaSemanaFormatado = diaSemana.split(' - ')[0].trim().toLowerCase();
    const horarioDisponivel = this.horariosPorDia[diaSemanaFormatado]?.some(
      h => h.horario === hora && h.status === 'DISPONIVEL'
    );

    if (!horarioDisponivel) {
      this.snackBar.open('Horário não disponível para sua categoria.', 'Ciente', { duration: 3000 });
      return;
    }

    const dataISO = this.getDataFromDiaSemana(diaSemana);
    const agendamentoDate = new Date(`${dataISO}T${hora.slice(0, 5)}`);
    const diffMs = agendamentoDate.getTime() - (Date.now() + this.timeOffsetMs);
    if (diffMs < 15 * 60 * 1000) {
      this.snackBar.open('O agendamento precisa ser feito com no mínimo 15 minutos de antecedência.', 'Ciente', { duration: 3000 });
      return;
    }
  
    const dialogRef = this.dialog.open(DialogoAgendamentoComponent, {
      width: '500px',
      data: {
        data: this.getDataFromDiaSemana(diaSemana),
        diaSemana: diaSemanaFormatado,
        hora: hora,
        categoria: this.categoria.toUpperCase(),
        opcoesPostoGrad: this.opcoesPostoGrad
      },
    });
  
    dialogRef.afterClosed().pipe(
      catchError(error => {
        this.logger.error('Erro ao buscar dados do militar:', error);
        return of(null);
      })
    ).subscribe((result: Agendamento) => {
      if (result) {
        this.logger.log('Dados recebidos do diálogo:', result);
        // O agendamento já foi salvo no diálogo, basta atualizar o estado local
        this.agendamentos.push(result);
        this.agendamentos = [...this.agendamentos];
        this.logger.log('Agendamentos atualizados:', this.agendamentos);
        this.saveAgendamentos();
        this.snackBar.open('Agendamento salvo com sucesso!', 'Ciente', { duration: 3000 });
        if (this.horariosPorDia[diaSemanaFormatado]) {
          const horarioIndex = this.horariosPorDia[diaSemanaFormatado].findIndex(h => h.horario === hora);
          if (horarioIndex !== -1) {
            this.horariosPorDia[diaSemanaFormatado][horarioIndex].status = 'AGENDADO';
            this.horariosPorDia[diaSemanaFormatado][horarioIndex].usuarioId = result.militar?.id;
            this.horariosPorDia = { ...this.horariosPorDia };
          }
        }
      }
    });
  }

  desmarcarAgendamento(agendamento: Agendamento) { //	Chama service para deletar agendamento.
    if (!agendamento.militar || agendamento.militar?.id !== this.idMilitarLogado) {
      this.snackBar.open('Você não tem permissão para cancelar este agendamento.', 'Ciente', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialog.open(DialogoCancelamentoComponent, {
      width: '300px',
      data: { diaSemana: agendamento.diaSemana, hora: agendamento.hora, usuarioId: agendamento.militar?.id },
      autoFocus: true
    });

    dialogRef.afterClosed().pipe(
      catchError(error => {
        this.logger.error('Erro ao processar cancelamento:', error);
        return of(null);
      })
    ).subscribe(result => {
      if (result && agendamento.id) {
        this.agendamentoService.deleteAgendamento(agendamento.id).subscribe(() => {
          this.agendamentos = this.agendamentos.filter(a => a.id !== agendamento.id);
          this.snackBar.open('Agendamento desmarcado com sucesso.', 'Ciente', { duration: 3000 });
          const diaSemanaFormatado = agendamento.diaSemana.toLowerCase();
          if (this.horariosPorDia[diaSemanaFormatado]) {
            const horaFormatada = agendamento.hora.slice(0, 5);
            const horarioIndex = this.horariosPorDia[diaSemanaFormatado].findIndex(h => h.horario === horaFormatada);
          if (horarioIndex !== -1) {
            this.horariosPorDia[diaSemanaFormatado][horarioIndex].status = 'DISPONIVEL';
            this.horariosPorDia[diaSemanaFormatado][horarioIndex].usuarioId = undefined;
            this.horariosPorDia = { ...this.horariosPorDia };
          }
        }
        this.saveAgendamentos();
      }, error => {
          this.logger.error('Erro ao desmarcar agendamento:', error);
          this.snackBar.open(error.error || 'Erro ao desmarcar o agendamento', 'Ciente', { duration: 3000 });
        });
      }
    });
  }

  private loadAgendamentos(categoria: string) { //Carrega os agendamentos e associa ao usuário logado.
    this.agendamentoService.getAgendamentos().pipe(
      tap(agendamentos => {
        if (agendamentos && agendamentos.length > 0) {
          const agendamentosFiltrados = agendamentos.filter(agendamento =>
            agendamento.militar &&
            agendamento.militar.categoria === categoria.toUpperCase()
          );

          this.agendamentos = agendamentosFiltrados.map(agendamento => ({
            ...agendamento,
            diaSemana: agendamento.diaSemana.trim().toLowerCase(),
            hora: agendamento.hora.trim()
          }));
          this.saveAgendamentos();
        }
      }),
      catchError(error => {
        this.logger.error('Erro ao obter agendamentos:', error);
        this.agendamentos = [];
        return of([]);
      })
    ).subscribe({
      next: () => {
        this.saveAgendamentos();
      },
      error: () => {
        this.usuarioCarregado = true;
      },
      complete: () => {
        this.usuarioCarregado = true;
      }
    });
  }

  loadHorariosBase(): void {
    this.horariosService.getHorariosBase().subscribe(
      (horarios) => {
        this.horariosBaseSemana = horarios;
        this.ordenarHorarios();
      },
      (error) => {
        this.logger.error('Erro ao carregar os horários base:', error);
      }
    );
  }

  private ordenarHorarios(): void {
    this.horariosBaseSemana.sort((a, b) => {
      const getTimeValue = (horarioStr: string) => {
        const [baseHorario, sufixo] = horarioStr.split(' ');
        const [hours, minutes] = baseHorario.split(':').map(Number);
        const timeInMinutes = hours * 60 + minutes;
        if (sufixo) {
          const suffixNumber = parseInt(sufixo.replace('°', ''), 10);
          return timeInMinutes + suffixNumber * 0.01;
        }
        return timeInMinutes;
      };
      return getTimeValue(a) - getTimeValue(b);
    });
  }

  loadHorariosDisponiveis() {
    this.horariosService.horariosPorDia$.subscribe(horarios => {
      this.horariosPorDia = horarios;
    });
  }

  isCurrentRoute(route: string): boolean {
    return this.router.url.includes(route);
  }
  handleClick(agendamento: Agendamento | undefined, dia?: string, hora?: string) {
    const abrirDialogo = (ag: Agendamento) => {
      const podeDesmarcar = this.isAgendamentoDoMilitarLogado(ag) && this.isAgendamentoDesmarcavel(ag);
      const dialogRef = this.dialog.open(DialogoDetalhesAgendamentoComponent, {
        width: '400px',
        data: { agendamento: ag, podeDesmarcar }
      });

      dialogRef.afterClosed().subscribe((resultado: any) => {
        if (resultado && resultado !== true && resultado.id) {
          // atualização
        const index = this.agendamentos.findIndex(a => a.id === resultado.id);
        if (index !== -1) {
          this.agendamentos[index] = resultado;
          this.agendamentos = [...this.agendamentos];
        }
        const diaFormatoAntigo = ag.diaSemana.toLowerCase();
        const horaAntiga = ag.hora.slice(0,5);
        const idx = this.horariosPorDia[diaFormatoAntigo]?.findIndex(h => h.horario === horaAntiga);
        if (idx !== undefined && idx !== -1) {
          this.horariosPorDia[diaFormatoAntigo][idx].status = 'DISPONIVEL';
          this.horariosPorDia[diaFormatoAntigo][idx].usuarioId = undefined;
        }
        const diaNovo = resultado.diaSemana.toLowerCase();
        const horaNova = resultado.hora.slice(0,5);
        const idxNovo = this.horariosPorDia[diaNovo]?.findIndex(h => h.horario === horaNova);
        if (idxNovo !== undefined && idxNovo !== -1) {
          this.horariosPorDia[diaNovo][idxNovo].status = 'AGENDADO';
          this.horariosPorDia[diaNovo][idxNovo].usuarioId = resultado.militar?.id;
        }
        this.horariosPorDia = { ...this.horariosPorDia };
        this.saveAgendamentos();
      } else if (resultado === true && ag.id) {
        this.agendamentos = this.agendamentos.filter(a => a.id !== ag.id);
        const diaSemanaFormatado = ag.diaSemana.toLowerCase();
        if (this.horariosPorDia[diaSemanaFormatado]) {
          const horaFormatada = ag.hora.slice(0, 5);
          const horarioIndex = this.horariosPorDia[diaSemanaFormatado].findIndex(h => h.horario === horaFormatada);
          if (horarioIndex !== -1) {
            this.horariosPorDia[diaSemanaFormatado][horarioIndex].status = 'DISPONIVEL';
            this.horariosPorDia[diaSemanaFormatado][horarioIndex].usuarioId = undefined;
            this.horariosPorDia = { ...this.horariosPorDia };
          }
        }
        this.saveAgendamentos();
      }
      });
    };

    if (agendamento) {
      abrirDialogo(agendamento);
      return;
    }

    if (!dia || !hora) return;
    const data = this.getDataFromDiaSemana(this.getLabelDiaComData(dia));
    const diaKey = dia.split(' - ')[0].trim().toLowerCase();
    this.agendamentoService.getAgendamentoPorHorario(data, hora.slice(0,5), diaKey, this.categoria)
      .subscribe({
        next: (ag) => { if (ag) { abrirDialogo(ag); } },
        error: err => this.logger.error('Erro ao buscar detalhes do agendamento:', err)
      });
  }

  isAgendamentoDoMilitarLogado(agendamento?: Agendamento): boolean {
    return !!agendamento && (
      agendamento.militar?.saram === this.saramUsuario ||
      agendamento.militar?.id === this.idMilitarLogado
    );
  }
  

  isAgendamentoDeOutroUsuario(dia: string, hora: string): boolean {
    const agendamento = this.getAgendamentoParaDiaHora(dia, hora);
    return !!agendamento && !this.isAgendamentoDoMilitarLogado(agendamento);
  }

  getTextTooltip(agendamento: Agendamento | undefined): string { // Tooltip com dados do militar.
    if (!agendamento) {
      return "";
    }
    return `SARAM: ${agendamento.militar?.saram || 'Não informado'}\n` +
           `Nome: ${agendamento.militar?.nomeCompleto || 'Não informado'}\n` +
           `Email: ${agendamento.militar?.email || 'Não informado'}\n` +
           `OM: ${agendamento.militar?.om || 'Não informado'}\n` +
           `Seção: ${agendamento.militar?.secao || 'Não informado'}\n` +
           `Ramal: ${agendamento.militar?.ramal || 'Não informado'}`;
  }


  desabilitarTodosOsBotoes(): boolean {
    const desabilitadoPorHorario = this.desabilitarBotoesPorHorario();
    return desabilitadoPorHorario;
  }

  getAgendamentoParaDiaHora(dia: string, hora: string): Agendamento | undefined { //Retorna agendamento para dia/hora específicos.
    const diaSemana = dia.split(' - ')[0].trim().toLowerCase();
    const horaFormatada = hora.slice(0, 5);
    const agendamento = this.agendamentos.find((agendamento) => {
      const diaMatch = agendamento.diaSemana.toLowerCase() === diaSemana;
      const horaAgendamentoFormatada = agendamento.hora.slice(0, 5);
      const horaMatch = horaAgendamentoFormatada === horaFormatada;
      return diaMatch && horaMatch;
    });
    return agendamento;
  }

  getHorarioStatus(dia: string, hora: string): { cor: string, texto: string, acao: string } {
    const agendamento = this.getAgendamentoParaDiaHora(dia, hora);
    
    if (agendamento) {
      if (this.isAgendamentoDoMilitarLogado(agendamento)) {
        return { cor: "accent", texto: "Agendado", acao: "cancelar" };
      }
      return { cor: "basic", texto: "Agendado", acao: "ocupado" };
    }

    const diaSemanaFormatado = dia.split(" - ")[0].trim().toLowerCase();
    const statusHorario = this.horariosPorDia[diaSemanaFormatado]?.find(h => h.horario === hora)?.status?.toUpperCase();

    if (statusHorario === "DISPONIVEL") {
      return { cor: "primary", texto: "Disponível", acao: "agendar" };
    }

    if (statusHorario === "AGENDADO") {
      return { cor: "basic", texto: "Agendado", acao: "ocupado" };
    }

    return { cor: "disabled", texto: "Indisponível", acao: "nenhuma" };
  }


  private loadMilitares(categoria: string) {
    this.militarService.getMilitaresByCategoria(categoria).subscribe(data => {
      if (categoria === 'OFICIAL') {
        this.oficiais = data;
      } else if (categoria === 'GRADUADO') {
        this.graduados = data;
      }
    });
  }

  private desabilitarBotoesPorHorario(): boolean {
    const now = new Date(Date.now() + this.timeOffsetMs);
    const dayOfWeek = now.getDay();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    const startHour = 9;
    const startMinute = 10;
    const endHour = 18;
    const endMinute = 10;

    const INICIO_EXPEDIENTE = startHour * 60 + startMinute;
    const FIM_EXPEDIENTE = endHour * 60 + endMinute;

    const horariosPorDia: Record<number, { inicio: number; fim: number }> = {
      1: { inicio: INICIO_EXPEDIENTE, fim: FIM_EXPEDIENTE },
      2: { inicio: INICIO_EXPEDIENTE, fim: FIM_EXPEDIENTE },
      3: { inicio: INICIO_EXPEDIENTE, fim: FIM_EXPEDIENTE },
      4: { inicio: INICIO_EXPEDIENTE, fim: FIM_EXPEDIENTE },
      5: { inicio: INICIO_EXPEDIENTE, fim: FIM_EXPEDIENTE }
    };

    const janela = horariosPorDia[dayOfWeek];

    if (janela) {
      const minutosAtuais = hours * 60 + minutes;
      if (minutosAtuais >= janela.inicio && minutosAtuais <= janela.fim) {
        this.feedbackMessageTitle = '';
        return false;
      }
    }

    this.feedbackMessageTitle =
      'Só é possível agendar entre 9h10 e 18h10 de segunda a sexta. Aguarde!';
    return true;
  }

  private getNomeDeGuerraMilitarLogado(): string {
    this.userService.userData$.subscribe(data => {
      this.militarLogado = data[0].nomeDeGuerra;
    });
    return this.militarLogado;
  }

  private getOmMilitarLogado(): string {
    this.userService.userData$.subscribe(data => {
      this.omMilitar = data[0].om;
    });
    return this.omMilitar;
  }

  private setDiasSemanaAtual() {
    const hoje = new Date();
    const diaSemanaAtual = hoje.getDay();

    this.inicioDaSemana = new Date(hoje);
    this.inicioDaSemana.setDate(hoje.getDate() - ((diaSemanaAtual + 6) % 7));

    this.fimDaSemana = new Date(this.inicioDaSemana);
    this.fimDaSemana.setDate(this.inicioDaSemana.getDate() + 4); // sexta

    this.diasComData = [];
    for (let i = 0; i < 5; i++) {
      const dia = new Date(this.inicioDaSemana);
      dia.setDate(this.inicioDaSemana.getDate() + i);
      const nomeDia = this.diasDaSemana[i];
      const dataFormatada = `${dia.getDate().toString().padStart(2, '0')}/${(dia.getMonth() + 1).toString().padStart(2, '0')}`;
      this.diasComData.push(`${nomeDia} - ${dataFormatada}`);
    }
  }
  
  isAgendamentoDesmarcavel(agendamento?: Agendamento): boolean {
    return !!agendamento && this.isAgendamentoDoMilitarLogado(agendamento);
  }
  
  abrirModalAgendamento(agendamento: Agendamento): void {
    this.dialog.open(DialogoAgendamentoComponent, {
      width: '500px',
      data: agendamento
    });
  }
  
  private obterDiaEMes(diaSemana: string): { dia: string, mes: string } {
    const partes = diaSemana.split(' - ')[1].split('/');
    const dia = partes[0];
    const mes = partes[1];
    return { dia, mes };
  }

  getDataFromDiaSemana(diaSemanaComData: string): string {
    const partes = diaSemanaComData.split(' - ');
    if (partes.length < 2) return ''; // segurança
  
    const [_, dataStr] = partes; // exemplo: "03/06"
    const [dia, mes] = dataStr.split('/').map(Number);
    const anoAtual = new Date().getFullYear();
    const data = new Date(anoAtual, mes - 1, dia);
  
    return data.toISOString().split('T')[0]; // "yyyy-MM-dd"
  }

  trackByIndex(index: number, _item: any): number {
    return index;
  }

  trackByHora(_index: number, hora: string): string {
    return hora;
  }

  trackByDia(_index: number, dia: string): string {
    return dia;
  }

  trackByAgendamento(_index: number, agendamento: Agendamento): any {
    return agendamento.id ?? `${agendamento.diaSemana}-${agendamento.hora}`;
  }

  ngOnDestroy(): void {
    this.userDataSubscription?.unsubscribe();
    this.horariosSub?.unsubscribe();
    this.horariosService.stopPollingHorarios();
  }

}

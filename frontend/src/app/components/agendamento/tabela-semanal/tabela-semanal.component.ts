import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { HorariosService } from 'src/app/services/horarios.service';
import { HorariosPorDia, SlotHorario } from 'src/app/models/slot-horario';
import { BehaviorSubject, EMPTY, Observable, Subject, combineLatest, merge, of, timer } from 'rxjs';
import { animate, style, transition, trigger } from '@angular/animations';
import { catchError, distinctUntilChanged, filter, map, mergeMap, retryWhen, shareReplay, switchMap, take, takeUntil, tap, timeout, withLatestFrom } from 'rxjs/operators';
import { throwError } from 'rxjs';

import { Agendamento } from 'src/app/models/agendamento';
import { AgendamentoService } from 'src/app/services/agendamento.service';
import { AuthService } from 'src/app/services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { DialogoAgendamentoComponent } from '../dialogo-agendamento/dialogo-agendamento.component';
import { DialogoDetalhesAgendamentoComponent } from '../dialogo-detalhes-agendamento/dialogo-detalhes-agendamento.component';
import { LoggingService } from 'src/app/services/logging.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Militar } from 'src/app/models/militar';
import { MilitarService } from 'src/app/services/militar.service';
import { Router } from '@angular/router';
import { ServerTimeService } from 'src/app/services/server-time.service';
import { UserService } from 'src/app/services/user.service';
import { ConfiguracoesAgendamentoService } from 'src/app/services/configuracoes-agendamento.service';
import { ErrorMessagesService } from 'src/app/services/error-messages.service';
import { DIA_SEMANA, DIA_LABEL_MAP, normalizeDia, DiaKey } from 'src/app/shared/dias.util';
import { SNACKBAR_DURATION } from 'src/app/utils/ui-constants';
import { normalizeHora } from 'src/app/utils/horarios-utils';
import { UserData } from 'src/app/models/user-data';


@Component({
  selector: 'app-tabela-semanal',
  templateUrl: './tabela-semanal.component.html',
  styleUrls: ['./tabela-semanal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  @Input() horariosPorDia: HorariosPorDia = {
    segunda: [],
    terca: [],
    quarta: [],
    quinta: [],
    sexta: [],
  };
  @Input() saramUsuario!: string;
  @Input() idMilitarLogado: number | null | undefined;

  oficiais: Militar[] = [];
  graduados: Militar[] = [];
  militarLogado: string = '';
  omMilitar: string = '';
  cpfMilitarLogado: string = '';
  postos: string[] = ['AP', '2T', '1T', 'CP', 'MJ', 'TC', 'CL', 'BG', 'MB', 'TB'];
  graduacoes = ['S2', 'S1', 'CB', '3S', '2S', '1S', 'SO'];

  agendamentos: Agendamento[] = [];
  inicioDaSemana!: Date;
  fimDaSemana!: Date;
  readonly diaLabelMap: Record<DiaKey, string> = DIA_LABEL_MAP;
  diasDaSemana: DiaKey[] = Object.keys(DIA_SEMANA) as DiaKey[];
  diasComData: string[] = []; // datas correspondentes
  horariosBaseSemana: string[] = [];
  feedbackMessageTitle: string = '';
  timeOffsetMs: number = 0;
  usuarioCarregado = false;
  horariosCarregados = false;
  agendamentoBloqueado = false;
  private storageKey: string = '';
  private desbloqueioTimeout?: any;
  private avisoBloqueioMostrado = false;

  private inicioJanelaMin: number = 0;
  private fimJanelaMin: number = 24 * 60;
  private inicioAgendavelMin: number = 0;
  private fimAgendavelMin: number = 24 * 60;
  private horariosBaseConfiguracao: string[] = [];
  private readonly MS_PER_DAY = 24 * 60 * 60 * 1000;

  private readonly destroy$ = new Subject<void>();
  private readonly categoriaSubject = new BehaviorSubject<string>('');
  private readonly reloadHorarios$ = new Subject<void>();
  private horariosPipelineInitialized = false;

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
    private cdr: ChangeDetectorRef,
    private configuracoesService: ConfiguracoesAgendamentoService,
    private errorMessages: ErrorMessagesService
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
          this.logger.log(
            `Agendamentos carregados da chave ${this.storageKey}:`,
            this.agendamentos.length
          );
        } catch (e) {
          this.logger.error('Erro ao carregar agendamentos do storage:', e);
          this.agendamentos = [];
        }
      }
    }

  }

  private isHorariosPayloadValido(payload: HorariosPorDia | null | undefined): payload is HorariosPorDia {
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    return Object.keys(payload).length > 0;
  }

  private toMinutes(hora: string): number {
    const normalizada = normalizeHora(hora);
    const [hStr = '0', mStr = '0'] = normalizada.split(':');
    const horas = Number.parseInt(hStr, 10);
    const minutos = Number.parseInt(mStr, 10);
    const horasValidas = Number.isFinite(horas) ? horas : 0;
    const minutosValidos = Number.isFinite(minutos) ? minutos : 0;
    return horasValidas * 60 + minutosValidos;
  }

  private carregarConfiguracao(): void {
    this.configuracoesService.getConfig().subscribe({
      next: ({ horarioInicio, horarioFim }) => {
        const inicioNormalizado = normalizeHora(horarioInicio);
        const fimNormalizado = normalizeHora(horarioFim);

        this.inicioJanelaMin = this.toMinutes(inicioNormalizado);
        this.fimJanelaMin = this.toMinutes(fimNormalizado);
        this.inicioAgendavelMin = this.inicioJanelaMin;
        this.fimAgendavelMin = this.fimJanelaMin;
        this.aplicarJanelaHorarios();
        this.desabilitarTodosOsBotoes();
      },
      error: err => this.logger.error('Erro ao carregar janela de horários:', err)
    });
  }

  private aplicarJanelaHorarios(): void {
    const dias = Object.keys(this.horariosPorDia) as DiaKey[];
    const atualizados: HorariosPorDia = { ...this.horariosPorDia };

    dias.forEach(dia => {
      const slots = (this.horariosPorDia[dia] || []).map(slot => ({
        ...slot,
        horario: normalizeHora(slot.horario)
      })).filter(slot => this.isHoraAgendavel(slot.horario));

      atualizados[dia] = slots;
    });

    this.horariosPorDia = atualizados;
    this.atualizarHorariosBaseSemana();
    this.cdr.markForCheck();
  }

  private atualizarHorariosBaseSemana(): void {
    const todosHorarios = new Set<string>();
    const adicionar = (hora?: string) => {
      const normalizado = normalizeHora(hora);
      if (normalizado) {
        todosHorarios.add(normalizado);
      }
    };

    (this.horariosBaseConfiguracao || []).forEach(adicionar);

    (Object.keys(this.horariosPorDia) as DiaKey[]).forEach(dia => {
      (this.horariosPorDia[dia] || []).forEach(slot => adicionar(slot.horario));
    });

    const filtrados = Array.from(todosHorarios).filter(h => this.isHoraAgendavel(h));
    this.horariosBaseSemana = this.ordenarHorarios(filtrados);
    this.cdr.markForCheck();
  }

  isHoraAgendavel(hora: string): boolean {
    const m = this.toMinutes(hora);
    return m >= this.inicioJanelaMin && m <= this.fimJanelaMin;
  }

  ngOnInit(): void {
    const usuario = this.authService.getUsuarioAutenticado();
    this.idMilitarLogado = usuario?.id ?? null;
    if (usuario?.cpf) {
      this.storageKey = `agendamentos-${usuario.cpf}`;
      this.cdr.markForCheck();
    }

    this.carregarConfiguracao();

    this.configuracoesService.recarregarGrade$
      .pipe(takeUntil(this.destroy$))
      .subscribe(cat => {
        if (cat === this.categoria) {
          this.carregarConfiguracao();
          this.loadHorariosBase();
          this.triggerHorariosReload();
        }
      });

    this.serverTimeService.getServerTime()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.timeOffsetMs = res.timestamp - Date.now();
          if (Math.abs(this.timeOffsetMs) > 60 * 1000) {
            this.snackBar.open('Atenção: horário do dispositivo diferente do servidor.', 'Ciente', { duration: 5000 });
          }
          this.initAfterTime();
          this.desabilitarTodosOsBotoes();
        },
        error: err => {
          this.logger.error('Erro ao obter hora do servidor:', err);
          this.initAfterTime();
          this.desabilitarTodosOsBotoes();
        }
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['categoria'] && !changes['categoria'].firstChange) {
      this.categoriaSubject.next(this.categoria);
      this.triggerHorariosReload();
    }
    this.cdr.markForCheck();
  }

  // Define a chave de armazenamento baseada no CPF do usuário
  // e carrega os agendamentos salvos para ele.
  private initAfterTime(): void {
    const fallback = this.authService.getUsuarioAutenticado();

    const usuario$ = this.userService.userData$
      .pipe(
        timeout(5000),
        catchError(err => {
          this.logger.error('Erro ou timeout ao obter dados do usuário:', err);
          return of([]);
        }),
        map(userData => {
          if (userData && userData.length > 0) {
            return userData[0];
          }
          return fallback ?? null;
        }),
        tap(usuario => {
          if (!usuario) {
            this.logger.warn('Dados de usuário indisponíveis. Usando dados de fallback.');
          }
          this.handleUsuarioContext(usuario);
        }),
        shareReplay({ bufferSize: 1, refCount: true })
      ) as Observable<UserData | Militar | null>;

    this.setupHorariosPipeline(usuario$);

    usuario$
      .pipe(take(1))
      .subscribe(() => {
        this.logger.log('🔐 userData carregado. Inicializando carregamento reativo.');
        this.loadAllData();
      });
  }

  private loadAllData() {  //Chama todos os load*() necessários.
    if (this.isCurrentRoute('/graduados')) {
      this.categoria = 'GRADUADO';
    } else if (this.isCurrentRoute('/oficiais')) {
      this.categoria = 'OFICIAL';
    }

    this.categoriaSubject.next(this.categoria);
    this.carregarConfiguracao();
    this.horariosCarregados = false;
    this.cdr.markForCheck();

    this.horariosService.startPollingHorarios(this.categoria, () => this.triggerHorariosReload());

    this.desabilitarTodosOsBotoes();
    this.setDiasSemanaAtual();
    this.loadHorariosBase();
    this.loadMilitares(this.categoria);
    this.loadAgendamentos();
  }

  private setupHorariosPipeline(usuario$: Observable<UserData | Militar | null>): void {
    if (this.horariosPipelineInitialized) {
      return;
    }
    this.horariosPipelineInitialized = true;

    const categoria$ = this.categoriaSubject.asObservable().pipe(
      filter((categoria): categoria is string => !!categoria),
      map(categoria => categoria.toUpperCase()),
      distinctUntilChanged()
    );

    const parametros$ = combineLatest([categoria$, usuario$]).pipe(
      tap(() => {
        this.horariosCarregados = false;
        this.cdr.markForCheck();
      }),
      map(([categoria]) => categoria),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    merge(
      parametros$,
      this.reloadHorarios$.pipe(withLatestFrom(parametros$), map(([, categoria]) => categoria))
    )
      .pipe(
        switchMap(categoria =>
          this.horariosService.carregarHorariosDaSemana(categoria).pipe(
            retryWhen(errors =>
              errors.pipe(
                mergeMap((error: HttpErrorResponse, attempt) => {
                  if ([401, 404].includes(error.status) && attempt < 3) {
                    this.logger.warn('Falha ao carregar horários, tentando novamente...', error);
                    return timer(1000 * (attempt + 1));
                  }
                  return throwError(() => error);
                })
              )
            ),
            tap(horarios => this.handleHorariosResponse(horarios)),
            catchError(error => {
              this.logger.error('Erro ao carregar horários da semana:', error);
              this.horariosCarregados = false;
              this.cdr.markForCheck();
              return EMPTY;
            })
          )
        ),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  private handleUsuarioContext(usuario: UserData | Militar | null): void {
    if (usuario?.cpf) {
      const newKey = `agendamentos-${usuario.cpf}`;
      if (this.storageKey && this.storageKey !== newKey) {
        sessionStorage.removeItem(this.storageKey);
        this.agendamentos = [];
      }
      this.storageKey = newKey;
      this.loadAgendamentosFromStorage();
    }

    this.militarLogado = usuario?.nomeDeGuerra || '';
    this.omMilitar = usuario?.om || '';
    this.cpfMilitarLogado = usuario?.cpf || '';
    this.idMilitarLogado = usuario?.id ?? null;

    this.usuarioCarregado = true;
    this.cdr.markForCheck();
  }

  private triggerHorariosReload(): void {
    this.horariosCarregados = false;
    this.cdr.markForCheck();
    this.reloadHorarios$.next();
  }

  private handleHorariosResponse(horarios: HorariosPorDia): void {
    if (!this.isHorariosPayloadValido(horarios)) {
      this.horariosCarregados = false;
      this.cdr.markForCheck();
      return;
    }

    this.horariosPorDia = horarios;
    this.aplicarJanelaHorarios();
    this.horariosService.atualizarHorarios(this.horariosPorDia);
    this.horariosCarregados = true;
    this.logger.log('Horários atualizados:', this.horariosPorDia);
    this.cdr.markForCheck();
  }

  getLabelDiaComData(dia: string): string {
    const diaKey = normalizeDia(dia);
    const index = this.diasDaSemana.findIndex(d => d === diaKey);
    const label = this.diaLabelMap[diaKey] || dia;
    const data = this.diasComData[index] || '';
    return `${label} - ${data}`;
  }
  
  abrirDialogoAgendamento(diaSemana: string, hora: string) {
    const diaSemanaFormatado: DiaKey = normalizeDia(diaSemana.split(' - ')[0]);
    const horarioDisponivel = this.horariosPorDia[diaSemanaFormatado]?.some(
      h => h.horario === hora && h.status === 'DISPONIVEL'
    );

    if (!horarioDisponivel) {
      this.snackBar.open('Horário não disponivel para sua categoria.', 'Ciente', { duration: SNACKBAR_DURATION });
      return;
    }

    if (!this.podeAgendarNovamente(diaSemanaFormatado, hora)) {
      this.snackBar.open(this.errorMessages.AGENDAMENTO_INTERVAL_ERROR, 'Ciente', { duration: SNACKBAR_DURATION });
      return;
    }

    const dataStr = this.getDataFromDiaSemana(diaSemana);
    const [dia, mes, ano] = dataStr.split('/').map(Number);
    const [horaNum, minutoNum] = hora.slice(0, 5).split(':').map(Number);
    const agendamentoDate = new Date(ano, mes - 1, dia, horaNum, minutoNum);
    const diffMs = agendamentoDate.getTime() - (Date.now() + this.timeOffsetMs);
    const primeiroHorario = this.getPrimeiroHorarioConfigurado();
    const horaNormalizada = normalizeHora(hora);
    const primeiroHorarioNormalizado = primeiroHorario ? normalizeHora(primeiroHorario) : '';
    const isPrimeiroHorario = primeiroHorarioNormalizado !== '' && horaNormalizada === primeiroHorarioNormalizado;
    const isSegunda = diaSemanaFormatado === 'segunda';
    const dentroJanelaAntecedencia = diffMs < 30 * 60 * 1000;

    if (dentroJanelaAntecedencia && !(isSegunda && isPrimeiroHorario)) {
      this.snackBar.open('O agendamento precisa ser feito com no mínimo 30 minutos de antecedência.', 'Ciente', { duration: SNACKBAR_DURATION });
      return;
    }

    const dialogRef = this.dialog.open(DialogoAgendamentoComponent, {
      width: '500px',
      data: {
        data: dataStr,
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
    ).subscribe((result: { sucesso?: boolean; payload?: Agendamento; mensagem?: string } | null) => {
      if (result?.sucesso && result.payload) {
        const agendamento = result.payload;
        this.logger.log('Dados recebidos do diálogo:', agendamento);
        this.agendamentos.push(agendamento);
        this.agendamentos = [...this.agendamentos];
        this.logger.log('Agendamentos atualizados:', this.agendamentos);

        if (this.horariosPorDia[diaSemanaFormatado]) {
          const horarioIndex = this.horariosPorDia[diaSemanaFormatado].findIndex(h => h.horario === hora);
          if (horarioIndex !== -1) {
            this.horariosPorDia[diaSemanaFormatado][horarioIndex].status = 'AGENDADO';
            this.horariosPorDia[diaSemanaFormatado][horarioIndex].usuarioId = agendamento.militar?.id;
            this.horariosPorDia = { ...this.horariosPorDia };
          }
        }

        this.saveAgendamentos();
        // Recarrega os horários para refletir o novo agendamento
        this.triggerHorariosReload();
      } else if (result && result.sucesso === false) {
        const message = (result as any).mensagem || (result as any).message || 'Falha ao realizar agendamento.';
        this.snackBar.open(message, 'Ciente', { duration: SNACKBAR_DURATION });
      }
    });
  }

  private loadAgendamentos() { //Carrega os agendamentos e associa ao usuário logado.
    this.agendamentoService.getAgendamentos().pipe(
      tap(agendamentos => {
        if (agendamentos && agendamentos.length > 0) {
          const agendamentosFiltrados = agendamentos.filter(agendamento =>
            this.isAgendamentoDoMilitarLogado(agendamento) &&
            agendamento.status === 'AGENDADO'
          );

          this.agendamentos = agendamentosFiltrados.map(agendamento => ({
            ...agendamento,
            diaSemana: normalizeDia(agendamento.diaSemana.trim()),
            hora: agendamento.hora.trim()
          }));
          this.saveAgendamentos();
        } else {
          this.agendamentos = [];
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
    this.configuracoesService.getConfig().subscribe({
      next: config => {
        const inicioNormalizado = normalizeHora(config.horarioInicio);
        const fimNormalizado = normalizeHora(config.horarioFim);

        const [inicioHora = 0, inicioMin = 0] = inicioNormalizado.split(':').map(v => Number.parseInt(v, 10));
        const [fimHora = 0, fimMin = 0] = fimNormalizado.split(':').map(v => Number.parseInt(v, 10));

        const inicio = new Date();
        inicio.setHours(Number.isFinite(inicioHora) ? inicioHora : 0, Number.isFinite(inicioMin) ? inicioMin : 0, 0, 0);
        const fim = new Date();
        fim.setHours(Number.isFinite(fimHora) ? fimHora : 0, Number.isFinite(fimMin) ? fimMin : 0, 0, 0);

        const slots: string[] = [];
        for (let t = new Date(inicio); t <= fim; t = new Date(t.getTime() + 30 * 60 * 1000)) {
          const hh = t.getHours().toString().padStart(2, '0');
          const mm = t.getMinutes().toString().padStart(2, '0');
          slots.push(`${hh}:${mm}`);
        }

        this.horariosBaseConfiguracao = slots.map(h => normalizeHora(h));
        this.atualizarHorariosBaseSemana();
        this.cdr.markForCheck();
      },
      error: err => {
        this.logger.error('Erro ao carregar os horários base:', err);
      }
    });
  }

  private ordenarHorarios(horarios: string[]): string[] {
    return [...horarios].sort((a, b) => this.toMinutes(normalizeHora(a)) - this.toMinutes(normalizeHora(b)));
  }

  loadHorariosDisponiveis() {
    this.horariosService.horariosPorDia$.subscribe(horarios => {
      this.horariosPorDia = horarios;
    });
  }

  isCurrentRoute(route: string): boolean {
    return this.router.url.includes(route);
  }
  handleClick(agendamento: Agendamento | undefined, diaKey: DiaKey, hora: string): void {
    if (agendamento) {
      const podeDesmarcar =
        this.isAgendamentoDoMilitarLogado(agendamento) &&
        this.isAgendamentoDesmarcavel(agendamento, agendamento.diaSemana, agendamento.hora);
      const dialogRef = this.dialog.open(DialogoDetalhesAgendamentoComponent, {
        width: '400px',
        data: { agendamento, podeDesmarcar }
      });

      dialogRef.afterClosed().subscribe((resultado: any) => {
        if (resultado && resultado !== true && resultado.id) {
          // atualização
          const index = this.agendamentos.findIndex(a => a.id === resultado.id);
          if (index !== -1) {
            this.agendamentos[index] = resultado;
            this.agendamentos = [...this.agendamentos];
          }
          const diaFormatoAntigo: DiaKey = normalizeDia(agendamento.diaSemana);
          const horaAntiga = agendamento.hora.slice(0,5);
          const idx = this.horariosPorDia[diaFormatoAntigo]?.findIndex(h => h.horario === horaAntiga);
          if (idx !== undefined && idx !== -1) {
            this.horariosPorDia[diaFormatoAntigo][idx].status = 'DISPONIVEL';
            this.horariosPorDia[diaFormatoAntigo][idx].usuarioId = undefined;
          }
          const diaNovo: DiaKey = normalizeDia(resultado.diaSemana);
          const horaNova = resultado.hora.slice(0,5);
          const idxNovo = this.horariosPorDia[diaNovo]?.findIndex(h => h.horario === horaNova);
          if (idxNovo !== undefined && idxNovo !== -1) {
            this.horariosPorDia[diaNovo][idxNovo].status = 'AGENDADO';
            this.horariosPorDia[diaNovo][idxNovo].usuarioId = resultado.militar?.id;
          }
          this.horariosPorDia = { ...this.horariosPorDia };
          this.saveAgendamentos();
        } else if (resultado === true && agendamento.id) {
          this.agendamentos = this.agendamentos.filter(a => a.id !== agendamento.id);
          const diaSemanaFormatado: DiaKey = normalizeDia(agendamento.diaSemana);
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
        }
      });
      return;
    }

    if (!this.podeAgendarNovamente(diaKey, hora)) {
      this.snackBar.open(this.errorMessages.AGENDAMENTO_INTERVAL_ERROR, 'Ciente', { duration: SNACKBAR_DURATION });
      return;
    }

    const labelDia = this.getLabelDiaComData(diaKey);
    this.abrirDialogoAgendamento(labelDia, hora);
  }

  isAgendamentoDoMilitarLogado(agendamento?: Agendamento): boolean {
    const saramAgendamento = agendamento?.usuarioSaram || agendamento?.militar?.saram;
    return !!agendamento && saramAgendamento === this.saramUsuario;
  }


  isAgendamentoDeOutroUsuario(dia: string, hora: string): boolean {
    const agendamento = this.getAgendamentoParaDiaHora(dia, hora);
    return !!agendamento && !this.isAgendamentoDoMilitarLogado(agendamento);
  }

  deveDestacarSlot(slot: SlotHorario, dia: string, hora: string): boolean {
    if (!slot || slot.status !== 'AGENDADO') {
      return false;
    }

    if (slot.usuarioId != null && this.idMilitarLogado != null && slot.usuarioId === this.idMilitarLogado) {
      return true;
    }

    return this.isAgendamentoDoMilitarLogado(this.getAgendamentoParaDiaHora(dia, hora));
  }

  getTextTooltip(agendamento: Agendamento | undefined): string { // Tooltip com dados do militar.
    if (!agendamento) {
      return "";
    }
    return `SARAM: ${agendamento.militar?.saram || 'Não informado'}\n` +
           `Nome: ${agendamento.militar?.nomeDeGuerra || 'Não informado'}\n` +
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
    const diaSemana = normalizeDia(dia.split(' - ')[0]);
    const horaFormatada = hora.slice(0, 5);
    const agendamento = this.agendamentos.find((agendamento) => {
      const diaMatch = normalizeDia(agendamento.diaSemana) === diaSemana;
      const horaAgendamentoFormatada = agendamento.hora.slice(0, 5);
      const horaMatch = horaAgendamentoFormatada === horaFormatada;
      return diaMatch && horaMatch;
    });
    return agendamento;
  }

  getSlot(dia: DiaKey, hora: string): SlotHorario | null {
    const list: SlotHorario[] = this.horariosPorDia?.[dia] || [];
    const hh = (hora || '').trim();
    return list.find?.((h: SlotHorario) => (h?.horario || '').trim() === hh) || null;
  }

  podeInteragirComSlot(slot: SlotHorario, dia: DiaKey, hora: string): boolean {
    if (!slot) {
      return false;
    }

    if (this.agendamentoBloqueado) {
      return false;
    }

    if (slot.status === 'INDISPONIVEL') {
      return false;
    }

    if (slot.status === 'AGENDADO') {
      return this.isSlotDoUsuario(slot, dia, hora);
    }

    if (slot.status === 'DISPONIVEL') {
      return this.podeAgendarNovamente(dia, hora);
    }

    return false;
  }

  private isSlotDoUsuario(slot: SlotHorario, dia: DiaKey, hora: string): boolean {
    if (slot.usuarioId != null && this.idMilitarLogado != null) {
      return slot.usuarioId === this.idMilitarLogado;
    }

    return this.isAgendamentoDoMilitarLogado(this.getAgendamentoParaDiaHora(dia, hora));
  }

  private getUltimaDataAgendada(): Date | null {
    if (!this.agendamentos || this.agendamentos.length === 0) {
      return null;
    }

    const datas = this.agendamentos
      .map(agendamento => this.getDataHoraAgendamento(agendamento))
      .filter((data): data is Date => data instanceof Date);

    if (datas.length === 0) {
      return null;
    }

    datas.sort((a, b) => b.getTime() - a.getTime());
    return datas[0];
  }

  private getDataHoraAgendamento(agendamento: Agendamento): Date | null {
    if (agendamento.timestamp) {
      return new Date(agendamento.timestamp);
    }

    const dataBase = this.parseDataString(agendamento.data);
    if (!dataBase) {
      return null;
    }

    const horaNormalizada = normalizeHora(agendamento.hora);
    if (horaNormalizada) {
      const [hora, minuto] = horaNormalizada.split(':').map(Number);
      dataBase.setHours(hora, minuto, 0, 0);
    }

    return dataBase;
  }

  private parseDataString(data?: string | null): Date | null {
    if (!data) {
      return null;
    }

    const isoPattern = /^(\d{4})-(\d{2})-(\d{2})$/;
    const brPattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;

    if (isoPattern.test(data)) {
      const [, ano, mes, dia] = data.match(isoPattern) ?? [];
      if (ano && mes && dia) {
        const date = new Date(Number(ano), Number(mes) - 1, Number(dia));
        date.setHours(0, 0, 0, 0);
        return date;
      }
    }

    if (brPattern.test(data)) {
      const [, dia, mes, ano] = data.match(brPattern) ?? [];
      if (ano && mes && dia) {
        const date = new Date(Number(ano), Number(mes) - 1, Number(dia));
        date.setHours(0, 0, 0, 0);
        return date;
      }
    }

    return null;
  }

  private getDateForDia(dia: DiaKey): Date | null {
    if (!this.inicioDaSemana) {
      return null;
    }

    const index = this.diasDaSemana.indexOf(dia);
    if (index === -1) {
      return null;
    }

    const base = new Date(this.inicioDaSemana);
    base.setHours(0, 0, 0, 0);
    base.setDate(base.getDate() + index);
    return base;
  }

  private calcularDiferencaDias(base: Date, comparacao: Date): number {
    const dataBase = new Date(base);
    const dataComparacao = new Date(comparacao);
    dataBase.setHours(0, 0, 0, 0);
    dataComparacao.setHours(0, 0, 0, 0);
    return Math.floor((dataComparacao.getTime() - dataBase.getTime()) / this.MS_PER_DAY);
  }

  private getDateForSlot(dia: DiaKey, hora: string): Date | null {
    const dataDia = this.getDateForDia(dia);
    if (!dataDia) {
      return null;
    }

    const horaNormalizada = normalizeHora(hora);
    if (!horaNormalizada) {
      return null;
    }

    const [hh, mm] = horaNormalizada.split(':').map(Number);
    const resultado = new Date(dataDia);
    resultado.setHours(hh, mm, 0, 0);
    return resultado;
  }

  private podeAgendarNovamente(dia: DiaKey, hora: string): boolean {
    const ultimaData = this.getUltimaDataAgendada();
    if (!ultimaData) {
      return true;
    }

    const novaData = this.getDateForSlot(dia, hora);
    if (!novaData) {
      return true;
    }

    const diffDias = this.calcularDiferencaDias(ultimaData, novaData);
    return diffDias >= 15;
  }

  private getPrimeiroHorarioConfigurado(): string | null {
    if (this.horariosBaseConfiguracao.length > 0) {
      return normalizeHora(this.horariosBaseConfiguracao[0]);
    }

    if (this.horariosBaseSemana.length > 0) {
      return normalizeHora(this.horariosBaseSemana[0]);
    }

    if (this.inicioJanelaMin > 0) {
      return this.formatHora(this.inicioJanelaMin);
    }

    return null;
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
    clearTimeout(this.desbloqueioTimeout);

    const now = new Date(Date.now() + this.timeOffsetMs);
    const dayOfWeek = now.getDay();
    const minutosAtuais = now.getHours() * 60 + now.getMinutes();

    const inicioExpediente = this.inicioJanelaMin;
    const fimExpediente = this.fimJanelaMin;
    const primeiroHorario = this.getPrimeiroHorarioConfigurado();
    const primeiroHorarioMin = primeiroHorario ? this.toMinutes(primeiroHorario) : inicioExpediente;

    const isSegunda = dayOfWeek === 1;
    const inicioLiberadoSegunda = Math.max(0, primeiroHorarioMin - 30);
    const inicioLiberadoGeral = inicioExpediente;

    const diaUtil = dayOfWeek >= 1 && dayOfWeek <= 5;
    const liberacaoSegunda = isSegunda && minutosAtuais >= inicioLiberadoSegunda && minutosAtuais < inicioLiberadoGeral;
    const liberacaoNormal = minutosAtuais >= inicioLiberadoGeral && minutosAtuais <= fimExpediente;

    if (diaUtil && (liberacaoSegunda || liberacaoNormal)) {
      this.feedbackMessageTitle = '';
      this.agendamentoBloqueado = false;
      this.avisoBloqueioMostrado = false;
      return false;
    }

    this.agendamentoBloqueado = true;

    const proximoLiberado = isSegunda ? inicioLiberadoSegunda : inicioLiberadoGeral;

    if (minutosAtuais < proximoLiberado) {
      const hh = Math.floor(proximoLiberado / 60).toString().padStart(2, '0');
      const mm = (proximoLiberado % 60).toString().padStart(2, '0');
      this.feedbackMessageTitle = isSegunda
        ? `Agendamento do primeiro horário de segunda liberado a partir das ${hh}:${mm}.`
        : `Agendamentos disponíveis a partir das ${hh}:${mm}.`;
      const ms = (proximoLiberado - minutosAtuais) * 60 * 1000;
      this.desbloqueioTimeout = setTimeout(() => this.desabilitarBotoesPorHorario(), ms);
    } else {
      const inicioStr = this.formatHora(inicioExpediente);
      const fimStr = this.formatHora(fimExpediente);
      this.feedbackMessageTitle = `Só é possível agendar entre ${inicioStr} e ${fimStr} de segunda a sexta. Aguarde!`;
    }

    if (!this.avisoBloqueioMostrado) {
      this.snackBar.open(this.feedbackMessageTitle, 'Ciente', { duration: 5000 });
      this.avisoBloqueioMostrado = true;
    }

    return true;
  }

  private formatHora(totalMin: number): string {
    const hh = Math.floor(totalMin / 60).toString().padStart(2, '0');
    const mm = (totalMin % 60).toString().padStart(2, '0');
    return `${hh}:${mm}`;
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
      const dataFormatada = `${dia.getDate().toString().padStart(2, '0')}/${(dia.getMonth() + 1).toString().padStart(2, '0')}`;
      this.diasComData.push(dataFormatada);
    }
  }
  
  isAgendamentoDesmarcavel(
    agendamento?: Agendamento,
    dia?: string,
    hora?: string
  ): boolean {
    const agora = Date.now() + this.timeOffsetMs;

    if (agendamento) {
      if (!this.isAgendamentoDoMilitarLogado(agendamento)) {
        return false;
      }

      let timestamp: number | null = agendamento.timestamp ?? null;

      if (!timestamp && agendamento.data && agendamento.hora) {
        const horaFormatada = normalizeHora(agendamento.hora).substring(0, 5);
        let diaAg: number, mesAg: number, anoAg: number;

        if (agendamento.data.includes('-')) {
          [anoAg, mesAg, diaAg] = agendamento.data.split('-').map(Number);
        } else {
          [diaAg, mesAg, anoAg] = agendamento.data.split('/').map(Number);
        }

        const [horaAg, minutoAg] = horaFormatada.split(':').map(Number);
        timestamp = new Date(anoAg, mesAg - 1, diaAg, horaAg, minutoAg).getTime();
      }

      if (timestamp) {
        const diffMs = timestamp - agora;
        return diffMs >= 30 * 60 * 1000;
      }
    }

    if (!dia || !hora) {
      return false;
    }

    const diaKey: DiaKey = normalizeDia(dia.split(' - ')[0]);
    const usuarioId = this.horariosPorDia[diaKey]?.find(
      h => h.horario === hora
    )?.usuarioId;
    if (usuarioId !== this.idMilitarLogado) {
      return false;
    }

    const dataStr = this.getDataFromDiaSemana(dia);
    if (!dataStr) {
      return true;
    }
    const [diaNum, mesNum, anoNum] = dataStr.split('/').map(Number);
    const horaFormatada = normalizeHora(hora).substring(0, 5);
    const [horaNum, minutoNum] = horaFormatada.split(':').map(Number);
    const agendamentoDate = new Date(anoNum, mesNum - 1, diaNum, horaNum, minutoNum);
    const diffMs = agendamentoDate.getTime() - agora;
    return diffMs >= 30 * 60 * 1000;
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
    const pad = (n: number) => n.toString().padStart(2, '0');

    return `${pad(dia)}/${pad(mes)}/${anoAtual}`;
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.horariosService.stopPollingHorarios();
    clearTimeout(this.desbloqueioTimeout);
    this.horariosCarregados = false;
  }

}

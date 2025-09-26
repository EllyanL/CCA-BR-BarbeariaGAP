import { ActivatedRoute, Router } from '@angular/router';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ConfiguracaoAgendamento, ConfiguracoesAgendamentoService } from '../../services/configuracoes-agendamento.service';
import { HorariosService, AdicionarHorarioBaseResultado } from '../../services/horarios.service';
import { HorariosPorDia, SlotHorario } from '../../models/slot-horario';
import { Horario } from '../../models/horario';
import { HorarioDTO } from '../../models/horario-dto';
import { normalizeHora, normalizeHorariosPorDia } from '../../utils/horarios-utils';
import { SNACKBAR_DURATION } from '../../utils/ui-constants';
import { Observable, Subscription, from, of } from 'rxjs';
import { catchError, take, tap, timeout, retry } from 'rxjs/operators';
import { DIA_SEMANA, DIA_LABEL_MAP, normalizeDia, DiaKey } from '../../shared/dias.util';

import { Agendamento } from '../../models/agendamento';
import { AgendamentoService } from '../../services/agendamento.service';
import { AuthService } from '../../services/auth.service';
import { DialogoAgendamentoComponent } from 'src/app/components/agendamento/dialogo-agendamento/dialogo-agendamento.component';
import { DialogoCancelamentoComponent } from 'src/app/components/agendamento/dialogo-cancelamento/dialogo-cancelamento.component';
import { DialogoDetalhesAgendamentoComponent } from 'src/app/components/agendamento/dialogo-detalhes-agendamento/dialogo-detalhes-agendamento.component';
import { ConfirmarToggleDiaComponent } from 'src/app/components/confirmar-toggle-dia/confirmar-toggle-dia.component';
import { LoggingService } from 'src/app/services/logging.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Militar } from '../../models/militar';
import { ServerTimeService } from 'src/app/services/server-time.service';
import { UserService } from 'src/app/services/user.service';

@Component({
    selector: 'app-horarios',
    templateUrl: './horarios.component.html',
    styleUrls: ['./horarios.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
  })
  export class HorariosComponent implements OnInit, OnDestroy {
    public isAdmin: boolean = false;
    agendamentos: Agendamento[] = [];
    militarLogado: string = '';
    omMilitar: string = '';
    usuarioLogado: Militar | null = null;

    /** Mapa de chaves normalizadas para labels com acento */
  readonly diaLabelMap: Record<DiaKey, string> = DIA_LABEL_MAP;

    diasDaSemana: DiaKey[] = Object.keys(DIA_SEMANA) as DiaKey[];
    diasParaSelecao: (DiaKey | 'todos')[] = ['todos', ...this.diasDaSemana];
    horariosBasePorCategoria: Record<string, string[]> = {};
    horariosBaseSemana: string[] = [];
    diaSelecionado: DiaKey | 'todos' = 'segunda';
    horariosPorDia: HorariosPorDia = this.diasDaSemana.reduce((acc, dia) => {
      acc[dia] = [];
      return acc;
    }, {} as HorariosPorDia);
    horarioPersonalizado: string = '';
    horarioValido: boolean = false;
    categoriaSelecionada: string = 'GRADUADO';
    cpfUsuario: string = '';
    saramUsuario: string = '';
    timeOffsetMs: number = 0;
    configuracao?: ConfiguracaoAgendamento;
    private userDataSubscription?: Subscription;
    private horariosSub?: Subscription;
    private agendamentoAtualizadoSub?: Subscription;
    private recarregarGradeSub?: Subscription;
    private carregarHorariosDaSemanaSub?: Subscription;
    private carregarAgendamentosSub?: Subscription;
    private storageKey: string = '';

    private inicioJanelaMin: number = 0;
    private fimJanelaMin: number = 24 * 60;
    private inicioAgendavelMin: number = 0;
    private fimAgendavelMin: number = 24 * 60;

    constructor(
      private horariosService: HorariosService,
      private dialog: MatDialog,
      private authService: AuthService,
      private snackBar: MatSnackBar,
      private route: ActivatedRoute,
      private cdr: ChangeDetectorRef,
      private router: Router,
      private agendamentoService: AgendamentoService,
      private userService: UserService,
      private serverTimeService: ServerTimeService,
      private logger: LoggingService,
      private configuracoesService: ConfiguracoesAgendamentoService
    ) {
      const usuario = this.authService.getUsuarioAutenticado();
      this.usuarioLogado = usuario;
      this.saramUsuario = usuario?.saram || '';
    }

    getDiaLabel(dia: string): string {
      return this.diaLabelMap[normalizeDia(dia)] || dia;
    }

    private saveAgendamentos(): void {
      if (this.storageKey) {
        try {
          sessionStorage.setItem(this.storageKey, JSON.stringify(this.agendamentos));
        } catch (e) {
          this.logger.error('Erro ao salvar agendamentos no storage:', e);
        }
      }
    }

    private loadAgendamentosFromStorage(): void {
      if (!this.storageKey) {
        const fallback = this.authService.getUsuarioAutenticado();
        if (fallback?.cpf) {
          this.storageKey = `agendamentos-${fallback.cpf}`;
        } else {
          return;
        }
      }

      const data = sessionStorage.getItem(this.storageKey);
      if (data) {
        try {
          this.agendamentos = JSON.parse(data);
          this.sincronizarSlotsComAgendamentos();
          this.cdr.markForCheck();
        } catch (e) {
          this.logger.error('Erro ao carregar agendamentos do storage:', e);
          this.agendamentos = [];
        }
      }
    }

    private toMinutes(hora: string): number {
      const [h, m] = hora.split(':').map(Number);
      return h * 60 + m;
    }

    private carregarConfiguracao(): void {
      this.configuracoesService.getConfig().subscribe({
        next: ({ horarioInicio, horarioFim }) => {
          this.inicioJanelaMin = this.toMinutes(horarioInicio);
          this.fimJanelaMin = this.toMinutes(horarioFim);
          this.inicioAgendavelMin = Math.max(0, this.inicioJanelaMin - 30);
          this.fimAgendavelMin = this.fimJanelaMin;
          this.aplicarJanelaHorarios();
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
    }

    private atualizarHorariosBaseSemana(): void {
      const todosHorarios = new Set<string>();
      const base = this.horariosBasePorCategoria[this.categoriaSelecionada] || [];

      const adicionar = (hora?: string) => {
        const normalizado = normalizeHora(hora);
        if (normalizado) {
          todosHorarios.add(normalizado);
        }
      };

      base.forEach(adicionar);

      (Object.keys(this.horariosPorDia) as DiaKey[]).forEach(dia => {
        (this.horariosPorDia[dia] || []).forEach(slot => adicionar(slot.horario));
      });

      const filtrados = Array.from(todosHorarios).filter(h => this.isHoraAgendavel(h));
      this.horariosBaseSemana = this.ordenarHorarios(filtrados);
      this.cdr.markForCheck?.();
    }

    private sincronizarSlotsComAgendamentos(): void {
      const agendamentosAtivos = (this.agendamentos ?? []).filter(ag => {
        if (!ag?.diaSemana || !ag?.hora) {
          return false;
        }

        const status = (ag.status ?? '').toUpperCase();
        return !['CANCELADO', 'ADMIN_CANCELADO'].includes(status);
      });

      if (agendamentosAtivos.length === 0) {
        return;
      }

      const atualizado: HorariosPorDia = { ...this.horariosPorDia };
      let houveAlteracao = false;

      agendamentosAtivos.forEach(agendamento => {
        const diaKey = normalizeDia(agendamento.diaSemana);
        const hora = normalizeHora(agendamento.hora);
        if (!diaKey || !hora) {
          return;
        }

        const slotsDia = atualizado[diaKey] ?? [];
        const indice = slotsDia.findIndex(slot => normalizeHora(slot.horario) === hora);
        const usuarioId = agendamento.militar?.id ?? (indice >= 0 ? slotsDia[indice]?.usuarioId ?? null : null);

        if (indice >= 0) {
          const slotAtual = slotsDia[indice];
          if (slotAtual.status !== 'AGENDADO' || slotAtual.usuarioId !== usuarioId) {
            const novosSlots = [...slotsDia];
            novosSlots[indice] = {
              ...slotAtual,
              status: 'AGENDADO',
              usuarioId
            };
            atualizado[diaKey] = novosSlots;
            houveAlteracao = true;
          }
        } else {
          const novoSlot: SlotHorario = {
            horario: hora,
            status: 'AGENDADO',
            usuarioId
          };
          atualizado[diaKey] = [...slotsDia, novoSlot];
          houveAlteracao = true;
        }
      });

      if (houveAlteracao) {
        this.horariosPorDia = atualizado;
        this.atualizarHorariosBaseSemana();
        this.cdr.markForCheck();
      }
    }

    private atualizarBaseCategoria(categoria: string, horarios: string[]): void {
      const normalizados = horarios.map(h => normalizeHora(h)).filter(Boolean);
      const unicos = Array.from(new Set(normalizados));
      this.horariosBasePorCategoria[categoria] = this.ordenarHorarios(unicos);
    }

    private incluirHorarioNaBaseLocal(horario: string, categoria: string): void {
      const normalizado = normalizeHora(horario);
      if (!normalizado) {
        return;
      }
      const atual = this.horariosBasePorCategoria[categoria] || [];
      const conjunto = new Set(atual.map(h => normalizeHora(h)));
      conjunto.add(normalizado);
      this.horariosBasePorCategoria[categoria] = this.ordenarHorarios(Array.from(conjunto));
      if (categoria === this.categoriaSelecionada) {
        this.atualizarHorariosBaseSemana();
      }
    }

    private removerHorarioDaBaseLocal(horario: string, categoria: string): void {
      const alvo = normalizeHora(horario);
      const atual = this.horariosBasePorCategoria[categoria] || [];
      const filtrado = atual.filter(h => normalizeHora(h) !== alvo);
      const normalizados = filtrado.map(h => normalizeHora(h)).filter(Boolean);
      this.horariosBasePorCategoria[categoria] = this.ordenarHorarios(Array.from(new Set(normalizados)));
      if (categoria === this.categoriaSelecionada) {
        this.atualizarHorariosBaseSemana();
      }
    }
    
    

    isHoraAgendavel(hora: string): boolean {
    const m = this.toMinutes(hora);
    return m >= this.inicioAgendavelMin && m <= this.fimAgendavelMin;
    }

//---------------🔰Inicialização e Logout--------------------    
    ngOnInit(): void {
      const usuario = this.usuarioLogado;
      this.isAdmin = usuario?.categoria?.toUpperCase() === 'ADMIN';
      this.carregarConfiguracao();
      this.recarregarGradeSub = this.configuracoesService.recarregarGrade$.subscribe(cat => {
        if (cat === this.categoriaSelecionada) {
          this.carregarConfiguracao();
          this.carregarHorariosBase();
          this.carregarHorariosDaSemana();
        }
      });
      this.serverTimeService.getServerTime().subscribe({
        next: (res) => {
          this.timeOffsetMs = res.timestamp - Date.now();
          if (Math.abs(this.timeOffsetMs) > 60 * 1000) {
            this.snackBar.open(
              'Horário do dispositivo diferente do servidor. Ajuste a data e hora do aparelho para evitar erros.',
              'Ciente',
              { duration: 5000 }
            );
          }
          this.initAfterTime();
        },
        error: (err: any) => {
          this.logger.error('Erro ao obter hora do servidor:', err);
          this.initAfterTime();
        }
      });
    }

    private initAfterTime(): void {
      const fallback = this.authService.getUsuarioAutenticado();
      this.saramUsuario = fallback?.saram || '';
      if (fallback?.cpf) {
        this.cpfUsuario = fallback.cpf;
        this.storageKey = `agendamentos-${fallback.cpf}`;
      }

      this.loadAgendamentosFromStorage();
      this.carregarAgendamentos();

      this.userDataSubscription = this.userService.userData$
        .pipe(
          timeout(5000),
          retry({ count: 3, delay: 1000 }),
          take(1),
          catchError((err: any) => {
            this.logger.error('Erro ou timeout ao obter dados do usuário:', err);
            return of(null);
          })
        )
        .subscribe(userData => {
          if (userData && userData.length > 0) {
            this.cpfUsuario = userData[0].cpf;
            this.saramUsuario = userData[0].saram;
            const newKey = `agendamentos-${this.cpfUsuario}`;
            if (newKey !== this.storageKey) {
              this.storageKey = newKey;
              this.loadAgendamentosFromStorage();
              this.carregarAgendamentos();
            }
            this.militarLogado = userData[0].nomeDeGuerra;
            this.omMilitar = userData[0].om;
            this.cdr.markForCheck();
          }
        });

      this.route.queryParams.subscribe(params => {
        const categoriaParam = typeof params['categoria'] === 'string'
          ? params['categoria'].toUpperCase()
          : '';

        if (['GRADUADO', 'OFICIAL'].includes(categoriaParam)) {
          this.categoriaSelecionada = categoriaParam;
        } else {
          this.categoriaSelecionada = 'GRADUADO';
        }

        this.carregarHorariosBase();
        this.carregarHorariosDaSemana();
        this.carregarAgendamentos();
        this.horariosService.startPollingHorarios(this.categoriaSelecionada);

        this.horariosSub?.unsubscribe();
        this.horariosSub = this.horariosService.horariosPorDia$.subscribe({
          next: h => {
            this.horariosPorDia = { ...h };
            this.aplicarJanelaHorarios();
            this.sincronizarSlotsComAgendamentos();
            this.cdr.markForCheck();
          },
          error: (err: any) => this.logger.error('Erro ao atualizar horários:', err)
        });
      });

      this.agendamentoAtualizadoSub = this.agendamentoService.agendamentoAtualizado$.subscribe(() => {
        this.carregarAgendamentos();
        this.carregarHorariosDaSemana();
      });
    }

    logout(): void {
      this.authService.logout();
      this.router.navigate(['/auth/login']);
    }
    goToHome(): void {
      this.router.navigate(['/admin/dashboard']);
    }

//---------------⏰ Gerenciamento de Horários---------------
    selecionarHorario(dia: string, horario: string): void {
      const status = this.getStatus(dia, horario);
      if (status === 'DISPONIVEL') {
        this.abrirDialogoAgendamento(dia, horario);
      } else if (status === 'INDISPONIVEL') {
        this.snackBar.open(
          'Horário indisponivel; provavelmente já reservado ou bloqueado. Escolha outro.',
          'Ciente',
          { duration: SNACKBAR_DURATION }
        );
      } else if (status === 'AGENDADO') {
        this.snackBar.open(
          'Você já possui agendamento neste horário. Desmarque o atual para escolher outro.',
          'Ciente',
          { duration: SNACKBAR_DURATION }
        );
      }
    }

    carregarHorariosDaSemana(): void {
      this.carregarHorariosDaSemanaSub?.unsubscribe();
      this.carregarHorariosDaSemanaSub = this.horariosService
        .carregarHorariosDaSemana(this.categoriaSelecionada)
        .subscribe({
          next: (horarios: HorariosPorDia) => {
            const normalizados = normalizeHorariosPorDia(horarios || {});
            this.horariosPorDia = { ...normalizados };
            this.aplicarJanelaHorarios();
            this.sincronizarSlotsComAgendamentos();
            this.cdr.markForCheck();
          },
          error: err => {
            this.logger.error('Erro ao carregar horários:', err);
            this.carregarHorariosDaSemanaSub = undefined;
          },
          complete: () => {
            this.carregarHorariosDaSemanaSub = undefined;
          }
        });
    }
    
    
    /** Garante que todos os dias existam como arrays (nunca null) */
    private normalizarEstrutura(
      h: Partial<Record<DiaKey, SlotHorario[]>> | null | undefined
    ): HorariosPorDia {
      // Ajuste os nomes conforme seu contrato real
      const dias: DiaKey[] = Object.keys(DIA_SEMANA) as DiaKey[];
      const out: Record<DiaKey, SlotHorario[]> = {} as Record<
        DiaKey,
        SlotHorario[]
      >;

      for (const d of dias) {
        const lista = h?.[d as DiaKey];
        out[d] = Array.isArray(lista) ? lista : [];
      }

      return out;
    }
    


    onDiaChange(): void {
      this.carregarHorariosDaSemana();
    }

    onCategoriaChange(): void {
      if (this.horariosBasePorCategoria[this.categoriaSelecionada]) {
        this.atualizarHorariosBaseSemana();
      } else {
        this.carregarHorariosBase();
      }
      this.carregarHorariosDaSemana();
    }

    isHorariosEmpty(): boolean {
      return Object.values(this.horariosPorDia).every(arr => !arr || arr.length === 0);
    }
    carregarHorariosBase(): void {
      const categoria = this.categoriaSelecionada;
      const aplicar = (horarios: string[]) => {
        this.atualizarBaseCategoria(categoria, horarios);
        if (categoria === this.categoriaSelecionada) {
          this.atualizarHorariosBaseSemana();
        }
      };

      this.horariosService.getHorariosBase().subscribe({
        next: horarios => aplicar(horarios || []),
        error: err => {
          this.logger.error('Erro ao carregar horários base do serviço:', err);
          this.configuracoesService.getConfig().subscribe({
            next: config => {
              this.configuracao = config;
              const [inicioHora, inicioMin] = (config.horarioInicio ?? '08:00').split(':').map(Number);
              const [fimHora, fimMin] = (config.horarioFim ?? '18:00').split(':').map(Number);
              const inicioHoraValido = Number.isFinite(inicioHora) ? inicioHora : 0;
              const inicioMinValido = Number.isFinite(inicioMin) ? inicioMin : 0;
              const inicioPermitidoMin = Math.max(0, inicioHoraValido * 60 + inicioMinValido - 30);
              const inicio = new Date();
              inicio.setHours(Math.floor(inicioPermitidoMin / 60), inicioPermitidoMin % 60, 0, 0);
              const fim = new Date();
              fim.setHours(fimHora, fimMin, 0, 0);

              const slots: string[] = [];
              for (let t = new Date(inicio); t <= fim; t = new Date(t.getTime() + 30 * 60 * 1000)) {
                const hh = t.getHours().toString().padStart(2, '0');
                const mm = t.getMinutes().toString().padStart(2, '0');
                slots.push(`${hh}:${mm}`);
              }

              aplicar(slots);
            },
            error: configErr => {
              this.logger.error('Erro ao carregar configurações de agendamento:', configErr);
              this.snackBar.open(
                'Não foi possível carregar as configurações de horários. Recarregue a página.',
                'Ciente',
                { duration: SNACKBAR_DURATION }
              );
            }
          });
        }
      });
    }

    private ordenarHorarios(horarios: string[]): string[] {
      return [...horarios].sort((a, b) => this.toMinutes(normalizeHora(a)) - this.toMinutes(normalizeHora(b)));
    }

    validarHorario(): void {
      const value = this.horarioPersonalizado
        ? this.horarioPersonalizado.trim()
        : '';
      const regex = /^([01]\d|2[0-3]):[0-5]\d$/;
      this.horarioValido = !!value && regex.test(value);
      this.logger.log('Validando horário:', value, 'Valido:', this.horarioValido);
    }

    adicionarHorarioBase(): void {
      if (this.diaSelecionado !== 'todos') {
        this.adicionarHorarioDia();
        return;
      }

      if (!this.horarioValido || !this.horarioPersonalizado) {
        this.snackBar.open(
          'Digite um horário válido (HH:mm) antes de confirmar.',
          'Ciente',
          { duration: SNACKBAR_DURATION }
        );
        return;
      }

      const horario = this.horarioPersonalizado;
      const categoria = this.categoriaSelecionada;
      const diasAlvo: DiaKey[] = this.diasDaSemana;

      this.horariosService.adicionarHorarioBaseEmDias(horario, diasAlvo, categoria).subscribe({
        next: (resultados: AdicionarHorarioBaseResultado[]) => {
          const resultadosValidos = (resultados || []).filter(
            (resultado): resultado is AdicionarHorarioBaseResultado => !!resultado
          );
          const adicionados = resultadosValidos.filter(resultado => resultado.sucesso);
          const falhas = resultadosValidos.filter(resultado => !resultado.sucesso);
          const conflitos = falhas.filter(resultado => resultado.conflito);
          const falhasNaoConflito = falhas.filter(resultado => !resultado.conflito);

          if (falhas.length > 0) {
            falhas.forEach(resultado => this.logger.warn('Horário base não aplicado em dia selecionado.', resultado));
          }

          if (adicionados.length > 0) {
            this.incluirHorarioNaBaseLocal(horario, categoria);
            this.carregarHorariosDaSemana();
            const totalDiasSelecionados = diasAlvo.length;
            let mensagem: string;
            if (adicionados.length === totalDiasSelecionados && conflitos.length === 0 && falhasNaoConflito.length === 0) {
              mensagem = `Horário base ${horario} cadastrado com sucesso em todos os dias.`;
            } else {
              mensagem = `Horário base ${horario} cadastrado com sucesso em ${adicionados.length} dia(s).`;
              if (conflitos.length > 0) {
                mensagem += ` Já existia em ${conflitos.length} dia(s).`;
              }
              if (falhasNaoConflito.length > 0) {
                const mensagemFalha = falhasNaoConflito[0]?.mensagem;
                mensagem += mensagemFalha
                  ? ` Alguns dias não foram atualizados: ${mensagemFalha}`
                  : ' Alguns dias não foram atualizados. Verifique os logs para mais detalhes.';
              }
            }
            this.snackBar.open(mensagem, 'Ciente', { duration: SNACKBAR_DURATION });
            this.horarioPersonalizado = '';
            this.horarioValido = false;
            return;
          }

          if (conflitos.length > 0) {
            const mensagemConflito = conflitos[0]?.mensagem
              || `Horário base ${horario} já existe em todos os dias selecionados.`;
            this.snackBar.open(mensagemConflito, 'Ciente', { duration: SNACKBAR_DURATION });
            return;
          }

          if (falhas.length > 0) {
            const mensagemFalha = falhas[0]?.mensagem
              || 'Não foi possível adicionar o horário nos dias selecionados.';
            this.snackBar.open(mensagemFalha, 'Ciente', { duration: 5000 });
            return;
          }

          this.snackBar.open(`Nenhum dia foi atualizado com o horário ${horario}.`, 'Ciente', { duration: 5000 });
        },
        error: (error: any) => {
          this.logger.error('Erro ao adicionar horário:', error);
          this.snackBar.open('Não foi possível adicionar o horário nos dias selecionados.', 'Ciente', { duration: 5000 });
        }
      });
    }

    // adicionarHorarioDia(dia: string, horario: string): void {
    //   this.horariosService.adicionarHorarioDia(horario, dia, this.categoriaSelecionada).subscribe({
    //     next: (res: any) => {
    //       this.carregarHorariosDaSemana(); // recarrega os dados atualizados
    //       this.snackBar.open(`Horário ${horario} adicionado em ${dia}`, 'Ciente', { duration: SNACKBAR_DURATION });
    //     },
    //     error: (err) => {
    //       this.logger.error('Erro ao adicionar horário no dia:', err);
    //       this.snackBar.open(err.message || 'Erro ao adicionar horário.', 'Ciente', { duration: 5000 });
    //     }
    //   });
    // }

    adicionarHorarioDia(): void {
      if (this.horarioValido && this.horarioPersonalizado) {
        const horario = this.horarioPersonalizado;
        const dia = this.diaSelecionado as DiaKey;
        const categoria = this.categoriaSelecionada;

        this.horariosService.adicionarHorarioDia(horario, dia, categoria).subscribe({
          next: () => {
            this.snackBar.open(`Horário ${horario} adicionado em ${this.getDiaLabel(dia)}`, 'Ciente', { duration: SNACKBAR_DURATION });
            this.incluirHorarioNaBaseLocal(horario, categoria);
            this.carregarHorariosDaSemana();
            this.carregarHorariosBase();
            this.horarioPersonalizado = '';
            this.horarioValido = false;
            this.cdr.markForCheck();
          },
          error: (err: any) => {
            this.logger.error('Erro ao adicionar horário no dia:', err);
            this.snackBar.open(err.message || 'Erro ao adicionar horário.', 'Ciente', { duration: 5000 });
          }
        });
      }
    }

    formatarHorario(event: any): void {
      let valor = event.target.value.replace(/\D/g, '');
      if (valor.length >= 3) {
        valor = valor.slice(0, 4);
        this.horarioPersonalizado = valor.slice(0, 2) + ':' + valor.slice(2);
      } else {
        this.horarioPersonalizado = valor;
      }
      this.validarHorario();
    }

    adicionarHorarioIndividual(dia: DiaKey, horario: string, categoria: string): void { //Adiciona horário fixo na base
      if (this.diaSelecionado === 'todos') {
        this.snackBar.open('Selecione um dia específico para disponibilizar horários.', 'Ciente', { duration: SNACKBAR_DURATION });
        return;
      }

      this.horariosService.adicionarHorarioBase(horario, dia, categoria).subscribe({
        next: (resultado: AdicionarHorarioBaseResultado) => {
          if (!resultado?.sucesso) {
            this.logger.warn('Horário base não foi adicionado para o dia selecionado.', resultado);
            const mensagem = resultado?.mensagem
              || `Horário ${horario} já está cadastrado em ${this.getDiaLabel(dia)}.`;
            this.snackBar.open(mensagem, 'Ciente', { duration: SNACKBAR_DURATION });
            return;
          }
          this.incluirHorarioNaBaseLocal(horario, categoria);
          this.snackBar.open(`Horário ${horario} adicionado ao dia ${this.getDiaLabel(dia)}.`, 'Ciente', { duration: SNACKBAR_DURATION });
          this.carregarHorariosDaSemana();
        },
        error: (error: any) => {
          this.logger.error('Erro ao adicionar horário individual:', error);
          this.snackBar.open(
            'Falha ao adicionar horário. Verifique os dados e tente novamente.',
            'Ciente',
            { duration: 5000 }
          );
        }
      });
    } 
    
    // Remove horário definitivamente usando o endpoint `/remover`
    removerHorarioBase(): void {
      if (!this.horarioPersonalizado) {
        this.snackBar.open('Selecione o horário que deseja remover.', 'Ciente', { duration: SNACKBAR_DURATION });
        return;
      }

      const horario = this.horarioPersonalizado;
      const categoria = this.categoriaSelecionada;

      if (this.diaSelecionado === 'todos') {
        const diasAlvo: DiaKey[] = this.diasDaSemana;
        this.horariosService.removerHorarioBaseEmDias(horario, diasAlvo, categoria).subscribe({
          next: () => {
            diasAlvo.forEach(dia => {
              const diaKey = normalizeDia(dia);
              if (this.horariosPorDia[diaKey]) {
                this.horariosPorDia[diaKey] = this.horariosPorDia[diaKey].filter(h => normalizeHora(h.horario) !== normalizeHora(horario));
              }
            });
            this.horariosPorDia = { ...this.horariosPorDia };
            this.removerHorarioDaBaseLocal(horario, categoria);
            this.cdr.markForCheck();
            this.carregarHorariosDaSemana();
            this.snackBar.open('Horário removido com sucesso de todos os dias.', 'Ciente', { duration: SNACKBAR_DURATION });
          },
          error: (err: any) => {
            this.logger.error('Erro ao remover horário:', err);
            const mensagem = err?.message || 'Falha ao remover o horário dos dias selecionados.';
            this.snackBar.open(mensagem, 'Ciente', { duration: SNACKBAR_DURATION });
          }
        });
      } else {
        const dia = this.diaSelecionado as DiaKey;
        this.horariosService.removerHorarioBase(horario, dia, categoria).subscribe({
          next: () => {
            const diaKey = normalizeDia(dia);
            if (this.horariosPorDia[diaKey]) {
              this.horariosPorDia[diaKey] = this.horariosPorDia[diaKey].filter(h => normalizeHora(h.horario) !== normalizeHora(horario));
            }
            this.horariosPorDia = { ...this.horariosPorDia };
            this.carregarHorariosDaSemana();
            this.horarioPersonalizado = '';
            this.horarioValido = false;
            this.cdr.markForCheck();
            this.snackBar.open(`Horário ${horario} removido de ${this.getDiaLabel(dia)}.`, 'Ciente', { duration: SNACKBAR_DURATION });
          },
          error: (err: any) => {
            this.logger.error('Erro ao remover horário do dia:', err);
            this.snackBar.open(err.message || 'Erro ao remover horário.', 'Ciente', { duration: 5000 });
          }
        });
      }
    }
        

  getStatus(dia: string, hhmm: string): SlotHorario['status'] | undefined {
    const diaKey = normalizeDia(dia);
    const hora = normalizeHora(hhmm);
    return this.horariosPorDia[diaKey]?.find(h => normalizeHora(h.horario) === hora)?.status;
  }

  getSlot(dia: string, hora: string): SlotHorario | undefined {
    const diaKey = normalizeDia(dia);
    const hhmm = normalizeHora(hora);
    return this.horariosPorDia[diaKey]?.find(h => normalizeHora(h.horario) === hhmm);
  }

  getHorarioStatus(dia: string, hora: string): SlotHorario['status'] | undefined {
    return this.getStatus(dia, hora);
  }

  toggleHorario(dia: string, hhmm: string): void {
    if (this.diaSelecionado === 'todos') {
      this.snackBar.open('Selecione um dia específico antes de alterar a disponibilidade.', 'Ciente', { duration: SNACKBAR_DURATION });
      return;
    }

    const slot = this.getSlot(dia, hhmm);
    if (!slot?.id) {
      return;
    }

    if (slot.status === 'AGENDADO') {
      const agendamento = this.getAgendamentoParaDiaHora(dia, hhmm);
      if (agendamento) {
        this.abrirModalAgendamento(agendamento);
      }
      return;
    }

    const diaKey = normalizeDia(dia);
    const categoria = this.categoriaSelecionada;

    this.horariosService.toggleSlot(diaKey, hhmm, categoria).subscribe({
      next: (h: HorarioDTO) => {
        const atualizado: SlotHorario = {
          id: h.id,
          horario: normalizeHora(h.horario),
          status: h.status as SlotHorario['status'],
          usuarioId: h.usuarioId
        };

        const keyAtual = `${diaKey}|${atualizado.horario}|${categoria}`;
        const mapa = new Map<string, SlotHorario>();
        (this.horariosPorDia[diaKey] || []).forEach(s => {
          const k = `${diaKey}|${normalizeHora(s.horario)}|${categoria}`;
          mapa.set(k, s);
        });
        mapa.set(keyAtual, atualizado);

        this.horariosPorDia[diaKey] = Array.from(mapa.values());
        this.horariosPorDia = { ...this.horariosPorDia };
        this.horariosService.atualizarHorarios(this.horariosPorDia);
        this.cdr.markForCheck();

        const msg = atualizado.status === 'DISPONIVEL'
          ? 'Horário disponibilizado com sucesso.'
          : 'Horário indisponibilizado com sucesso.';
        this.snackBar.open(msg, 'Ciente', { duration: SNACKBAR_DURATION });
      },
      error: (error: any) => {
        const mensagem = error?.error?.mensagem || error?.error?.message ||
          'Falha ao alterar o status do horário. Verifique a conexão e tente novamente.';
        this.snackBar.open(mensagem, 'Ciente', { duration: 5000 });
      }
    });
  }
    
//-----------------☀️Gerenciamento de Dias-----------------
    toggleDia(dia: string): void {
      const diaKey = normalizeDia(dia);

      const dialogRef = this.dialog.open(ConfirmarToggleDiaComponent, {
        width: '400px',
        data: { dia: this.getDiaLabel(diaKey) }
      });

      dialogRef.afterClosed().subscribe((confirmado: boolean) => {
        if (!confirmado) {
          return;
        }

        this.horariosService
          .toggleDia({ dia: diaKey, categoria: this.categoriaSelecionada })
          .subscribe({
            next: horarios => {
              const normalizado = normalizeHorariosPorDia(horarios);
              this.horariosPorDia = normalizado;
              this.horariosService.atualizarHorarios(this.horariosPorDia);
              this.cdr.markForCheck();
              const label = this.getDiaLabel(diaKey);
              this.snackBar.open(`Horários do dia ${label} atualizados.`, 'Ciente', { duration: SNACKBAR_DURATION });
            },
            error: () => {
              const label = this.getDiaLabel(diaKey);
              this.snackBar.open(`Falha ao atualizar o dia ${label}.`, 'Ciente', { duration: 5000 });
            }
          });
      });
    }
//--------------📅Gerenciamento de Agendamento-------------
    temAgendado(dia: string): boolean {
      const diaNorm = normalizeDia(dia);
      return (
        Array.isArray(this.agendamentos) &&
        this.agendamentos.some(
          (a) => normalizeDia(a.diaSemana ?? '') === diaNorm
        )
      );
    }
    carregarAgendamentos(): void {
      this.carregarAgendamentosSub?.unsubscribe();
      const categoriaFiltro = this.isAdmin ? this.categoriaSelecionada.toUpperCase() : undefined;
      this.carregarAgendamentosSub = this.agendamentoService
        .getAgendamentos(categoriaFiltro)
        .subscribe({
        next: (agendamentos) => {
          if (Array.isArray(agendamentos)) {
            const agora = Date.now() + this.timeOffsetMs;
            const normalizados = agendamentos
              .map(a => ({
                ...a,
                diaSemana: normalizeDia(a.diaSemana.trim()),
                hora: a.hora.trim()
              }))
              .filter(a => {
                if (a.timestamp == null) return true;
                return a.timestamp >= agora;
              });

            this.agendamentos = categoriaFiltro
              ? normalizados.filter(a => (a.categoria ?? '').toUpperCase() === categoriaFiltro)
              : normalizados;

            if (this.agendamentos.length === 0) {
              this.saveAgendamentos();
            } else {
              this.saveAgendamentos();
            }
          } else {
            this.agendamentos = [];
            this.saveAgendamentos();
          }

          this.sincronizarSlotsComAgendamentos();
          this.cdr.markForCheck();
        },
        error: (error: any) => {
          this.logger.error('Erro ao carregar agendamentos:', error);
          this.snackBar.open(
            'Não foi possível carregar seus agendamentos. Atualize a página.',
            'Ciente',
            {
              duration: SNACKBAR_DURATION,
            }
          );
          this.loadAgendamentosFromStorage();
          this.carregarAgendamentosSub = undefined;
        },
        complete: () => {
          this.carregarAgendamentosSub = undefined;
        }
      });
    }

    todosIndisponiveis(dia: string): boolean {
      const diaKey = normalizeDia(dia);
      const horarios = this.horariosPorDia[diaKey] || [];
      return (
        horarios.length > 0 && horarios.every((h) => h.status === 'INDISPONIVEL')
      );
    }

    agendarOuIndisponibilizar(dia: string, horario: string): void {
      const militarAutenticado = this.authService.getUsuarioAutenticado();
      if (!militarAutenticado) {
        this.snackBar.open(
          'Não foi possível localizar seus dados. Faça login novamente.',
          'Ciente',
          { duration: 5000 }
        );
        this.authService.logout();
        this.router.navigate(['/auth/login']);
        return;
      }

      const isAdmin = militarAutenticado.categoria?.toUpperCase() === 'ADMIN';
      if (isAdmin) {
        this.toggleHorario(dia, horario);
      } else {
        this.abrirDialogoAgendamento(dia, horario);
      }
    }

    private abrirDialogoAgendamento(dia: string, horario: string): void {
      const ref = this.dialog.open(DialogoAgendamentoComponent, {
        data: { diaSemana: dia, hora: horario, categoria: this.categoriaSelecionada }
      });

      ref.afterClosed().subscribe(r => {
        if (r?.sucesso) {
          const novoAgendamento: Agendamento | undefined = r.payload;
          const diaKey = normalizeDia(dia);
          const horariosDoDia = this.horariosPorDia[diaKey] || [];
          const index = horariosDoDia.findIndex(h => h.horario === horario);
          const statusAtualizado = (r.payload?.status ?? 'AGENDADO') as SlotHorario['status'];

          const horariosAtualizados =
            index !== -1
              ? horariosDoDia.map((slot, idx) =>
                  idx === index
                    ? { ...slot, status: statusAtualizado }
                    : slot
                )
              : [...horariosDoDia, { horario, status: statusAtualizado }];

          this.horariosPorDia = {
            ...this.horariosPorDia,
            [diaKey]: horariosAtualizados,
          };

          if (novoAgendamento) {
            this.agendamentos.push(novoAgendamento);
            this.agendamentos = [...this.agendamentos];
            this.saveAgendamentos();
          }

          this.sincronizarSlotsComAgendamentos();
          this.horariosService.atualizarHorarios(this.horariosPorDia);
          this.cdr.markForCheck();
        }
      });
    }
    
    
    
    handleClick(agendamento: Agendamento): void {
      if (this.isAgendamentoDoMilitarLogado(agendamento)) {
        const selectedDate = agendamento.data || '';
        const dialogRef = this.dialog.open(DialogoCancelamentoComponent, {
          width: '400px',
          data: {
            diaSemana: agendamento.diaSemana,
            hora: agendamento.hora,
            usuarioId: agendamento.militar?.id,
            data: selectedDate,
          },
        });

        dialogRef.afterClosed().subscribe((payload) => {
          if (payload) {
            this.desmarcarAgendamento(agendamento);
          }
        });
      }
    }

    isAgendamentoDoMilitarLogado(agendamento?: Agendamento): boolean {
      const saramAgendamento = agendamento?.usuarioSaram || agendamento?.militar?.saram;
      return saramAgendamento === this.saramUsuario;
    }

    isAgendamentoDesmarcavel(agendamento: Agendamento): boolean {
      if (!agendamento) {
        return true;
      }

      let timestamp: number | null = agendamento.timestamp ?? null;

      if (!timestamp) {
        if (!agendamento.data || !agendamento.hora) {
          return true;
        }

        const horaFormatada = normalizeHora(agendamento.hora).substring(0, 5);
        let dia: number, mes: number, ano: number;

        if (agendamento.data.includes('-')) {
          [ano, mes, dia] = agendamento.data.split('-').map(Number);
        } else {
          [dia, mes, ano] = agendamento.data.split('/').map(Number);
        }

        const [horaNum, minutoNum] = horaFormatada.split(':').map(Number);
        timestamp = new Date(ano, mes - 1, dia, horaNum, minutoNum).getTime();
      }

      const diffMs = timestamp - (Date.now() + this.timeOffsetMs);
      return diffMs >= 30 * 60 * 1000;
    }

    getAgendamentoParaDiaHora(dia: string, hora: string): Agendamento | undefined {
      const diaSemana = normalizeDia(dia);
      const horaFormatada = normalizeHora(hora);
      return this.agendamentos.find(a =>
        normalizeDia(a.diaSemana) === diaSemana &&
        normalizeHora(a.hora) === horaFormatada
      );
    }

    desmarcarAgendamento(agendamento: Agendamento): void {
      if (!agendamento?.id) return;

      const dia = normalizeDia(agendamento.diaSemana);
      const hora = normalizeHora(agendamento.hora);
      const slot = (this.horariosPorDia[dia] || []).find(s => s.horario === hora);
      const slotId = slot?.id;
      if (!slotId) {
        return;
      }

      this.horariosService.liberarHorario(slotId).subscribe({
        next: (horarioAtualizado: Horario) => {
          this.snackBar.open('Agendamento desmarcado com sucesso.', 'Ciente', { duration: SNACKBAR_DURATION });

          const diaAtualizado = normalizeDia(horarioAtualizado.dia ?? agendamento.diaSemana);
          const horaAtualizada = normalizeHora(horarioAtualizado.horario ?? agendamento.hora);
          const slotsDia = this.horariosPorDia[diaAtualizado] || [];
          const slotIndex = slotsDia.findIndex(s => s.horario === horaAtualizada);
          if (slotIndex !== -1) {
            const horariosAtualizados = slotsDia.map((slot, idx) =>
              idx === slotIndex
                ? {
                    ...slot,
                    status: horarioAtualizado.status,
                    usuarioId: horarioAtualizado.usuarioId,
                    id: horarioAtualizado.id,
                  }
                : slot
            );

            this.horariosPorDia = {
              ...this.horariosPorDia,
              [diaAtualizado]: horariosAtualizados,
            };
            this.horariosService.atualizarHorarios(this.horariosPorDia);
          }

          this.agendamentos = this.agendamentos.filter(a => a.id !== agendamento.id);

          this.saveAgendamentos();
          this.carregarAgendamentos();
          this.carregarHorariosDaSemana();
          this.cdr.markForCheck();
        },
        error: (error: any) => {
          this.logger.error('Erro ao desmarcar agendamento:', error);
          const message = error?.error?.message || 'Não foi possível desmarcar o agendamento. Tente novamente.';
          this.snackBar.open(message, 'Ciente', { duration: 5000 });
        }
      });
    }
    
  converterParaDataBR(diaSemanaComData: string): string {
    const partes = diaSemanaComData.split(' - ');
    if (partes.length < 2) return '';
    const [_, dataStr] = partes;
    const [dia, mes] = dataStr.split('/').map(Number);
    const anoAtual = new Date().getFullYear();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(dia)}/${pad(mes)}/${anoAtual}`;
  }



  abrirModalAgendamento(agendamento: Agendamento) {
    this.dialog.open(DialogoDetalhesAgendamentoComponent, {
      width: '400px',
      data: {
        agendamento,
        podeDesmarcar: false
      },
    });
  }

  formatarStatus(texto: string): string {
    if (!texto) return '';
    const lower = texto.toLowerCase();
    if (lower === 'disponivel') return 'Disponível';
    if (lower === 'indisponivel') return 'Indisponível';
    if (lower === 'agendado') return 'Agendado';
    return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
  }

  trackByDia(_index: number, dia: string): string {
    return dia;
  }

  trackByHorario(_index: number, horario: string): string {
    return horario;
  }

    ngOnDestroy(): void {
      this.userDataSubscription?.unsubscribe();
      this.horariosSub?.unsubscribe();
      this.agendamentoAtualizadoSub?.unsubscribe();
      this.recarregarGradeSub?.unsubscribe();
      this.carregarHorariosDaSemanaSub?.unsubscribe();
      this.carregarAgendamentosSub?.unsubscribe();
      this.horariosService.stopPollingHorarios();
    }

  }

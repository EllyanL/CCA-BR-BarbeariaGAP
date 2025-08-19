import { ActivatedRoute, Router } from '@angular/router';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ConfiguracaoAgendamento, ConfiguracoesAgendamentoService } from '../../services/configuracoes-agendamento.service';
import { HorariosService } from '../../services/horarios.service';
import { HorariosPorDia, SlotHorario } from '../../models/slot-horario';
import { normalizeHora, normalizeHorariosPorDia } from '../../utils/horarios-utils';
import { Observable, Subscription, from, of } from 'rxjs';
import { catchError, concatMap, take, tap, timeout } from 'rxjs/operators';

import { Agendamento } from '../../models/agendamento';
import { AgendamentoService } from '../../services/agendamento.service';
import { AuthService } from '../../services/auth.service';
import { DialogoAgendamentoRealizadoComponent } from 'src/app/components/agendamento/dialogo-agendamento-realizado/dialogo-agendamento-realizado.component';
import { DialogoDesmarcarComponent } from 'src/app/components/admin/dialogo-desmarcar/dialogo-desmarcar.component';
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
  })
  export class HorariosComponent implements OnInit, OnDestroy {
    public isAdmin: boolean = false;
    agendamentos: Agendamento[] = [];
    militarLogado: string = '';
    omMilitar: string = '';
    usuarioLogado: Militar | null = null;
    diasDaSemana: string[] = ['segunda', 'terça', 'quarta', 'quinta', 'sexta'];
    diasParaSelecao: string[] = ['todos', ...this.diasDaSemana];
    horariosBaseSemana: string[] = [];
    diaSelecionado: string = 'segunda';
    horariosPorDia: HorariosPorDia = {
      segunda: [],
      terca: [],
      quarta: [],
      quinta: [],
      sexta: [],
    };
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
    ) {}

    private normalizeDia(d: string): string {
      return d
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
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

    private toMinutes(hora: string): number {
      const [h, m] = hora.split(':').map(Number);
      return h * 60 + m;
    }

    private carregarConfiguracao(): void {
      this.configuracoesService.getConfig().subscribe({
        next: ({ horarioInicio, horarioFim }) => {
          this.inicioJanelaMin = this.toMinutes(horarioInicio);
          this.fimJanelaMin = this.toMinutes(horarioFim);
          this.inicioAgendavelMin = this.inicioJanelaMin + 10;
          this.fimAgendavelMin = this.fimJanelaMin - 30;
          this.aplicarJanelaHorarios();
        },
        error: err => this.logger.error('Erro ao carregar janela de horários:', err)
      });
    }

    private aplicarJanelaHorarios(): void {
      const inRange = (h: string) => {
        const m = this.toMinutes(h);
        return m >= this.inicioJanelaMin && m <= this.fimJanelaMin;
      };
      this.horariosBaseSemana = (this.horariosBaseSemana || []).filter(inRange);
      Object.keys(this.horariosPorDia).forEach(dia => {
        const arr = this.horariosPorDia[dia] || [];
        this.horariosPorDia[dia] = arr.filter(h => inRange(h.horario));
      });
      this.cdr.markForCheck?.();
      this.cdr.detectChanges();
    }
    
    

    isHoraAgendavel(hora: string): boolean {
      const m = this.toMinutes(hora);
      return m >= this.inicioAgendavelMin && m <= this.fimAgendavelMin;
    }

//---------------🔰Inicialização e Logout--------------------    
  ngOnInit(): void {
      this.usuarioLogado = this.authService.getUsuarioAutenticado();
      this.saramUsuario = this.usuarioLogado?.saram || '';
      this.cdr.detectChanges();
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

      this.userDataSubscription = this.userService.userData$
        .pipe(
          take(1),
          timeout(5000),
          catchError((err: any) => {
            this.logger.error('Erro ou timeout ao obter dados do usuário:', err);
            return of([]);
          })
        )
        .subscribe(userData => {
          if (userData && userData.length > 0) {
            this.cpfUsuario = userData[0].cpf;
            this.saramUsuario = userData[0].saram;
            this.storageKey = `agendamentos-${this.cpfUsuario}`;
            this.cdr.detectChanges();
            this.militarLogado = userData[0].nomeDeGuerra;
            this.omMilitar = userData[0].om;
          } else {
            const fallback = this.authService.getUsuarioAutenticado();
            this.saramUsuario = fallback?.saram || '';
            if (fallback?.cpf) {
              this.cpfUsuario = fallback.cpf;
              this.storageKey = `agendamentos-${fallback.cpf}`;
            }
          }

          this.loadAgendamentosFromStorage();
          this.carregarAgendamentos();

          this.route.queryParams.subscribe((params) => {
            const categoria = params['categoria'];
            if (categoria && ['GRADUADO', 'OFICIAL'].includes(categoria)) {
              this.categoriaSelecionada = categoria;
            }
            this.carregarHorariosBase();
            this.loadHorarios();
            this.horariosService.startPollingHorarios(this.categoriaSelecionada);
            this.horariosSub = this.horariosService.horariosPorDia$.subscribe({
              next: h => {
                this.horariosPorDia = h;
                this.aplicarJanelaHorarios();
                this.cdr.detectChanges();
              },
              error: (err: any) => this.logger.error('Erro ao atualizar horários:', err)
            });
          });

          this.agendamentoAtualizadoSub = this.agendamentoService.agendamentoAtualizado$.subscribe(() => {
            this.carregarAgendamentos();
            this.carregarHorariosDaSemana();
          });
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
      const status = this.getHorarioStatus(dia, horario);
      if (status === 'DISPONIVEL') {
        this.agendarHorario(dia, horario); // Usuário comum tenta agendar
      } else if (status === 'INDISPONIVEL') {
        this.snackBar.open(
          'Horário indisponivel; provavelmente já reservado ou bloqueado. Escolha outro.',
          'Ciente',
          { duration: 3000 }
        );
      } else if (status === 'AGENDADO') {
        this.snackBar.open(
          'Você já possui agendamento neste horário. Desmarque o atual para escolher outro.',
          'Ciente',
          { duration: 3000 }
        );
      }
    }

    loadHorarios(): void {
      this.horariosService
        .carregarHorariosDaSemana(this.categoriaSelecionada)
        .subscribe({
          next: (horarios: HorariosPorDia) => {
            this.horariosPorDia = horarios;
            this.aplicarJanelaHorarios();
            this.cdr.detectChanges();
          },
          error: (err: any) => this.logger.error('Erro ao carregar horários:', err)
        });
    }
    
    carregarHorariosDaSemana(): void {
      this.horariosService.carregarHorariosDaSemana(this.categoriaSelecionada).subscribe({
        next: (horarios: HorariosPorDia) => {
          const normalizados = normalizeHorariosPorDia(horarios || {});
          this.horariosPorDia = normalizados;
          this.aplicarJanelaHorarios();
          this.cdr.detectChanges();
        },
        error: err => this.logger.error('Erro ao carregar horários:', err)
      });
    }
    
    
    /** Garante que todos os dias existam como arrays (nunca null) */
    private normalizarEstrutura(h: HorariosPorDia | null | undefined): HorariosPorDia {
      // Ajuste os nomes conforme seu contrato real
      const dias = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];
      const out: any = {};
    
      for (const d of dias) {
        const lista = (h as any)?.[d];
        out[d] = Array.isArray(lista) ? lista : [];
      }
    
      return out as HorariosPorDia;
    }
    


    onDiaChange(): void {
      this.loadHorarios();
    }

    onCategoriaChange(): void {
      this.loadHorarios();
    }

    isHorariosEmpty(): boolean {
      return Object.values(this.horariosPorDia).every(arr => !arr || arr.length === 0);
    }
    carregarHorariosBase(): void {
      this.configuracoesService.getConfig().subscribe({
        next: config => {
          this.configuracao = config;

          const [inicioHora, inicioMin] = (config.horarioInicio ?? '08:00').split(':').map(Number);
          const [fimHora, fimMin] = (config.horarioFim ?? '18:00').split(':').map(Number);
          const inicio = new Date();
          inicio.setHours(inicioHora, inicioMin, 0, 0);
          const fim = new Date();
          fim.setHours(fimHora, fimMin, 0, 0);

          const slots: string[] = [];
          for (let t = new Date(inicio); t <= fim; t = new Date(t.getTime() + 30 * 60 * 1000)) {
            const hh = t.getHours().toString().padStart(2, '0');
            const mm = t.getMinutes().toString().padStart(2, '0');
            slots.push(`${hh}:${mm}`);
          }

          this.horariosBaseSemana = slots;
          this.aplicarJanelaHorarios();
          this.ordenarHorarios();
          this.cdr.detectChanges();
        },
        error: err => {
          this.logger.error('Erro ao carregar configurações de agendamento:', err);
          this.snackBar.open(
            'Não foi possível carregar as configurações de horários. Recarregue a página.',
            'Ciente',
            { duration: 3000 }
          );
        }
      });
    }

    private ordenarHorarios(): void {
      this.horariosBaseSemana.sort((a, b) => {
        const getTimeValue = (horarioStr: string) => {
          const [hours, minutes] = horarioStr.split(':').map(Number);
          return hours * 60 + minutes;
        };
        return getTimeValue(a) - getTimeValue(b);
      });
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
      if (!this.horarioValido || !this.horarioPersonalizado) {
        this.snackBar.open(
          'Digite um horário válido (HH:mm) antes de confirmar.',
          'Ciente',
          { duration: 3000 }
        );
        return;
      }

      const horario = this.horarioPersonalizado;
      const categoria = this.categoriaSelecionada;
      const diasAlvo = this.diaSelecionado === 'todos' ? this.diasDaSemana : [this.diaSelecionado];

      const requisicao$: Observable<any> = diasAlvo.length > 1
        ? this.horariosService.adicionarHorarioBaseEmDias(horario, diasAlvo, categoria)
        : this.horariosService.adicionarHorarioBase(horario, this.diaSelecionado, categoria);

      requisicao$.subscribe({
        next: () => {
          if (!this.horariosBaseSemana.includes(horario)) {
            this.horariosBaseSemana.push(horario);
            this.ordenarHorarios();
          }
          this.carregarHorariosDaSemana();
          const msgDias = diasAlvo.length > 1 ? 'todos os dias' : `o dia ${this.diaSelecionado}`;
          this.snackBar.open(`Horário base ${horario} cadastrado com sucesso em ${msgDias}.`, 'Ciente', { duration: 3000 });
          this.horarioPersonalizado = '';
          this.horarioValido = false;
        },
        error: (error: any) => {
          this.logger.error('Erro ao adicionar horário:', error);
          const msgDias = diasAlvo.length > 1 ? 'os dias selecionados' : 'o dia escolhido';
          this.snackBar.open(`Não foi possível adicionar o horário nos ${msgDias}.`, 'Ciente', { duration: 5000 });
        }
      });
    }

    // adicionarHorarioDia(dia: string, horario: string): void {
    //   this.horariosService.adicionarHorarioDia(horario, dia, this.categoriaSelecionada).subscribe({
    //     next: (res: any) => {
    //       this.carregarHorariosDaSemana(); // recarrega os dados atualizados
    //       this.snackBar.open(`Horário ${horario} adicionado em ${dia}`, 'Ciente', { duration: 3000 });
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
        const dia = this.diaSelecionado;
        const categoria = this.categoriaSelecionada;

        this.horariosService.adicionarHorarioDia(horario, dia, categoria).subscribe({
          next: () => {
            this.snackBar.open(`Horário ${horario} adicionado em ${dia}`, 'Ciente', { duration: 3000 });
            this.carregarHorariosDaSemana();
            this.carregarHorariosBase();
            this.horarioPersonalizado = '';
            this.horarioValido = false;
            this.cdr.detectChanges();
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

    adicionarHorarioIndividual(dia: string, horario: string, categoria: string): void { //Adiciona horário fixo na base
      this.horariosService.adicionarHorarioBase(horario, dia, categoria).subscribe({
        next: () => {
          // Garante que ele exista na base da semana
          if (!this.horariosBaseSemana.includes(horario)) {
            this.horariosBaseSemana.push(horario);
            this.ordenarHorarios();
          }

          this.snackBar.open(`Horário ${horario} adicionado ao dia ${dia}.`, 'Ciente', { duration: 3000 });
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
      if (!this.diaSelecionado || !this.horarioPersonalizado) {
        this.snackBar.open('Selecione o dia e o horário que deseja remover.', 'Ciente', { duration: 3000 });
        return;
      }

      const horario = this.horarioPersonalizado;
      const categoria = this.categoriaSelecionada;
      const diasAlvo = this.diaSelecionado === 'todos' ? this.diasDaSemana : [this.diaSelecionado];

      const requisicao$: Observable<any> = diasAlvo.length > 1
        ? this.horariosService.removerHorarioBaseEmDias(horario, diasAlvo, categoria)
        : this.horariosService.removerHorarioBase(horario, this.diaSelecionado, categoria);

      requisicao$.subscribe({
        next: () => {
          this.horariosBaseSemana = this.horariosBaseSemana.filter(h => h !== horario);
          diasAlvo.forEach(dia => {
            const diaKey = this.normalizeDia(dia);
            if (this.horariosPorDia[diaKey]) {
              this.horariosPorDia[diaKey] = this.horariosPorDia[diaKey].filter(h => h.horario !== horario);
            }
          });

          this.carregarHorariosDaSemana();
          const msgDias = diasAlvo.length > 1 ? 'todos os dias' : `o dia ${this.diaSelecionado}`;
          this.snackBar.open(`Horário removido com sucesso de ${msgDias}.`, 'Ciente', { duration: 3000 });
        },
        error: (err: any) => {
          this.logger.error('Erro ao remover horário:', err);
          const msgDias = diasAlvo.length > 1 ? 'os dias selecionados' : 'o dia escolhido';
          this.snackBar.open(`Falha ao remover o horário dos ${msgDias}.`, 'Ciente', { duration: 3000 });
        }
      });
    }
        

  getSlot(dia: string, hora: string): SlotHorario | undefined {
      const diaKey = this.normalizeDia(dia);
      return this.horariosPorDia[diaKey]?.find(h => h.horario.slice(0, 5) === hora.slice(0, 5));
    }

  getHorarioStatus(dia: string, hora: string): string {
      return this.getSlot(dia, hora)?.status || 'DISPONIVEL';
    }

  toggleHorario(dia: string, slot: SlotHorario): void {
      if (!slot.id) {
        return;
      }
      const novoStatus: SlotHorario['status'] = slot.status === 'DISPONIVEL' ? 'INDISPONIVEL' : 'DISPONIVEL';
      this.horariosService.alterarStatusHorario(slot.id, novoStatus).subscribe({
        next: () => {
          const diaKey = this.normalizeDia(dia);
          const lista = this.horariosPorDia[diaKey] || [];
          const idx = lista.findIndex(s => s.id === slot.id);
          if (idx !== -1) {
            lista[idx] = { ...lista[idx], status: novoStatus };
            this.horariosPorDia[diaKey] = lista;
            this.horariosService.atualizarHorarios(this.horariosPorDia);
          }
          const msg = novoStatus === 'DISPONIVEL'
            ? 'Horário disponibilizado com sucesso.'
            : 'Horário indisponibilizado com sucesso.';
          this.snackBar.open(msg, 'Ciente', { duration: 3000 });
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
      if (this.temAgendado(dia)) {
        return;
      }

      const diaKey = this.normalizeDia(dia);
      const horarios = this.horariosPorDia[diaKey] || [];
      const existeDisponivel = horarios.some(h => h.status === 'DISPONIVEL');

      if (existeDisponivel) {
        this.indisponibilizarDia(dia);
      } else {
        this.disponibilizarDia(dia);
      }
    }

    indisponibilizarDia(dia: string): void { //Atualiza status de horários
      const horarios = this.horariosBaseSemana;
      if (!horarios || horarios.length === 0) return;

      const dias = dia === 'todos' ? this.diasDaSemana : [dia];

      from(dias)
        .pipe(
          concatMap((d) =>
            this.horariosService
              .indisponibilizarTodosHorarios(d, horarios, this.categoriaSelecionada)
              .pipe(
                tap(() => {
                  this.carregarHorariosDaSemana();
                  this.snackBar.open(
                    `Dia ${d} marcado como indisponivel`,
                    'Ciente',
                    { duration: 3000 }
                  );
                }),
                catchError(() => {
                  this.snackBar.open(
                    `Falha ao indisponibilizar o dia ${d}.`,
                    'Ciente',
                    { duration: 3000 }
                  );
                  return of(null);
                })
              )
          )
        )
        .subscribe();
    }

    disponibilizarDia(dia: string): void { //Atualiza status de horários
      const horariosFormatados = this.horariosBaseSemana.map((h) =>
        h.length === 5 ? `${h}:00` : h
      );
      const dias = dia === 'todos' ? this.diasDaSemana : [dia];

      from(dias)
        .pipe(
          concatMap((d) =>
            this.horariosService
              .disponibilizarTodosHorariosComEndpoint(
                d,
                horariosFormatados,
                this.categoriaSelecionada
              )
              .pipe(
                tap(() => {
                  this.carregarHorariosDaSemana();
                  this.snackBar.open(
                    `Dia ${d} liberado para ${this.categoriaSelecionada}`,
                    'Ciente',
                    { duration: 3000 }
                  );
                }),
                catchError(() => {
                  this.snackBar.open(
                    `Falha ao disponibilizar o dia ${d}. Verifique a conexão e tente novamente.`,
                    'Ciente',
                    { duration: 5000 }
                  );
                  return of(null);
                })
              )
          )
        )
        .subscribe();
    }
//--------------📅Gerenciamento de Agendamento-------------
    temAgendado(dia: string): boolean {
      const diaNorm = this.normalizeDia(dia);
      return (
        Array.isArray(this.agendamentos) &&
        this.agendamentos.some(
          (a) => this.normalizeDia(a.diaSemana ?? '') === diaNorm
        )
      );
    }
    carregarAgendamentos(): void {
      this.agendamentoService.getAgendamentos().subscribe({
        next: (agendamentos) => {
          if (Array.isArray(agendamentos)) {
            const agora = Date.now() + this.timeOffsetMs;
            this.agendamentos = agendamentos
              .map(a => ({
                ...a,
                diaSemana: this.normalizeDia(a.diaSemana.trim()),
                hora: a.hora.trim()
              }))
              .filter(a => {
                if (a.status === 'CANCELADO') return false;
                if (a.timestamp == null) return true;
                return a.timestamp >= agora;
              });

            if (this.agendamentos.length === 0) {
              this.saveAgendamentos();
            } else {
              this.saveAgendamentos();
            }
          } else {
            this.agendamentos = [];
            this.saveAgendamentos();
          }
        },
        error: (error: any) => {
          this.logger.error('Erro ao carregar agendamentos:', error);
          this.snackBar.open(
            'Não foi possível carregar seus agendamentos. Atualize a página.',
            'Ciente',
            {
              duration: 3000,
            }
          );
          this.loadAgendamentosFromStorage();
        }
      });
    }

    todosIndisponiveis(dia: string): boolean {
      const diaKey = this.normalizeDia(dia);
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
        const slot = this.getSlot(dia, horario);
        if (slot) {
          this.toggleHorario(dia, slot);
        }
      } else {
        this.agendarHorario(dia, horario);
      }
    }

    agendarHorario(dia: string, horario: string): void {
      if (!this.authService.isAuthenticated()) {
        this.snackBar.open('Usuário não autenticado. Faça login para agendar.', 'Ciente', { duration: 5000 });
        this.router.navigate(['/auth/login']);
        return;
      }
    
      const usuario = this.authService.getUsuarioAutenticado();
      if (!usuario) {
        this.snackBar.open('Não foi possível encontrar seus dados de usuário. Faça login novamente.', 'Ciente', { duration: 5000 });
        this.authService.logout();
        this.router.navigate(['/auth/login']);
        return;
      }

      const dataIso = this.converterParaDataISO(dia);
      const agendamentoDate = new Date(`${dataIso}T${horario}`);
      const agora = new Date(Date.now() + this.timeOffsetMs);
      if (agendamentoDate.getTime() < agora.getTime()) {
        this.snackBar.open('Não é possível agendar horários passados.', 'Ciente', { duration: 3000 });
        return;
      }

      const agendamento: Agendamento = {
        data: this.converterParaDataISO(dia),
        hora: horario,
        diaSemana: this.normalizeDia(dia.split(' - ')[0]),
        categoria: this.categoriaSelecionada
      };
    
      this.agendamentoService.createAgendamento(agendamento).subscribe({
        next: (res: Agendamento) => {
          const novoAgendamento = res;
          const status = (res?.status as SlotHorario['status']) || 'AGENDADO';
          const confirmDialog = this.dialog.open(DialogoAgendamentoRealizadoComponent, {
            width: '400px'
          });

          confirmDialog.afterClosed().subscribe(() => {
            const diaKey = agendamento.diaSemana;
            const horariosDoDia = this.horariosPorDia[diaKey] || [];
            const index = horariosDoDia.findIndex(h => h.horario === horario);

            if (index !== -1) {
              horariosDoDia[index].status = status;
            } else {
              horariosDoDia.push({ horario, status });
            }

            this.horariosPorDia[diaKey] = [...horariosDoDia];

            if (novoAgendamento) {
              this.agendamentos.push(novoAgendamento);
              this.agendamentos = [...this.agendamentos];
            }

            this.horariosService.atualizarHorarios(this.horariosPorDia);
            this.saveAgendamentos();
            this.cdr.detectChanges();
          });
        },
        error: (err: any) => {
          this.logger.error('Erro ao agendar:', err);
          const message = err?.error?.message || err?.error || err?.message ||
            'Não foi possível realizar o agendamento. Tente novamente.';
          this.snackBar.open(message, 'Ciente', { duration: 5000 });
        }
      });
    }
    
    
    
    handleClick(agendamento: Agendamento): void {
      if (this.isAgendamentoDoMilitarLogado(agendamento)) {
        const dialogRef = this.dialog.open(DialogoDesmarcarComponent, {
          width: '400px',
          data: {
            id: agendamento.id,
            militar: agendamento.militar,
            dia: agendamento.diaSemana,
            hora: agendamento.hora,
          },
        });

        dialogRef.afterClosed().subscribe((confirmado: boolean) => {
          if (confirmado) {
            this.desmarcarAgendamento(agendamento);
          }
        });
      }
    }

    isAgendamentoDoMilitarLogado(agendamento?: Agendamento): boolean {
      const saramAgendamento = agendamento?.usuarioSaram || agendamento?.militar?.saram;
      const resultado = saramAgendamento === this.saramUsuario;
      console.log('[DEBUG] Comparando SARAM:', saramAgendamento, 'com', this.saramUsuario, '→', resultado);
      return resultado;
    }
    
    isAgendamentoDesmarcavel(agendamento: Agendamento): boolean {
      return !!agendamento;
    }

    getAgendamentoParaDiaHora(dia: string, hora: string): Agendamento | undefined {
      const diaSemana = this.normalizeDia(dia.split(' - ')[0].trim());
      const horaFormatada = hora.slice(0, 5);
      return this.agendamentos.find(a =>
        this.normalizeDia(a.diaSemana) === diaSemana &&
        a.hora.slice(0, 5) === horaFormatada &&
        a.status !== 'CANCELADO'
      );
    }

    desmarcarAgendamento(agendamento: Agendamento): void {
      if (!agendamento?.id) return;
    
      this.agendamentoService.cancelarAgendamento(agendamento.id).subscribe({
        next: () => {
          this.snackBar.open('Agendamento desmarcado com sucesso.', 'Ciente', { duration: 3000 });
          const dia = agendamento.diaSemana;
          const hora = normalizeHora(agendamento.hora); // garante formato HH:mm
          const idx = this.agendamentos.findIndex(a => a.id === agendamento.id);
          if (idx !== -1) {
            this.agendamentos[idx] = {
              ...this.agendamentos[idx],
              status: 'CANCELADO',
              canceladoPor: 'USUARIO'
            };
          }

          this.saveAgendamentos();
          this.carregarHorariosDaSemana();
        },
        error: (error: any) => {
          this.logger.error('Erro ao desmarcar agendamento:', error);
          const message = error?.error?.message || 'Não foi possível desmarcar o agendamento. Tente novamente.';
          this.snackBar.open(message, 'Ciente', { duration: 5000 });
        }
      });
    }
    
  converterParaDataISO(diaSemanaComData: string): string {
    const partes = diaSemanaComData.split(' - ');
    if (partes.length < 2) return '';
    const [_, dataStr] = partes;
    const [dia, mes] = dataStr.split('/').map(Number);
    const anoAtual = new Date().getFullYear();
    const data = new Date(anoAtual, mes - 1, dia);
    return data.toISOString().split('T')[0];
  }



  abrirModalAgendamento(agendamento: Agendamento) {
    const dialogRef = this.dialog.open(DialogoDesmarcarComponent, {
      width: '400px',
      data: {
        id: agendamento.id,
        militar: agendamento.militar,
        dia: agendamento.diaSemana,
        hora: agendamento.hora,
      },
    });

    dialogRef.afterClosed().subscribe((confirmado: boolean) => {
      if (confirmado) {
        this.desmarcarAgendamento(agendamento);
      }
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
      this.horariosService.stopPollingHorarios();
    }

  }

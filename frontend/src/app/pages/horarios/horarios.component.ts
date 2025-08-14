import { ActivatedRoute, Router } from '@angular/router';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ConfiguracaoAgendamento, ConfiguracoesAgendamentoService } from '../../services/configuracoes-agendamento.service';
import {
    HorariosPorDia,
    HorariosService,
} from '../../services/horarios.service';
import { Observable, Subscription, from, of } from 'rxjs';
import { catchError, concatMap, take, tap, timeout } from 'rxjs/operators';

import { Agendamento } from '../../models/agendamento';
import { AgendamentoService } from '../../services/agendamento.service';
import { AuthService } from '../../services/auth.service';
import { ConfigHorarioService } from '../../services/config-horario.service';
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
    horariosPorDia: { [key: string]: { horario: string; status: string }[] } = {
      segunda: [],
      terça: [],
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
      private configuracoesService: ConfiguracoesAgendamentoService,
      private configHorarioService: ConfigHorarioService
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

    private carregarConfigHorario(): void {
      this.configHorarioService.get().subscribe({
        next: ({ inicio, fim }) => {
          this.inicioJanelaMin = this.toMinutes(inicio);
          this.fimJanelaMin = this.toMinutes(fim);
          this.inicioAgendavelMin = this.inicioJanelaMin + 10;
          this.fimAgendavelMin = this.fimJanelaMin - 30;
          this.aplicarJanelaHorarios();
        },
        error: err => this.logger.error('Erro ao carregar janela de horários:', err)
      });
    }

    private aplicarJanelaHorarios(): void {
      const toMinutesSafe = (t?: string | null): number => {
        if (!t || typeof t !== 'string' || !t.includes(':')) return NaN;
        const [hh, mm] = t.split(':').map(Number);
        return (Number.isFinite(hh) ? hh : 0) * 60 + (Number.isFinite(mm) ? mm : 0);
      };
    
      const inicio = Number.isFinite(this.inicioJanelaMin) ? this.inicioJanelaMin : 0;
      const fim    = Number.isFinite(this.fimJanelaMin)    ? this.fimJanelaMin    : 24 * 60;
    
      const inRange = (t?: string | null) => {
        const m = toMinutesSafe(t);
        return Number.isFinite(m) && m >= inicio && m <= fim;
      };
    
      const base = Array.isArray(this.horariosBaseSemana) ? this.horariosBaseSemana : [];
      this.horariosBaseSemana = base.filter((item: any) => {
        const time = typeof item === 'string' ? item : item?.hora ?? item?.horario;
        return inRange(time);
      });
    
      const dias = Object.keys(this.horariosPorDia ?? {});
      for (const dia of dias) {
        const lista = (this.horariosPorDia as any)[dia] ?? [];
        const segura = Array.isArray(lista) ? lista : [];
        (this.horariosPorDia as any)[dia] = segura.filter((h: any) => inRange(h?.hora ?? h?.horario));
      }
    
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
      this.carregarConfigHorario();
      this.recarregarGradeSub = this.configHorarioService.recarregarGrade$.subscribe(cat => {
        if (cat === this.categoriaSelecionada) {
          this.carregarConfigHorario();
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
      const status = this.getHorarioStatus(dia, horario).status;
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
      this.horariosService
        .carregarHorariosDaSemana(this.categoriaSelecionada)
        .subscribe({
          next: (horarios: any) => {
            const makeArray = (v: any): any[] =>
              Array.isArray(v) ? v : (v ? [v] : []);               // garante array
            const normalizeItem = (it: any) => ({
              ...it,
              // aceita 'hora' ou 'horario'
              horario: it?.horario ?? it?.hora ?? '',
              status: String(it?.status ?? 'INDISPONIVEL').toUpperCase(),
            });
    
            // garante objeto
            const origem = horarios ?? {};
            const resultado: Record<string, any[]> = {};
    
            for (const dia of Object.keys(origem)) {
              // evita map/filter em null
              const arr = makeArray(origem[dia])
                .filter(Boolean)
                .map(normalizeItem);
              resultado[dia] = arr;
            }
    
            // se a API não retorna algumas chaves, evite undefined
            const DIAS_PADRAO = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
            for (const d of DIAS_PADRAO) {
              if (!resultado[d]) resultado[d] = [];
            }
    
            this.horariosPorDia = resultado;
    
            // garanta base inicial sempre como array
            if (!Array.isArray(this.horariosBaseSemana)) {
              this.horariosBaseSemana = [];
            }
    
            try {
              this.aplicarJanelaHorarios();  // já está robusta
            } catch (e) {
              this.logger.error('Falha ao aplicar janela de horários:', e);
            }
    
            this.horariosService.atualizarHorarios(this.horariosPorDia);
            this.cdr.markForCheck?.();
            this.cdr.detectChanges();
          },
          error: (error: any) => {
            this.logger.error('Erro ao carregar horários da semana:', error);
            this.snackBar.open(
              'Não foi possível carregar os horários desta semana. Verifique a conexão e tente novamente.',
              'Ciente',
              { duration: 4000 }
            );
          },
        });
    }
    
    
    /** Garante que todos os dias existam como arrays (nunca null) */
    private normalizarEstrutura(h: HorariosPorDia | null | undefined): HorariosPorDia {
      // Ajuste os nomes conforme seu contrato real
      const dias = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
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

          diasAlvo.forEach(dia => {
            const diaKey = dia.toLowerCase();
            const listaDia = this.horariosPorDia[diaKey] || [];
            if (!listaDia.some(h => h.horario === horario)) {
              listaDia.push({ horario, status: 'DISPONIVEL' });
              this.horariosPorDia[diaKey] = listaDia;
            }
          });

          this.carregarHorariosDaSemana();
          this.horariosService.atualizarHorarios(this.horariosPorDia);
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

            const diaKey = dia.toLowerCase();
            const listaDia = this.horariosPorDia[diaKey] || [];
            if (!listaDia.some(h => h.horario === horario)) {
              listaDia.push({ horario, status: 'DISPONIVEL' });
              this.horariosPorDia[diaKey] = listaDia;
            }

            this.carregarHorariosDaSemana();
            this.horariosService.atualizarHorarios(this.horariosPorDia);
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

    disponibilizarHorario(dia: string, horario: string, categoria: string): void {
      const usuario = this.authService.getUsuarioAutenticado();
      this.logger.log('Usuário autenticado:', usuario); // 👈 Adicione aqui

      const isAdmin = usuario?.categoria?.toUpperCase() === 'ADMIN';
      if (!isAdmin) {
        this.snackBar.open(
          'Somente administradores podem disponibilizar horários. Solicite acesso ao administrador.',
          'Ciente',
          { duration: 3000 }
        );
        return;
      }

      const diasAlvo = dia === 'todos' || this.diaSelecionado === 'todos' ? this.diasDaSemana : [dia];

      this.horariosService
        .alterarDisponibilidadeEmDias(horario, diasAlvo, categoria, true)
        .subscribe({
          next: () => {
            diasAlvo.forEach(d => this.atualizarHorarioLocal(d, horario, true));
            this.carregarHorariosDaSemana();
            this.horariosService.atualizarHorarios(this.horariosPorDia);
            this.snackBar.open('Horário disponibilizado', 'Ciente', { duration: 3000 });
          },
          error: () => {
            this.snackBar.open(
              'Falha ao disponibilizar o horário. Verifique a conexão ou tente novamente.',
              'Ciente',
              { duration: 5000 }
            );
          },
        });
    }

    indisponibilizarHorario(
      dia: string,
      horario: string,
      categoria: string
    ): void {
      const diasAlvo = dia === 'todos' || this.diaSelecionado === 'todos' ? this.diasDaSemana : [dia];

      this.horariosService
        .alterarDisponibilidadeEmDias(horario, diasAlvo, categoria, false)
        .subscribe({
          next: () => {
            diasAlvo.forEach(d => {
              const diaKey = d.toLowerCase();
              const listaDia = this.horariosPorDia[diaKey] || [];
              const idx = listaDia.findIndex(h => h.horario === horario);
              if (idx !== -1) {
                listaDia[idx].status = 'INDISPONIVEL';
                this.horariosPorDia[diaKey] = listaDia;
              }
            });
            this.carregarHorariosDaSemana(); // ✅ recarrega os dados atualizados
            this.horariosService.atualizarHorarios(this.horariosPorDia);
            this.snackBar.open('Horário indisponibilizado', 'Ciente', { duration: 3000 });
          },
          error: (error: any) => {
            this.logger.error('Erro ao indisponibilizar horário:', error);
            this.snackBar.open(
              'Falha ao indisponibilizar o horário. Verifique a conexão e tente novamente.',
              'Ciente',
              { duration: 5000 }
            );
          },
        });
    }

    adicionarHorarioIndividual(dia: string, horario: string, categoria: string): void { //Adiciona horário fixo na base
      this.horariosService.adicionarHorarioBase(horario, dia, categoria).subscribe({
        next: (response) => {
          // Atualiza localmente o horário no dia especificado
          const diaKey = dia.toLowerCase();
          if (!this.horariosPorDia[diaKey]) {
            this.horariosPorDia[diaKey] = [];
          }

          if (!this.horariosPorDia[diaKey].some(h => h.horario === horario)) {
            this.horariosPorDia[diaKey].push({ horario, status: 'DISPONIVEL' });
          }
    
          // Garante que ele exista na base da semana
          if (!this.horariosBaseSemana.includes(horario)) {
            this.horariosBaseSemana.push(horario);
            this.ordenarHorarios();
          }
    
          this.snackBar.open(`Horário ${horario} adicionado ao dia ${dia}.`, 'Ciente', { duration: 3000 });
          this.carregarHorariosDaSemana();
          this.horariosService.atualizarHorarios(this.horariosPorDia);
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
            const diaKey = dia.toLowerCase();
            if (this.horariosPorDia[diaKey]) {
              this.horariosPorDia[diaKey] = this.horariosPorDia[diaKey].filter(h => h.horario !== horario);
            }
          });

          this.carregarHorariosDaSemana();
          this.horariosService.atualizarHorarios(this.horariosPorDia);
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
        

    private atualizarHorarioLocal( //Atualiza estrutura local após criar/remover horarios
      dia: string,
      horario: string,
      disponivel: boolean
    ): void {
      const diaKey = dia.toLowerCase();
      const horariosDoDia = this.horariosPorDia[diaKey] || [];
      const horarioIndex = horariosDoDia.findIndex((h) => h.horario === horario);

      const status = disponivel ? 'DISPONIVEL' : 'INDISPONIVEL';

      if (horarioIndex !== -1) {
        horariosDoDia[horarioIndex].status = status;
      } else {
        horariosDoDia.push({ horario, status });
      }

      horariosDoDia.sort((a, b) => {
        const getTimeValue = (horarioStr: string) => {
          const [hours, minutes] = horarioStr.split(':').map(Number);
          return hours * 60 + minutes;
        };
        return getTimeValue(a.horario) - getTimeValue(b.horario);
      });

      this.horariosPorDia[diaKey] = horariosDoDia;
      this.horariosService.atualizarHorarios(this.horariosPorDia);
    }

    getHorarioStatus(dia: string, hora: string): { status: string } {
      const diaKey = dia.toLowerCase();
      const agendamento = this.getAgendamentoParaDiaHora(dia, hora);

      if (agendamento && this.isAgendamentoDoMilitarLogado(agendamento)) {
        return { status: 'AGENDADO' };
      }

      const horarios = this.horariosPorDia[diaKey];
      const status = horarios?.find(h => h.horario === hora)?.status?.toUpperCase();

      if (status === 'AGENDADO') {
        return { status: 'AGENDADO' };
      }

      if (status === 'REALIZADO') {
        return { status: 'REALIZADO' };
      }

      if (status === 'CANCELADO' || status === 'DISPONIVEL') {
        return { status: 'DISPONIVEL' };
      }

      return { status: 'INDISPONIVEL' };
    }
    
//-----------------☀️Gerenciamento de Dias-----------------
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
                tap((response) => {
                  const diaKey = d.toLowerCase();
                  this.horariosPorDia[diaKey] = (response.horariosAfetados || []).map(
                    (h: any) => ({
                      horario: h.horario,
                      status: h.status || 'DISPONIVEL',
                    })
                  );
                  this.horariosService.atualizarHorarios(this.horariosPorDia);
                  this.snackBar.open(
                    `Dia ${d} liberado para ${this.categoriaSelecionada}`,
                    'Ciente',
                    { duration: 3000 }
                  );
                  this.cdr.detectChanges();
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
      return (
        Array.isArray(this.agendamentos) &&
        this.agendamentos.some(
          (a) => a.diaSemana?.toLowerCase() === dia.toLowerCase()
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
                diaSemana: a.diaSemana.trim().toLowerCase(),
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
      const diaKey = dia.toLowerCase();
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
        this.indisponibilizarHorario(dia, horario, this.categoriaSelecionada);
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
        diaSemana: dia.split(' - ')[0].toLowerCase(),
        categoria: this.categoriaSelecionada
      };
    
      this.agendamentoService.createAgendamento(agendamento).subscribe({
        next: (res: Agendamento) => {
          const novoAgendamento = res;
          const confirmDialog = this.dialog.open(DialogoAgendamentoRealizadoComponent, {
            width: '400px'
          });

          confirmDialog.afterClosed().subscribe(() => {
            const diaKey = agendamento.diaSemana;
            const horariosDoDia = this.horariosPorDia[diaKey] || [];
            const index = horariosDoDia.findIndex(h => h.horario === horario);

            if (index !== -1) {
              horariosDoDia[index].status = 'AGENDADO';
            } else {
              horariosDoDia.push({ horario, status: 'AGENDADO' });
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
          let message = 'Não foi possível realizar o agendamento. Tente novamente.';
          if (err.error?.code === 'FORA_DA_JANELA_PERMITIDA') {
            message = 'Agendamentos são permitidos entre (Início + 10min) e (Fim − 30min).';
          }
          this.snackBar.open(message, 'Ciente', { duration: 5000 });
        }
      });
    }
    
    
    
    handleClick(agendamento: Agendamento): void {
      if (this.isAgendamentoDoMilitarLogado(agendamento)) {
        this.desmarcarAgendamento(agendamento);
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
      const diaSemana = dia.split(' - ')[0].trim().toLowerCase();
      const horaFormatada = hora.slice(0, 5);
      return this.agendamentos.find(a =>
        a.diaSemana.toLowerCase() === diaSemana &&
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
          const hora = agendamento.hora.slice(0, 5); // garante formato HH:mm
          const idx = this.agendamentos.findIndex(a => a.id === agendamento.id);
          if (idx !== -1) {
            this.agendamentos[idx] = {
              ...this.agendamentos[idx],
              status: 'CANCELADO',
              canceladoPor: 'USUARIO'
            };
          }

          const diaKey = dia.toLowerCase();
          if (this.horariosPorDia[diaKey]) {
            const index = this.horariosPorDia[diaKey].findIndex(h => h.horario.slice(0, 5) === hora);
            if (index !== -1) {
              this.horariosPorDia[diaKey][index].status = 'DISPONIVEL';
              this.horariosPorDia = { ...this.horariosPorDia };
              this.horariosService.atualizarHorarios(this.horariosPorDia);
            }
          }
          this.saveAgendamentos();
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
          this.carregarHorariosDaSemana();
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

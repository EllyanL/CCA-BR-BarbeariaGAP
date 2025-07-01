import { ActivatedRoute, Router } from '@angular/router';
import { Agendamento } from '../../models/agendamento';
import { Militar } from '../../models/militar';
import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import {
    HorariosPorDia,
    HorariosService,
} from '../../services/horarios.service';

import { AgendamentoService } from '../../services/agendamento.service';
import { AuthService } from '../../services/auth.service';
import { DialogoDesmarcarComponent } from 'src/app/components/admin/dialogo-desmarcar/dialogo-desmarcar.component';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserService } from 'src/app/services/user.service';
import { ServerTimeService } from 'src/app/services/server-time.service';
import { first } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { LoggingService } from 'src/app/services/logging.service';

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
    private userDataSubscription?: Subscription;
    private horariosSub?: Subscription;

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
      private logger: LoggingService
    ) {}

//---------------🔰Inicialização e Logout--------------------    
  ngOnInit(): void {
      this.usuarioLogado = this.authService.getUsuarioAutenticado();
      const usuario = this.usuarioLogado;
      this.isAdmin = usuario?.role?.toUpperCase() === 'ADMIN';
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
        error: (err) => {
          this.logger.error('Erro ao obter hora do servidor:', err);
          this.initAfterTime();
        }
      });
    }

    private initAfterTime(): void {

      this.userDataSubscription = this.userService.userData$
        .pipe(first(data => !!data && data.length > 0))
        .subscribe(userData => {
          if (userData && userData.length > 0) {
            this.cpfUsuario = userData[0].cpf;
            this.saramUsuario = userData[0].saram;
            this.militarLogado = userData[0].nomeDeGuerra;
            this.omMilitar = userData[0].om;
            this.carregarAgendamentos();

          this.route.queryParams.subscribe((params) => {
            const categoria = params['categoria'];
            if (categoria && ['GRADUADO', 'OFICIAL'].includes(categoria)) {
              this.categoriaSelecionada = categoria;
            }
            this.carregarHorariosBase();
            this.horariosService.startPollingHorarios(this.categoriaSelecionada);
            this.horariosSub = this.horariosService.horariosPorDia$.subscribe({
              next: h => {
                this.horariosPorDia = h;
                this.cdr.detectChanges();
              },
              error: err => this.logger.error('Erro ao atualizar horários:', err)
            });
          });
        }
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
          'Horário indisponível; provavelmente já reservado ou bloqueado. Escolha outro.',
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
    
    carregarHorariosDaSemana(): void {
      this.horariosService
        .carregarHorariosDaSemana(this.categoriaSelecionada)
        .subscribe({
          next: (horarios: HorariosPorDia) => {
            this.horariosPorDia = horarios;
            this.horariosService.atualizarHorarios(this.horariosPorDia);
            this.cdr.detectChanges();
          },
          error: (error: any) => {
            this.logger.error('Erro ao carregar horários da semana:', error);
            this.snackBar.open(
              'Não foi possível carregar os horários desta semana. Verifique a conexão e tente novamente.',
              'Ciente',
              {
                duration: 3000,
              }
            );
          },
        });
    }
    carregarHorariosBase(): void {
      this.horariosService.getHorariosBase().subscribe(
        (horarios: string[]) => {
          this.horariosBaseSemana = horarios;
          this.ordenarHorarios();
          this.cdr.detectChanges();
        },
        (error: any) => {
          this.logger.error('Erro ao carregar os horários base:', error);
          this.snackBar.open(
            'Não foi possível carregar os horários padrão. Recarregue a página.',
            'Ciente',
            {
              duration: 3000,
            }
          );
        }
      );
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
      if (this.horarioValido && this.horarioPersonalizado) {
        this.horariosService
          .adicionarHorarioBase(
            this.horarioPersonalizado,
            this.diaSelecionado,
            this.categoriaSelecionada
          )
          .subscribe({
            next: (horarioSalvo: any) => {
              if (!this.horariosBaseSemana.includes(horarioSalvo.horario)) {
                this.horariosBaseSemana.push(horarioSalvo.horario);
                this.ordenarHorarios();
              }

              const dia = this.diaSelecionado;
              const listaDia = this.horariosPorDia[dia] || [];
              if (!listaDia.some(h => h.horario === horarioSalvo.horario)) {
                listaDia.push({ horario: horarioSalvo.horario, status: 'DISPONIVEL' });
                this.horariosPorDia[dia] = listaDia;
              }

              this.carregarHorariosDaSemana();
              this.horariosService.atualizarHorarios(this.horariosPorDia);
              this.snackBar.open(
                'Horário base ' + horarioSalvo.horario + ' cadastrado com sucesso.',
                'Ciente',
                { duration: 3000 }
              );
              this.horarioPersonalizado = '';
              this.horarioValido = false;
            },
            error: (error: any) => {
              this.logger.error('Erro ao adicionar horário:', error);
              this.snackBar.open(
                'Não foi possível adicionar o horário. Verifique se já existe e tente novamente.',
                'Ciente',
                { duration: 5000 }
              );
            },
          });
      } else {
        this.snackBar.open(
          'Digite um horário válido (HH:mm) antes de confirmar.',
          'Ciente',
          { duration: 3000 }
        );
      }
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

            const listaDia = this.horariosPorDia[dia] || [];
            if (!listaDia.some(h => h.horario === horario)) {
              listaDia.push({ horario, status: 'DISPONIVEL' });
              this.horariosPorDia[dia] = listaDia;
            }

            this.carregarHorariosDaSemana();
            this.horariosService.atualizarHorarios(this.horariosPorDia);
            this.carregarHorariosBase();
            this.horarioPersonalizado = '';
            this.horarioValido = false;
            this.cdr.detectChanges();
          },
          error: (err) => {
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

      const isAdmin = usuario?.role?.toUpperCase() === 'ADMIN';
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
              const listaDia = this.horariosPorDia[d] || [];
              const idx = listaDia.findIndex(h => h.horario === horario);
              if (idx !== -1) {
                listaDia[idx].status = 'INDISPONIVEL';
                this.horariosPorDia[d] = listaDia;
              }
            });
            this.carregarHorariosDaSemana(); // ✅ recarrega os dados atualizados
            this.horariosService.atualizarHorarios(this.horariosPorDia);
            this.snackBar.open('Horário indisponibilizado', 'Ciente', { duration: 3000 });
          },
          error: (error) => {
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
          if (!this.horariosPorDia[dia]) {
            this.horariosPorDia[dia] = [];
          }

          if (!this.horariosPorDia[dia].some(h => h.horario === horario)) {
            this.horariosPorDia[dia].push({ horario, status: 'DISPONIVEL' });
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
        error: (error) => {
          this.logger.error('Erro ao adicionar horário individual:', error);
          this.snackBar.open(
            'Falha ao adicionar horário. Verifique os dados e tente novamente.',
            'Ciente',
            { duration: 5000 }
          );
        }
      });
    } 
    
    removerHorarioBase(): void {
      if (!this.diaSelecionado || !this.horarioPersonalizado) {
        this.snackBar.open('Selecione o dia e o horário que deseja remover.', 'Ciente', { duration: 3000 });
        return;
      }
    
      this.horariosService.removerHorarioBase(this.horarioPersonalizado, this.diaSelecionado, this.categoriaSelecionada)
        .subscribe({
          next: () => {
            this.snackBar.open('Horário removido com sucesso.', 'Ciente', { duration: 3000 });

            this.horariosBaseSemana = this.horariosBaseSemana.filter(h => h !== this.horarioPersonalizado);
            if (this.horariosPorDia[this.diaSelecionado]) {
              this.horariosPorDia[this.diaSelecionado] = this.horariosPorDia[this.diaSelecionado]
                .filter(h => h.horario !== this.horarioPersonalizado);
            }

            this.carregarHorariosDaSemana(); // atualiza a tabela
            this.horariosService.atualizarHorarios(this.horariosPorDia);
          },
          error: (err) => {
            this.logger.error('Erro ao remover horário:', err);
            this.snackBar.open('Falha ao remover o horário. Tente novamente.', 'Ciente', { duration: 3000 });
          }
        });
    }
        

    private atualizarHorarioLocal( //Atualiza estrutura local após criar/remover horarios
      dia: string,
      horario: string,
      disponivel: boolean
    ): void {
      const horariosDoDia = this.horariosPorDia[dia] || [];
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

      this.horariosPorDia[dia] = horariosDoDia;
      this.horariosService.atualizarHorarios(this.horariosPorDia);
    }

    getHorarioStatus(dia: string, hora: string): { status: string } {
      const agendamento = this.getAgendamentoParaDiaHora(dia, hora);

      if (agendamento && this.isAgendamentoDoMilitarLogado(agendamento)) {
        return { status: 'AGENDADO' };
      }

      const horarios = this.horariosPorDia[dia.toLowerCase()];
      const status = horarios?.find(h => h.horario === hora)?.status?.toUpperCase();

      if (status === 'AGENDADO') {
        return { status: 'AGENDADO' };
      }

      return { status: status === 'DISPONIVEL' ? 'DISPONIVEL' : 'INDISPONIVEL' };
    }
    
//-----------------☀️Gerenciamento de Dias-----------------
    indisponibilizarDia(dia: string): void { //Atualiza status de horários
      const horarios = this.horariosBaseSemana;
      if (!horarios || horarios.length === 0) return;

      this.horariosService
        .indisponibilizarTodosHorarios(dia, horarios, this.categoriaSelecionada)
        .subscribe({
          next: (response) => {
            // Atualize os horários do componente com a resposta
            this.carregarHorariosDaSemana();
            this.snackBar.open(
              `Dia ${dia} marcado como indisponível`,
              'Ciente',
              { duration: 3000 }
            );
          },
          error: (error) => {
            this.snackBar.open(
              'Falha ao indisponibilizar o dia. Tente novamente.',
              'Ciente',
              { duration: 3000 }
            );
          },
        });
    }

    disponibilizarDia(dia: string): void { //Atualiza status de horários
      const horariosFormatados = this.horariosBaseSemana.map((h) =>
        h.length === 5 ? `${h}:00` : h
      );
      this.horariosService
        .disponibilizarTodosHorariosComEndpoint(
          dia,
          horariosFormatados,
          this.categoriaSelecionada
        )
        .subscribe({
          next: (response) => {
            this.horariosPorDia[dia] = (response.horariosAfetados || []).map(
              (h: any) => ({
                horario: h.horario,
                status: h.status || 'DISPONIVEL',
              })
            );
            this.horariosService.atualizarHorarios(this.horariosPorDia);
            this.snackBar.open(
              `Dia ${dia} liberado para ${this.categoriaSelecionada}`,
              'Ciente',
              { duration: 3000 }
            );
            this.cdr.detectChanges();
          },
          error: (error) => {
            this.snackBar.open(
              'Falha ao disponibilizar o dia. Verifique a conexão e tente novamente.',
              'Ciente',
              { duration: 5000 }
            );
          },
        });
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
                if (a.timestamp == null) return true;
                return a.timestamp >= agora;
              });
          } else {
            this.agendamentos = [];
          }
        },
        error: (error) => {
          this.logger.error('Erro ao carregar agendamentos:', error);
          this.snackBar.open(
            'Não foi possível carregar seus agendamentos. Atualize a página.',
            'Ciente',
            {
              duration: 3000,
            }
          );
        }
      });
    }

    todosIndisponiveis(dia: string): boolean {
      const horarios = this.horariosPorDia[dia] || [];
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

      const isAdmin = militarAutenticado.role?.toUpperCase() === 'ADMIN';
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
          this.snackBar.open(`Horário ${horario} agendado com sucesso.`, 'Ciente', { duration: 3000 });
    
          // Atualiza status local
          const diaKey = agendamento.diaSemana;
          const horariosDoDia = this.horariosPorDia[diaKey] || [];
          const index = horariosDoDia.findIndex(h => h.horario === horario);
    
          if (index !== -1) {
            horariosDoDia[index].status = 'AGENDADO';
          } else {
            horariosDoDia.push({ horario, status: 'AGENDADO' });
          }
    
          this.horariosPorDia[diaKey] = [...horariosDoDia];
    
          // Atualiza lista de agendamentos local
          if (novoAgendamento) {
            this.agendamentos.push(novoAgendamento);
            this.agendamentos = [...this.agendamentos];
          }
    
          this.horariosService.atualizarHorarios(this.horariosPorDia);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.logger.error('Erro ao agendar:', err);
          this.snackBar.open(
            'Não foi possível realizar o agendamento. Tente novamente.',
            'Ciente',
            { duration: 5000 }
          );
        }
      });
    }
    
    
    
    handleClick(agendamento: Agendamento): void {
      if (this.isAgendamentoDoMilitarLogado(agendamento)) {
        this.desmarcarAgendamento(agendamento);
      }
    }

    isAgendamentoDoMilitarLogado(agendamento: Agendamento): boolean {
      const saram = agendamento.usuarioSaram || agendamento.militar?.saram;
      return saram === this.saramUsuario;
    }
    
    
    isAgendamentoDesmarcavel(agendamento: Agendamento): boolean {
      if (!agendamento || agendamento.timestamp == null) return false;
      const diffMs = agendamento.timestamp - (Date.now() + this.timeOffsetMs);
      return diffMs >= 15 * 60 * 1000;
    }

    getAgendamentoParaDiaHora(dia: string, hora: string): Agendamento | undefined {
      const diaSemana = dia.split(' - ')[0].trim().toLowerCase();
      const horaFormatada = hora.slice(0, 5);
      return this.agendamentos.find(a =>
        a.diaSemana.toLowerCase() === diaSemana &&
        a.hora.slice(0, 5) === horaFormatada
      );
    }

    desmarcarAgendamento(agendamento: Agendamento): void {
      if (!agendamento?.id) return;
    
      this.agendamentoService.deleteAgendamento(agendamento.id).subscribe({
        next: () => {
          this.snackBar.open('Agendamento desmarcado com sucesso.', 'Ciente', { duration: 3000 });
          const dia = agendamento.diaSemana;
          const hora = agendamento.hora.slice(0, 5); // garante formato HH:mm
          this.agendamentos = this.agendamentos.filter(a => a.id !== agendamento.id);

          if (this.horariosPorDia[dia]) {
            const index = this.horariosPorDia[dia].findIndex(h => h.horario.slice(0, 5) === hora);
            if (index !== -1) {
              this.horariosPorDia[dia][index].status = 'DISPONIVEL';
              this.horariosPorDia = { ...this.horariosPorDia };
              this.horariosService.atualizarHorarios(this.horariosPorDia);
            }
          }
        },
        error: (error) => {
          this.logger.error('Erro ao desmarcar agendamento:', error);
          this.snackBar.open('Não foi possível desmarcar o agendamento. Tente novamente.', 'Ciente', { duration: 5000 });
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

  trackByDia(_index: number, dia: string): string {
    return dia;
  }

  trackByHorario(_index: number, horario: string): string {
    return horario;
  }

    ngOnDestroy(): void {
      this.userDataSubscription?.unsubscribe();
      this.horariosSub?.unsubscribe();
      this.horariosService.stopPollingHorarios();
    }

  }

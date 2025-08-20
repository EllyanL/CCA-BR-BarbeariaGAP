import { ActivatedRoute, Router } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Agendamento } from '../../models/agendamento';
import { AgendamentoService } from '../../services/agendamento.service';
import { AuthService } from '../../services/auth.service';
import { HorariosComponent } from './horarios.component';
import { HorariosService } from '../../services/horarios.service';
import { HorariosPorDia, SlotHorario } from '../../models/slot-horario';
import { ConfiguracoesAgendamentoService } from '../../services/configuracoes-agendamento.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Militar } from '../../models/militar';
import { UserService } from '../../services/user.service';
import { of } from 'rxjs';

describe('HorariosComponent', () => {
  let component: HorariosComponent;
  let fixture: ComponentFixture<HorariosComponent>;
  let horariosService: jasmine.SpyObj<HorariosService>;
  let agendamentoService: jasmine.SpyObj<AgendamentoService>;
  let authService: jasmine.SpyObj<AuthService>;
  let snack: jasmine.SpyObj<MatSnackBar>;
  let configService: jasmine.SpyObj<ConfiguracoesAgendamentoService>;

  beforeEach(() => {
    horariosService = jasmine.createSpyObj('HorariosService', ['carregarHorariosDaSemana', 'getHorariosBase', 'startPollingHorarios', 'stopPollingHorarios', 'adicionarHorarioBase', 'adicionarHorarioDia', 'adicionarHorarioBaseEmDias', 'alterarDisponibilidadeEmDias', 'alterarStatusHorario', 'atualizarHorarios'], { horariosPorDia$: of({}) });
    agendamentoService = jasmine.createSpyObj('AgendamentoService', ['getAgendamentos', 'createAgendamento']);
    authService = jasmine.createSpyObj('AuthService', ['getUsuarioAutenticado', 'isAuthenticated', 'logout']);
    configService = jasmine.createSpyObj('ConfiguracoesAgendamentoService', ['getConfig']);
    configService.getConfig.and.returnValue(of({horarioInicio: '08:00', horarioFim: '18:00'}));

    const userService = { userData$: of([{ cpf: '123', saram: '1' }]) } as Partial<UserService>;
    const route = { queryParams: of({}) } as Partial<ActivatedRoute>;
    const dialog = { open: () => {} } as unknown as MatDialog;
    snack = jasmine.createSpyObj('MatSnackBar', ['open']);
    const router = { navigate: jasmine.createSpy('navigate') } as Partial<Router>;

    TestBed.configureTestingModule({
      declarations: [HorariosComponent],
      providers: [
        { provide: HorariosService, useValue: horariosService },
        { provide: AgendamentoService, useValue: agendamentoService },
        { provide: AuthService, useValue: authService },
        { provide: UserService, useValue: userService },
        { provide: ActivatedRoute, useValue: route },
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: snack },
        { provide: Router, useValue: router },
        { provide: ConfiguracoesAgendamentoService, useValue: configService }
      ]
    });
    fixture = TestBed.createComponent(HorariosComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('carregarHorariosDaSemana utiliza status fornecido pelo backend', () => {
    const horarios: HorariosPorDia = {
      segunda: [{ horario: '08:00', status: 'AGENDADO' }],
      terca: [], quarta: [], quinta: [], sexta: []
    };

    horariosService.carregarHorariosDaSemana.and.returnValue(of(horarios));
    horariosService.getHorariosBase.and.returnValue(of([]));

    component.carregarHorariosDaSemana();

    const status = component.getStatus('segunda', '08:00');
    expect(status).toBe('AGENDADO');
  });

 it('isAgendamentoDesmarcavel sempre retorna true', () => {
   const inTenMinutes = Date.now() + 10 * 60 * 1000;
      const agendamento: Agendamento = {
        hora: '08:00',
     diaSemana: 'segunda',
     categoria: 'GRADUADO',
     timestamp: inTenMinutes
   } as Agendamento;

   const resultado = component.isAgendamentoDesmarcavel(agendamento);
   expect(resultado).toBeTrue();
 });


  it('carregarAgendamentos ignora registros passados', () => {
    const now = Date.now();
    const pastTimestamp = now - 60 * 60 * 1000; // uma hora atrás
    const futureTimestamp = now + 60 * 60 * 1000; // uma hora à frente

    const agendamentos: Agendamento[] = [
      {
        hora: '08:00',
        diaSemana: 'segunda',
        categoria: 'GRADUADO',
        militar: { saram: '1', cpf: '123', nomeCompleto: '', postoGrad: '', nomeDeGuerra: '', email: '', om: '', categoria: '', secao: '', ramal: '', quadro: '' },
        timestamp: pastTimestamp
      },
      {
        hora: '09:00',
        diaSemana: 'segunda',
        categoria: 'GRADUADO',
        militar: { saram: '1', cpf: '123', nomeCompleto: '', postoGrad: '', nomeDeGuerra: '', email: '', om: '', categoria: '', secao: '', ramal: '', quadro: '' },
        timestamp: futureTimestamp
      }
    ];

    agendamentoService.getAgendamentos.and.returnValue(of(agendamentos));

    component.carregarAgendamentos();

    expect(component.agendamentos.length).toBe(1);
    expect(component.agendamentos[0].hora).toBe('09:00');
  });

  it('isAgendamentoDesmarcavel ignora offset do servidor', () => {
    component.timeOffsetMs = 5 * 60 * 1000; // servidor 5 minutos à frente
    const inEighteenMinutes = Date.now() + 18 * 60 * 1000;
    const agendamento: Agendamento = {
      hora: '08:00',
      diaSemana: 'segunda',
      categoria: 'GRADUADO',
      timestamp: inEighteenMinutes
    } as Agendamento;

    const resultado = component.isAgendamentoDesmarcavel(agendamento);
    expect(resultado).toBeTrue();
  });

  it('carregarHorariosBase gera horários conforme configuração', () => {
    configService.getConfig.and.returnValue(of({horarioInicio: '08:00', horarioFim: '09:00'}));
    component.carregarHorariosBase();
    expect(component.horariosBaseSemana[0]).toBe('08:00');
    expect(component.horariosBaseSemana[component.horariosBaseSemana.length - 1]).toBe('09:00');
  });

  it('adicionarHorarioBase bloqueia horários fora da configuração', () => {
      component.configuracao = {horarioInicio: '08:00', horarioFim: '18:00'};
    component.horarioPersonalizado = '07:00';
    component.horarioValido = true;
    component.diaSelecionado = 'segunda';
    component.adicionarHorarioBase();
    expect(horariosService.adicionarHorarioBase).not.toHaveBeenCalled();
    expect(snack.open).toHaveBeenCalled();
  });

  it('temAgendado normaliza nomes com acento', () => {
    component.agendamentos = [{ diaSemana: 'terca', hora: '08:00', categoria: 'GRADUADO' } as Agendamento];
    expect(component.temAgendado('terça')).toBeTrue();
  });

  it('toggleDia ignora dia com agendamento ativo mesmo com acento', () => {
    component.agendamentos = [{ diaSemana: 'terca', hora: '08:00', categoria: 'GRADUADO' } as Agendamento];
    const indisponibilizarSpy = spyOn(component, 'indisponibilizarDia');
    const disponibilizarSpy = spyOn(component, 'disponibilizarDia');

    component.toggleDia('terça');

    expect(indisponibilizarSpy).not.toHaveBeenCalled();
    expect(disponibilizarSpy).not.toHaveBeenCalled();
  });

  it('toggleDia chama indisponibilizarDia se existir horário disponível', () => {
    component.horariosPorDia = { segunda: [{ horario: '08:00', status: 'DISPONIVEL' }] } as unknown as HorariosPorDia;
    spyOn(component, 'temAgendado').and.returnValue(false);
    const indisponibilizarSpy = spyOn(component, 'indisponibilizarDia');
    const disponibilizarSpy = spyOn(component, 'disponibilizarDia');

    component.toggleDia('segunda');

    expect(indisponibilizarSpy).toHaveBeenCalledWith('segunda');
    expect(disponibilizarSpy).not.toHaveBeenCalled();
  });

  it('toggleDia com dia acentuado chama indisponibilizarDia se existir horário disponível', () => {
    component.horariosPorDia = { terca: [{ horario: '08:00', status: 'DISPONIVEL' }] } as unknown as HorariosPorDia;
    component.agendamentos = [];
    const indisponibilizarSpy = spyOn(component, 'indisponibilizarDia');
    const disponibilizarSpy = spyOn(component, 'disponibilizarDia');

    component.toggleDia('terça');

    expect(indisponibilizarSpy).toHaveBeenCalledWith('terça');
    expect(disponibilizarSpy).not.toHaveBeenCalled();
  });

  it('toggleDia chama disponibilizarDia se não houver horário disponível', () => {
    component.horariosPorDia = { segunda: [{ horario: '08:00', status: 'INDISPONIVEL' }] } as unknown as HorariosPorDia;
    spyOn(component, 'temAgendado').and.returnValue(false);
    const indisponibilizarSpy = spyOn(component, 'indisponibilizarDia');
    const disponibilizarSpy = spyOn(component, 'disponibilizarDia');

    component.toggleDia('segunda');

    expect(indisponibilizarSpy).not.toHaveBeenCalled();
    expect(disponibilizarSpy).toHaveBeenCalledWith('segunda');
  });

  it('getHorarioStatus considera apenas horas e minutos', () => {
    component.horariosPorDia = {
      segunda: [{ horario: '08:00:00', status: 'AGENDADO' }]
    } as unknown as HorariosPorDia;

    expect(component.getHorarioStatus('segunda', '08:00')).toBe('AGENDADO');
    expect(component.getHorarioStatus('segunda', '08:00:00')).toBe('AGENDADO');
  });

  it('carregarHorariosDaSemana normaliza horários com segundos', () => {
    const horarios: HorariosPorDia = {
      segunda: [{ horario: '08:00:00', status: 'DISPONIVEL' }],
      terca: [], quarta: [], quinta: [], sexta: []
    } as HorariosPorDia;

    horariosService.carregarHorariosDaSemana.and.returnValue(of(horarios));
    horariosService.getHorariosBase.and.returnValue(of([]));

    component.carregarHorariosDaSemana();

    expect(component.horariosPorDia['segunda'][0].horario).toBe('08:00');
    expect(component.getHorarioStatus('segunda', '08:00')).toBe('DISPONIVEL');
    expect(component.getHorarioStatus('segunda', '08:00:00')).toBe('DISPONIVEL');
  });

  it('toggleSlot alterna status e chama serviço', () => {
    const slot: SlotHorario = { id: 1, horario: '08:00', status: 'DISPONIVEL' } as SlotHorario;
    component.horariosPorDia = { segunda: [slot], terca: [], quarta: [], quinta: [], sexta: [] } as HorariosPorDia;
    horariosService.alterarStatusHorario.and.returnValue(of({} as any));
    component.toggleSlot('segunda', '08:00');
    expect(horariosService.alterarStatusHorario).toHaveBeenCalledWith(1, 'INDISPONIVEL');
    expect(horariosService.atualizarHorarios).toHaveBeenCalled();
    expect(component.horariosPorDia['segunda'][0].status).toBe('INDISPONIVEL');
  });

});

import { ActivatedRoute, Router } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Agendamento } from '../../models/agendamento';
import { AgendamentoService } from '../../services/agendamento.service';
import { AuthService } from '../../services/auth.service';
import { HorariosComponent } from './horarios.component';
import { HorariosService } from '../../services/horarios.service';
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
    horariosService = jasmine.createSpyObj('HorariosService', ['carregarHorariosDaSemana', 'getHorariosBase', 'startPollingHorarios', 'stopPollingHorarios', 'adicionarHorarioBase', 'adicionarHorarioDia', 'adicionarHorarioBaseEmDias', 'alterarDisponibilidadeEmDias'], { horariosPorDia$: of({}) });
    agendamentoService = jasmine.createSpyObj('AgendamentoService', ['getAgendamentos', 'createAgendamento']);
    authService = jasmine.createSpyObj('AuthService', ['getUsuarioAutenticado', 'isAuthenticated', 'logout']);
    configService = jasmine.createSpyObj('ConfiguracoesAgendamentoService', ['getConfig']);
    configService.getConfig.and.returnValue(of({horarioInicio: '09:00', horarioFim: '18:00'}));

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

  it('carregarAgendamentos seguido de carregarHorariosDaSemana marca horarios reservados como AGENDADO', () => {
    component.saramUsuario = '1';
    const agendamentos: Agendamento[] = [
      {
        hora: '09:00',
        diaSemana: 'segunda',
        categoria: 'GRADUADO',
        militar: { saram: '1', cpf: '123', nomeCompleto: '', postoGrad: '', nomeDeGuerra: '', email: '', om: '', categoria: '', secao: '', ramal: '', quadro: '' }
      }
    ];

    const horarios = {
      segunda: [{ horario: '09:00', status: 'DISPONIVEL' }],
      terça: [], quarta: [], quinta: [], sexta: []
    };

    agendamentoService.getAgendamentos.and.returnValue(of(agendamentos));
    horariosService.carregarHorariosDaSemana.and.returnValue(of(horarios));
    horariosService.getHorariosBase.and.returnValue(of([]));
    authService.getUsuarioAutenticado.and.returnValue({
      id: 1,
      saram: '1',
      cpf: '123',
      nomeCompleto: '',
      postoGrad: '',
      nomeDeGuerra: '',
      email: '',
      om: '',
      secao: '',
      ramal: '',
      categoria: 'USER'
    } as Militar);

    component.carregarAgendamentos();
    component.carregarHorariosDaSemana();

  const status = component.getHorarioStatus('segunda', '09:00').status;
  expect(status).toBe('AGENDADO');
});

 it('isAgendamentoDesmarcavel sempre retorna true', () => {
   const inTenMinutes = Date.now() + 10 * 60 * 1000;
   const agendamento: Agendamento = {
     hora: '09:00',
     diaSemana: 'segunda',
     categoria: 'GRADUADO',
     timestamp: inTenMinutes
   } as Agendamento;

   const resultado = component.isAgendamentoDesmarcavel(agendamento);
   expect(resultado).toBeTrue();
 });


  it('carregarAgendamentos ignora registros passados e mantém AGENDADO apenas para futuros', () => {
    component.saramUsuario = '1';
    const now = Date.now();
    const pastTimestamp = now - 60 * 60 * 1000; // uma hora atrás
    const futureTimestamp = now + 60 * 60 * 1000; // uma hora a frente

    const agendamentos: Agendamento[] = [
      {
        hora: '09:00',
        diaSemana: 'segunda',
        categoria: 'GRADUADO',
        militar: { saram: '1', cpf: '123', nomeCompleto: '', postoGrad: '', nomeDeGuerra: '', email: '', om: '', categoria: '', secao: '', ramal: '', quadro: '' },
        timestamp: pastTimestamp
      },
      {
        hora: '10:00',
        diaSemana: 'segunda',
        categoria: 'GRADUADO',
        militar: { saram: '1', cpf: '123', nomeCompleto: '', postoGrad: '', nomeDeGuerra: '', email: '', om: '', categoria: '', secao: '', ramal: '', quadro: '' },
        timestamp: futureTimestamp
      }
    ];

    const horarios = {
      segunda: [
        { horario: '09:00', status: 'DISPONIVEL' },
        { horario: '10:00', status: 'DISPONIVEL' }
      ],
      terça: [], quarta: [], quinta: [], sexta: []
    };

    agendamentoService.getAgendamentos.and.returnValue(of(agendamentos));
    horariosService.carregarHorariosDaSemana.and.returnValue(of(horarios));
    horariosService.getHorariosBase.and.returnValue(of([]));
    authService.getUsuarioAutenticado.and.returnValue({
      id: 1,
      saram: '1',
      cpf: '123',
      nomeCompleto: '',
      postoGrad: '',
      nomeDeGuerra: '',
      email: '',
      om: '',
      secao: '',
      ramal: '',
      categoria: 'USER'
    } as Militar);

    component.carregarAgendamentos();
    component.carregarHorariosDaSemana();

    const statusPassado = component.getHorarioStatus('segunda', '09:00').status;
    const statusFuturo = component.getHorarioStatus('segunda', '10:00').status;

    expect(statusPassado).not.toBe('AGENDADO');
    expect(statusFuturo).toBe('AGENDADO');
  });

  it('isAgendamentoDesmarcavel ignora offset do servidor', () => {
    component.timeOffsetMs = 5 * 60 * 1000; // servidor 5 minutos à frente
    const inEighteenMinutes = Date.now() + 18 * 60 * 1000;
    const agendamento: Agendamento = {
      hora: '09:00',
      diaSemana: 'segunda',
      categoria: 'GRADUADO',
      timestamp: inEighteenMinutes
    } as Agendamento;

    const resultado = component.isAgendamentoDesmarcavel(agendamento);
    expect(resultado).toBeTrue();
  });

  it('agendarHorario não chama serviço para datas passadas', () => {
    authService.isAuthenticated.and.returnValue(true);
    authService.getUsuarioAutenticado.and.returnValue({ id: 1, cpf: '123', saram: '1' } as Militar);
    spyOn(snack, 'open');
    const past = new Date(Date.now() - 60 * 60 * 1000);
    const dia = `segunda - ${past.getDate().toString().padStart(2, '0')}/${(past.getMonth()+1).toString().padStart(2, '0')}`;
    component.agendarHorario(dia, '09:00');
    expect(agendamentoService.createAgendamento).not.toHaveBeenCalled();
    expect(snack.open).toHaveBeenCalled();
  });

  it('carregarHorariosBase gera horários conforme configuração', () => {
    configService.getConfig.and.returnValue(of({horarioInicio: '09:00', horarioFim: '10:00'}));
    component.carregarHorariosBase();
    expect(component.horariosBaseSemana[0]).toBe('09:00');
    expect(component.horariosBaseSemana[component.horariosBaseSemana.length - 1]).toBe('10:00');
  });

  it('adicionarHorarioBase bloqueia horários fora da configuração', () => {
    component.configuracao = {horarioInicio: '09:00', horarioFim: '18:00'};
    component.horarioPersonalizado = '07:00';
    component.horarioValido = true;
    component.diaSelecionado = 'segunda';
    component.adicionarHorarioBase();
    expect(horariosService.adicionarHorarioBase).not.toHaveBeenCalled();
    expect(snack.open).toHaveBeenCalled();
  });

  it('disponibilizarHorario bloqueia horários fora da configuração', () => {
    authService.getUsuarioAutenticado.and.returnValue({categoria: 'ADMIN'} as Militar);
    component.configuracao = {horarioInicio: '09:00', horarioFim: '18:00'};
    component.disponibilizarHorario('segunda', '07:00', 'GRADUADO');
    expect(horariosService.alterarDisponibilidadeEmDias).not.toHaveBeenCalled();
    expect(snack.open).toHaveBeenCalled();
  });
});

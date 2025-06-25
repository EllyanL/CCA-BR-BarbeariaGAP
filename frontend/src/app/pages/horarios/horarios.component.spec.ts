import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Militar } from '../../services/auth.service';

import { HorariosComponent } from './horarios.component';
import { HorariosService } from '../../services/horarios.service';
import { AgendamentoService } from '../../services/agendamento.service';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { Agendamento } from '../../models/agendamento';

describe('HorariosComponent', () => {
  let component: HorariosComponent;
  let fixture: ComponentFixture<HorariosComponent>;
  let horariosService: jasmine.SpyObj<HorariosService>;
  let agendamentoService: jasmine.SpyObj<AgendamentoService>;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    horariosService = jasmine.createSpyObj('HorariosService', ['carregarHorariosDaSemana', 'getHorariosBase']);
    agendamentoService = jasmine.createSpyObj('AgendamentoService', ['getAgendamentos']);
    authService = jasmine.createSpyObj('AuthService', ['getUsuarioAutenticado', 'isAuthenticated', 'logout']);

    const userService = { userData$: of([{ cpf: '123' }]) } as Partial<UserService>;
    const route = { queryParams: of({}) } as Partial<ActivatedRoute>;
    const dialog = { open: () => {} } as unknown as MatDialog;
    const snack = { open: () => {} } as unknown as MatSnackBar;
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
        { provide: Router, useValue: router }
      ]
    });
    fixture = TestBed.createComponent(HorariosComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('carregarAgendamentos seguido de carregarHorariosDaSemana marca horarios reservados como AGENDADO', () => {
    const agendamentos: Agendamento[] = [
      {
        hora: '08:00',
        diaSemana: 'segunda',
        categoria: 'GRADUADO',
        militar: { saram: '1', cpf: '123', nomeCompleto: '', postoGrad: '', nomeDeGuerra: '', email: '', om: '', categoria: '', secao: '', ramal: '' }
      }
    ];

    const horarios = {
      segunda: [{ horario: '08:00', status: 'DISPONIVEL' }],
      terça: [], quarta: [], quinta: [], sexta: []
    };

    agendamentoService.getAgendamentos.and.returnValue(of(agendamentos));
    horariosService.carregarHorariosDaSemana.and.returnValue(of(horarios));
    horariosService.getHorariosBase.and.returnValue(of([]));
    authService.getUsuarioAutenticado.and.returnValue({
      saram: '1',
      cpf: '123',
      nomeCompleto: '',
      postoGrad: '',
      nomeDeGuerra: '',
      email: '',
      om: '',
      secao: '',
      ramal: '',
      role: 'USER'
    } as Militar);

    component.carregarAgendamentos();
    component.carregarHorariosDaSemana();

    const status = component.getHorarioStatus('segunda', '08:00').status;
    expect(status).toBe('AGENDADO');
  });

  it('isAgendamentoDesmarcavel deve retornar false para horario dentro de 15 minutos', () => {
    const inTenMinutes = Date.now() + 10 * 60 * 1000;
    const agendamento: Agendamento = {
      hora: '08:00',
      diaSemana: 'segunda',
      categoria: 'GRADUADO',
      timestamp: inTenMinutes
    } as Agendamento;

    const resultado = component.isAgendamentoDesmarcavel(agendamento);
    expect(resultado).toBeFalse();
  });

  it('carregarAgendamentos ignora registros passados e mantém AGENDADO apenas para futuros', () => {
    const now = Date.now();
    const pastTimestamp = now - 60 * 60 * 1000; // uma hora atrás
    const futureTimestamp = now + 60 * 60 * 1000; // uma hora a frente

    const agendamentos: Agendamento[] = [
      {
        hora: '08:00',
        diaSemana: 'segunda',
        categoria: 'GRADUADO',
        militar: { saram: '1', cpf: '123', nomeCompleto: '', postoGrad: '', nomeDeGuerra: '', email: '', om: '', categoria: '', secao: '', ramal: '' },
        timestamp: pastTimestamp
      },
      {
        hora: '09:00',
        diaSemana: 'segunda',
        categoria: 'GRADUADO',
        militar: { saram: '1', cpf: '123', nomeCompleto: '', postoGrad: '', nomeDeGuerra: '', email: '', om: '', categoria: '', secao: '', ramal: '' },
        timestamp: futureTimestamp
      }
    ];

    const horarios = {
      segunda: [
        { horario: '08:00', status: 'DISPONIVEL' },
        { horario: '09:00', status: 'DISPONIVEL' }
      ],
      terça: [], quarta: [], quinta: [], sexta: []
    };

    agendamentoService.getAgendamentos.and.returnValue(of(agendamentos));
    horariosService.carregarHorariosDaSemana.and.returnValue(of(horarios));
    horariosService.getHorariosBase.and.returnValue(of([]));
    authService.getUsuarioAutenticado.and.returnValue({
      saram: '1',
      cpf: '123',
      nomeCompleto: '',
      postoGrad: '',
      nomeDeGuerra: '',
      email: '',
      om: '',
      secao: '',
      ramal: '',
      role: 'USER'
    } as Militar);

    component.carregarAgendamentos();
    component.carregarHorariosDaSemana();

    const statusPassado = component.getHorarioStatus('segunda', '08:00').status;
    const statusFuturo = component.getHorarioStatus('segunda', '09:00').status;

    expect(statusPassado).not.toBe('AGENDADO');
    expect(statusFuturo).toBe('AGENDADO');
  });

  it('isAgendamentoDesmarcavel considera o offset do servidor', () => {
    component.timeOffsetMs = 5 * 60 * 1000; // servidor 5 minutos à frente
    const inEighteenMinutes = Date.now() + 18 * 60 * 1000;
    const agendamento: Agendamento = {
      hora: '08:00',
      diaSemana: 'segunda',
      categoria: 'GRADUADO',
      timestamp: inEighteenMinutes
    } as Agendamento;

    const resultado = component.isAgendamentoDesmarcavel(agendamento);
    expect(resultado).toBeFalse();
  });
});

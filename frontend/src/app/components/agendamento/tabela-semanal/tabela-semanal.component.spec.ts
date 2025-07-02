import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from 'src/app/services/auth.service';

import { TabelaSemanalComponent } from './tabela-semanal.component';
import { ServerTimeService } from 'src/app/services/server-time.service';

describe('TabelaSemanalComponent', () => {
  let component: TabelaSemanalComponent;
  let fixture: ComponentFixture<TabelaSemanalComponent>;

  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let snackSpy: jasmine.SpyObj<MatSnackBar>;

  beforeEach(() => {
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    snackSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    TestBed.configureTestingModule({
      declarations: [TabelaSemanalComponent],
      providers: [
        {
          provide: ServerTimeService,
          useValue: { getServerTime: () => of({ timestamp: Date.now() }) }
        },
        { provide: AuthService, useValue: { getUsuarioAutenticado: () => ({ id: 1 }) } },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: MatSnackBar, useValue: snackSpy }
      ]
    });
    fixture = TestBed.createComponent(TabelaSemanalComponent);
    component = fixture.componentInstance;
    component.idMilitarLogado = 1;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('exibe detalhes mesmo sem agendamentos', () => {
    component.agendamentos = [];
    fixture.detectChanges();
    const titulo = fixture.debugElement.query(By.css('.agendamentos-detalhes h3'));
    expect(titulo).toBeTruthy();
  });

  describe('getHorarioStatus', () => {
    beforeEach(() => {
      component.diasDaSemana = ['segunda'];
      component.diasComData = ['segunda - 01/01'];
      component.horariosBaseSemana = ['08:00'];
      fixture.detectChanges();
    });

    it('retorna status disponível quando horário está livre', () => {
      component.horariosPorDia = {
        segunda: [{ horario: '08:00', status: 'DISPONIVEL' }]
      } as any;

      const status = component.getHorarioStatus('segunda', '08:00');
      expect(status).toEqual({ cor: 'primary', texto: 'Disponível', acao: 'agendar' });
    });

    it('retorna status agendado do usuário', () => {
      component.saramUsuario = '123';
      component.agendamentos = [{
        id: 1,
        data: '',
        hora: '08:00',
        diaSemana: 'segunda',
        categoria: '',
        militar: {
          id: 1,
          saram: '123',
          cpf: '123',
          nomeCompleto: '',
          postoGrad: '',
          nomeDeGuerra: '',
          email: '',
          om: '',
          categoria: '',
          secao: '',
          ramal: ''
        }
      }];

      const status = component.getHorarioStatus('segunda', '08:00');
      expect(status).toEqual({ cor: 'accent', texto: 'Agendado', acao: 'cancelar' });
    });

    it('retorna status agendado por outro usuário', () => {
      component.saramUsuario = '123';
      component.agendamentos = [{
        id: 1,
        data: '',
        hora: '08:00',
        diaSemana: 'segunda',
        categoria: '',
        militar: {
          id: 2,
          saram: '999',
          cpf: '999',
          nomeCompleto: '',
          postoGrad: '',
          nomeDeGuerra: '',
          email: '',
          om: '',
          categoria: '',
          secao: '',
          ramal: ''
        }
      }];

      const status = component.getHorarioStatus('segunda', '08:00');
      expect(status).toEqual({ cor: 'basic', texto: 'Agendado', acao: 'ocupado' });
    });

    it('retorna cancelar quando usuarioId do horario pertence ao militar logado', () => {
      component.agendamentos = [];
      component.horariosPorDia = {
        segunda: [{ horario: '08:00', status: 'AGENDADO', usuarioId: 1 }]
      } as any;

      const status = component.getHorarioStatus('segunda', '08:00');
      expect(status).toEqual({ cor: 'accent', texto: 'Agendado', acao: 'cancelar' });
    });

it('isAgendamentoDesmarcavel verifica usuarioId do horario', () => {
  component.idMilitarLogado = 1;
  component.horariosPorDia = {
    segunda: [
      { horario: '08:00', status: 'AGENDADO', usuarioId: 1 },
      { horario: '09:00', status: 'AGENDADO', usuarioId: 2 }
    ]
  } as any;

  const podeCancelar = component.isAgendamentoDesmarcavel(undefined, 'segunda', '08:00');
  const naoPodeCancelar = component.isAgendamentoDesmarcavel(undefined, 'segunda', '09:00');

  expect(podeCancelar).toBeTrue();
  expect(naoPodeCancelar).toBeFalse();
});


    it('detecta agendamento do usuário via id', () => {
      component.idMilitarLogado = 7;
      const agendamento = {
        hora: '08:00',
        diaSemana: 'segunda',
        categoria: '',
        militar: {
          id: 7,
          saram: '999'
        }
      } as any;
      const result = component.isAgendamentoDoMilitarLogado(agendamento);
      expect(result).toBeTrue();
    });
  });

  it('atualiza cor do botão conforme status', () => {
    component.diasDaSemana = ['segunda'];
    component.diasComData = ['segunda - 01/01'];
    component.horariosBaseSemana = ['08:00'];
    component.horariosPorDia = {
      segunda: [{ horario: '08:00', status: 'DISPONIVEL' }]
    } as any;
    fixture.detectChanges();

    let botao = fixture.debugElement.query(By.css('button.tabela-botao-disponivel'));
    expect(botao.attributes['ng-reflect-color']).toBe('primary');

    component.saramUsuario = '123';
    component.agendamentos = [{
      id: 1,
      data: '',
      hora: '08:00',
      diaSemana: 'segunda',
      categoria: '',
      militar: {
        id: 1,
        saram: '123',
        cpf: '123',
        nomeCompleto: '',
        postoGrad: '',
        nomeDeGuerra: '',
        email: '',
        om: '',
        categoria: '',
        secao: '',
        ramal: ''
      }
    }];

    fixture.detectChanges();

    botao = fixture.debugElement.query(By.css('button.botao-agendado'));
    expect(botao.nativeElement.textContent.trim().toUpperCase()).toBe('AGENDADO');
    expect(botao.nativeElement.disabled).toBeFalse();

    component.agendamentos = [{
      id: 1,
      data: '',
      hora: '08:00',
      diaSemana: 'segunda',
      categoria: '',
      militar: {
        id: 2,
        saram: '999',
        cpf: '999',
        nomeCompleto: '',
        postoGrad: '',
        nomeDeGuerra: '',
        email: '',
        om: '',
        categoria: '',
        secao: '',
        ramal: ''
      }
    }];

    fixture.detectChanges();

    botao = fixture.debugElement.query(By.css('button.botao-agendado'));
    expect(botao.nativeElement.disabled).toBeTrue();
  });

  it('nao abre dialogo se horario for em menos de 15 minutos', () => {
    const now = new Date();
    const inTen = new Date(now.getTime() + 10 * 60 * 1000);
    const hora = inTen.toTimeString().slice(0, 5);
    const dia = now.getDate().toString().padStart(2, '0');
    const mes = (now.getMonth() + 1).toString().padStart(2, '0');

    component.diasDaSemana = ['segunda'];
    component.diasComData = [`segunda - ${dia}/${mes}`];
    component.horariosBaseSemana = [hora];
    component.horariosPorDia = { segunda: [{ horario: hora, status: 'DISPONIVEL' }] } as any;

    component.agendarCorte(component.diasComData[0], hora);

    expect(snackSpy.open).toHaveBeenCalled();
    expect(dialogSpy.open).not.toHaveBeenCalled();
  });

  describe('desabilitarBotoesPorHorario', () => {
    afterEach(() => {
      jasmine.clock().uninstall();
    });

    it('permite agendar na segunda-feira às 12h', () => {
      const mondayNoon = new Date('2023-01-02T12:00:00'); // segunda-feira
      jasmine.clock().install();
      jasmine.clock().mockDate(mondayNoon);

      const result = (component as any)['desabilitarBotoesPorHorario']();

      expect(result).toBeFalse();
      expect(component.feedbackMessageTitle).toBe('');
    });

    it('bloqueia agendamento na segunda-feira às 8h', () => {
      const mondayMorning = new Date('2023-01-02T08:00:00');
      jasmine.clock().install();
      jasmine.clock().mockDate(mondayMorning);

      const result = (component as any)['desabilitarBotoesPorHorario']();

      expect(result).toBeTrue();
      expect(component.feedbackMessageTitle).toBe(
        'Só é possível agendar entre 9h10 e 18h10 de segunda a sexta. Aguarde!'
      );
    });

    it('bloqueia agendamento no sábado às 12h', () => {
      const saturdayNoon = new Date('2023-01-07T12:00:00'); // sabado
      jasmine.clock().install();
      jasmine.clock().mockDate(saturdayNoon);

      const result = (component as any)['desabilitarBotoesPorHorario']();

      expect(result).toBeTrue();
      expect(component.feedbackMessageTitle).toBe(
        'Só é possível agendar entre 9h10 e 18h10 de segunda a sexta. Aguarde!'
      );
    });
  });
});

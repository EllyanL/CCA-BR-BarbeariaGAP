import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthService } from 'src/app/services/auth.service';
import { By } from '@angular/platform-browser';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ServerTimeService } from 'src/app/services/server-time.service';
import { TabelaSemanalComponent } from './tabela-semanal.component';
import { ConfiguracoesAgendamentoService } from 'src/app/services/configuracoes-agendamento.service';
import { of } from 'rxjs';

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
        { provide: MatSnackBar, useValue: snackSpy },
        {
          provide: ConfiguracoesAgendamentoService,
          useValue: { getConfig: () => of({ horarioInicio: '08:00', horarioFim: '09:00' }) }
        }
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

  // Tests for getSlot and statusClass could be added here if needed

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

    component.abrirDialogoAgendamento(component.diasComData[0], hora);

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

    it('bloqueia agendamento na segunda-feira às 8h30', () => {
      const mondayEarly = new Date('2023-01-02T08:30:00');
      jasmine.clock().install();
      jasmine.clock().mockDate(mondayEarly);

      const result = (component as any)['desabilitarBotoesPorHorario']();
      expect(result).toBeTrue();
      expect(component.feedbackMessageTitle).toBe(
        'Só é possível agendar entre 9h e 18h de segunda a sexta. Aguarde!'
      );
    });

    it('bloqueia agendamento no sábado às 12h', () => {
      const saturdayNoon = new Date('2023-01-07T12:00:00'); // sábado
      jasmine.clock().install();
      jasmine.clock().mockDate(saturdayNoon);

      const result = (component as any)['desabilitarBotoesPorHorario']();
      expect(result).toBeTrue();
      expect(component.feedbackMessageTitle).toBe(
        'Só é possível agendar entre 9h e 18h de segunda a sexta. Aguarde!'
      );
    });
  });
});

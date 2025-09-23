import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthService } from 'src/app/services/auth.service';
import { By } from '@angular/platform-browser';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ServerTimeService } from 'src/app/services/server-time.service';
import { TabelaSemanalComponent } from './tabela-semanal.component';
import { ConfiguracoesAgendamentoService } from 'src/app/services/configuracoes-agendamento.service';
import { of } from 'rxjs';
import { StatusFormatPipe } from 'src/app/pipes/status-format.pipe';
import { ErrorMessagesService } from 'src/app/services/error-messages.service';

describe('TabelaSemanalComponent', () => {
  let component: TabelaSemanalComponent;
  let fixture: ComponentFixture<TabelaSemanalComponent>;

  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let snackSpy: jasmine.SpyObj<MatSnackBar>;

  beforeEach(() => {
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    snackSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    TestBed.configureTestingModule({
      declarations: [TabelaSemanalComponent, StatusFormatPipe],
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
          useValue: { getConfig: () => of({ horarioInicio: '09:00', horarioFim: '18:00' }) }
        },
        ErrorMessagesService
      ]
    });
    fixture = TestBed.createComponent(TabelaSemanalComponent);
    component = fixture.componentInstance;
    component.idMilitarLogado = 1;
    fixture.detectChanges();
    snackSpy.open.calls.reset();
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
    component.diasComData = [`${dia}/${mes}`];
    component.horariosBaseSemana = [hora];
    component.horariosPorDia = { segunda: [{ horario: hora, status: 'DISPONIVEL' }] } as any;

    component.abrirDialogoAgendamento(component.getLabelDiaComData('segunda'), hora);

    expect(snackSpy.open).toHaveBeenCalled();
    expect(dialogSpy.open).not.toHaveBeenCalled();
  });

  it('inclui horários personalizados da semana na base exibida', () => {
    component.horariosPorDia = {
      segunda: [{ horario: '14:15', status: 'DISPONIVEL' }]
    } as any;

    component.loadHorariosBase();
    (component as any).aplicarJanelaHorarios();

    expect(component.horariosBaseSemana).toContain('14:15');
    expect(component.getSlot('segunda', '14:15')?.status).toBe('DISPONIVEL');
  });

  describe('destaque de agendamentos próprios', () => {
    beforeEach(() => {
      component.usuarioCarregado = true;
      component.diasDaSemana = ['segunda'] as any;
      component.diasComData = ['01/01'];
      component.horariosBaseSemana = ['09:00'];
      component.agendamentos = [];
    });

    it('aplica classe especial quando o slot é do militar logado', () => {
      component.idMilitarLogado = 1;
      component.horariosPorDia = {
        segunda: [{ horario: '09:00', status: 'AGENDADO', usuarioId: 1 }]
      } as any;

      fixture.detectChanges();

      const botao = fixture.debugElement.query(By.css('button'));
      expect(botao).toBeTruthy();
      expect(botao.nativeElement.classList).toContain('botao-agendado');
      expect(botao.nativeElement.classList).toContain('botao-agendado-proprio');
      expect(botao.nativeElement.disabled).toBeFalse();
    });

    it('mantém estilo padrão para agendamentos de outros usuários', () => {
      component.idMilitarLogado = 1;
      component.horariosPorDia = {
        segunda: [{ horario: '09:00', status: 'AGENDADO', usuarioId: 99 }]
      } as any;

      fixture.detectChanges();

      const botao = fixture.debugElement.query(By.css('button'));
      expect(botao).toBeTruthy();
      expect(botao.nativeElement.classList).toContain('botao-agendado');
      expect(botao.nativeElement.classList).not.toContain('botao-agendado-proprio');
      expect(botao.nativeElement.disabled).toBeTrue();
    });
  });

  describe('regra de 15 dias para novos agendamentos', () => {
    beforeEach(() => {
      component.usuarioCarregado = true;
      component.diasDaSemana = ['segunda'] as any;
      component.diasComData = ['10/06'];
      component.horariosBaseSemana = ['09:00'];
      component.horariosPorDia = {
        segunda: [{ horario: '09:00', status: 'DISPONIVEL' }]
      } as any;
      component.inicioDaSemana = new Date('2024-06-10T00:00:00');
    });

    it('desabilita botão quando existe agendamento recente', () => {
      component.agendamentos = [{
        data: '2024-06-05',
        hora: '09:00',
        diaSemana: 'quarta',
        categoria: 'GRADUADO'
      } as any];

      fixture.detectChanges();

      const botao = fixture.debugElement.query(By.css('button'));
      expect(botao.nativeElement.disabled).toBeTrue();
    });

    it('mantém botão habilitado quando diferença é igual ou superior a 15 dias', () => {
      component.agendamentos = [{
        data: '2024-05-20',
        hora: '09:00',
        diaSemana: 'segunda',
        categoria: 'GRADUADO'
      } as any];

      fixture.detectChanges();

      const botao = fixture.debugElement.query(By.css('button'));
      expect(botao.nativeElement.disabled).toBeFalse();
    });
  });

  describe('quando o agendamento está bloqueado', () => {
    beforeEach(() => {
      component.usuarioCarregado = true;
      component.diasDaSemana = ['segunda'] as any;
      component.diasComData = ['01/01'];
      component.horariosBaseSemana = ['09:00'];
      component.horariosPorDia = {
        segunda: [{ horario: '09:00', status: 'DISPONIVEL' }]
      } as any;
      component.feedbackMessageTitle = 'Agendamento bloqueado';
      component.agendamentoBloqueado = true;
      fixture.detectChanges();
    });

    it('mantém a tabela visível e exibe mensagem de feedback', () => {
      const tabela = fixture.debugElement.query(By.css('table.tabela'));
      expect(tabela).toBeTruthy();

      const feedback = fixture.debugElement.query(By.css('.feedback-message'));
      expect(feedback).toBeTruthy();
      expect(feedback.nativeElement.textContent).toContain('Agendamento bloqueado');
    });

    it('mantém os botões desabilitados quando bloqueado', () => {
      const botao = fixture.debugElement.query(By.css('button'));
      expect(botao).toBeTruthy();
      expect(botao.nativeElement.disabled).toBeTrue();
    });
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

    it('bloqueia agendamento na segunda-feira antes da liberação', () => {
      const mondayEarly = new Date('2023-01-02T08:00:00');
      jasmine.clock().install();
      jasmine.clock().mockDate(mondayEarly);

      const result = (component as any)['desabilitarBotoesPorHorario']();
      expect(result).toBeTrue();
      expect(component.feedbackMessageTitle).toBe(
        'Agendamentos disponíveis a partir das 08:30.'
      );
    });

    it('bloqueia agendamento no sábado às 12h', () => {
      const saturdayNoon = new Date('2023-01-07T12:00:00'); // sábado
      jasmine.clock().install();
      jasmine.clock().mockDate(saturdayNoon);

      const result = (component as any)['desabilitarBotoesPorHorario']();
      expect(result).toBeTrue();
      expect(component.feedbackMessageTitle).toBe(
        'Só é possível agendar entre 09:00 e 18:00 de segunda a sexta. Aguarde!'
      );
    });
  });
});

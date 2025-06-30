import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

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
        { provide: MatDialog, useValue: dialogSpy },
        { provide: MatSnackBar, useValue: snackSpy }
      ]
    });
    fixture = TestBed.createComponent(TabelaSemanalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
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
      component.cpfMilitarLogado = '123';
      component.agendamentos = [{
        id: 1,
        data: '',
        hora: '08:00',
        diaSemana: 'segunda',
        categoria: '',
        militar: {
          saram: '',
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
      component.cpfMilitarLogado = '123';
      component.agendamentos = [{
        id: 1,
        data: '',
        hora: '08:00',
        diaSemana: 'segunda',
        categoria: '',
        militar: {
          saram: '',
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
      expect(status).toEqual({ cor: 'disabled', texto: 'Indisponível', acao: 'nenhuma' });
    });

    it('retorna status indisponível quando horário não existe', () => {
      component.horariosPorDia = {
        segunda: [{ horario: '08:00', status: 'INDISPONIVEL' }]
      } as any;

      const status = component.getHorarioStatus('segunda', '08:00');
      expect(status).toEqual({ cor: 'disabled', texto: 'Indisponível', acao: 'nenhuma' });
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

    component.cpfMilitarLogado = '123';
    component.agendamentos = [{
      id: 1,
      data: '',
      hora: '08:00',
      diaSemana: 'segunda',
      categoria: '',
      militar: {
        saram: '',
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
});

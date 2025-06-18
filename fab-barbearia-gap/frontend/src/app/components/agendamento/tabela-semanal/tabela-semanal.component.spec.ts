import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';

import { TabelaSemanalComponent } from './tabela-semanal.component';
import { ServerTimeService } from 'src/app/services/server-time.service';

describe('TabelaSemanalComponent', () => {
  let component: TabelaSemanalComponent;
  let fixture: ComponentFixture<TabelaSemanalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TabelaSemanalComponent],
      providers: [
        {
          provide: ServerTimeService,
          useValue: { getServerTime: () => of({ timestamp: Date.now() }) }
        }
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
});

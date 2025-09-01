import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';

import { GerenciarRegistrosComponent } from './gerenciar-registros.component';
import { AgendamentoService } from '../../services/agendamento.service';
import { LoggingService } from '../../services/logging.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { StatusFormatPipe } from '../../pipes/status-format.pipe';

describe('GerenciarRegistrosComponent', () => {
  let component: GerenciarRegistrosComponent;
  let fixture: ComponentFixture<GerenciarRegistrosComponent>;
  let agendamentoService: jasmine.SpyObj<AgendamentoService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(() => {
    agendamentoService = jasmine.createSpyObj('AgendamentoService', ['listarAgendamentosAdmin']);
    agendamentoService.listarAgendamentosAdmin.and.returnValue(of([]));
    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);

    TestBed.configureTestingModule({
      declarations: [GerenciarRegistrosComponent, StatusFormatPipe],
      providers: [
        { provide: AgendamentoService, useValue: agendamentoService },
        { provide: LoggingService, useValue: { error: () => {} } },
        { provide: MatSnackBar, useValue: snackBar },
        StatusFormatPipe
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });

    fixture = TestBed.createComponent(GerenciarRegistrosComponent);
    component = fixture.componentInstance;
  });

  it('carrega registros e aplica filtros', () => {
    const aplicarFiltrosSpy = spyOn(component, 'aplicarFiltros');
    const registros: any[] = [];
    agendamentoService.listarAgendamentosAdmin.and.returnValue(of(registros));

    component.carregarAgendamentos();

    expect(agendamentoService.listarAgendamentosAdmin).toHaveBeenCalledWith(undefined, undefined, undefined);
    expect(component.todosRegistros).toEqual(registros);
    expect(aplicarFiltrosSpy).toHaveBeenCalled();
    expect(snackBar.open).not.toHaveBeenCalled();
  });

  it('envia datas formatadas ao buscar registros por intervalo', () => {
    const registrosJan10 = [{ data: '2024-01-10', hora: '08:00' } as any];
    agendamentoService.listarAgendamentosAdmin.and.returnValue(of(registrosJan10));

    component.filtros.dataInicio = new Date('2024-01-10');
    component.filtros.dataFim = new Date('2024-01-10');
    component.carregarAgendamentos();
    expect(agendamentoService.listarAgendamentosAdmin).toHaveBeenCalledWith(
      undefined,
      '2024-01-10',
      '2024-01-10'
    );
    expect(component.todosRegistros).toEqual(registrosJan10);

    const registrosJan11 = [{ data: '2024-01-11', hora: '09:00' } as any];
    agendamentoService.listarAgendamentosAdmin.and.returnValue(of(registrosJan11));

    component.filtros.dataInicio = new Date('2024-01-11');
    component.filtros.dataFim = new Date('2024-01-12');
    component.carregarAgendamentos();
    expect(agendamentoService.listarAgendamentosAdmin).toHaveBeenCalledWith(
      undefined,
      '2024-01-11',
      '2024-01-12'
    );
    expect(component.todosRegistros).toEqual(registrosJan11);
  });
});


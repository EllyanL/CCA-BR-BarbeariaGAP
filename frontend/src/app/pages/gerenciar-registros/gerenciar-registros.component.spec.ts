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

    expect(agendamentoService.listarAgendamentosAdmin).toHaveBeenCalledWith();
    expect(component.todosRegistros).toEqual(registros);
    expect(aplicarFiltrosSpy).toHaveBeenCalled();
    expect(snackBar.open).not.toHaveBeenCalled();
  });
});


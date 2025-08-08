import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';

import { GerenciarRegistrosComponent } from './gerenciar-registros.component';
import { AgendamentoService } from '../../services/agendamento.service';
import { LoggingService } from '../../services/logging.service';
import { MatSnackBar } from '@angular/material/snack-bar';

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
      declarations: [GerenciarRegistrosComponent],
      providers: [
        { provide: AgendamentoService, useValue: agendamentoService },
        { provide: LoggingService, useValue: { error: () => {} } },
        { provide: MatSnackBar, useValue: snackBar }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });

    fixture = TestBed.createComponent(GerenciarRegistrosComponent);
    component = fixture.componentInstance;
  });

  it('não chama o serviço quando datas estão ausentes', () => {
    component.dataInicial = undefined;
    component.dataFinal = new Date();

    component.carregarAgendamentos();

    expect(agendamentoService.listarAgendamentosAdmin).not.toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalled();
  });
});


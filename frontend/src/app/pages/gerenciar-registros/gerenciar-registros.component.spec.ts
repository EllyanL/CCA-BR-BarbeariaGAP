import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
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
      imports: [FormsModule],
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
    const registrosJan10 = [{ data: '10/01/2024', hora: '08:00' } as any];
    agendamentoService.listarAgendamentosAdmin.and.returnValue(of(registrosJan10));

    component.filtros.dataInicio = new Date(2024, 0, 10);
    component.filtros.dataFim = new Date(2024, 0, 10);
    component.carregarAgendamentos();
    expect(agendamentoService.listarAgendamentosAdmin).toHaveBeenCalledWith(
      undefined,
      '10/01/2024',
      '10/01/2024'
    );
    expect(component.todosRegistros).toEqual(registrosJan10);

    const registrosJan11 = [{ data: '11/01/2024', hora: '09:00' } as any];
    agendamentoService.listarAgendamentosAdmin.and.returnValue(of(registrosJan11));

    component.filtros.dataInicio = new Date(2024, 0, 11);
    component.filtros.dataFim = new Date(2024, 0, 12);
    component.carregarAgendamentos();
    expect(agendamentoService.listarAgendamentosAdmin).toHaveBeenCalledWith(
      undefined,
      '11/01/2024',
      '12/01/2024'
    );
    expect(component.todosRegistros).toEqual(registrosJan11);
  });

  it('simula seleção de intervalo e chama serviço com datas formatadas', () => {
    agendamentoService.listarAgendamentosAdmin.and.returnValue(of([]));
    fixture.detectChanges();
    agendamentoService.listarAgendamentosAdmin.calls.reset();

    const startInput = fixture.debugElement.query(By.css('input[matStartDate]'));
    const endInput = fixture.debugElement.query(By.css('input[matEndDate]'));

    startInput.triggerEventHandler('ngModelChange', new Date(2024, 2, 1));
    fixture.detectChanges();
    expect(agendamentoService.listarAgendamentosAdmin).not.toHaveBeenCalled();

    endInput.triggerEventHandler('ngModelChange', new Date(2024, 2, 5));
    fixture.detectChanges();
    expect(agendamentoService.listarAgendamentosAdmin).toHaveBeenCalledWith(
      undefined,
      '01/03/2024',
      '05/03/2024'
    );
  });

  it('mantém datas com dia maior que 12 exibidas como dd/MM/yyyy', () => {
    const registro = {
      data: '25/01/2024',
      hora: '09:00',
      militar: { nomeDeGuerra: 'joao', postoGrad: 'SGT' },
      status: 'AGENDADO',
      canceladoPor: null
    } as any;

    component.todosRegistros = [registro];
    component.aplicarFiltros();
    fixture.detectChanges();

    expect(component.formatarDataBR(registro.data)).toBe('25/01/2024');

    const tabela = fixture.nativeElement.querySelector('table');
    expect(tabela).withContext('Tabela deveria estar presente para verificar a data').toBeTruthy();
    expect(tabela!.textContent).toContain('25/01/2024');
  });
});


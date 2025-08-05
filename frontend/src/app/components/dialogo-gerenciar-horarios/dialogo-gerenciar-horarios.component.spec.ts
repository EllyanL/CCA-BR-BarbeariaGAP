import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DialogoGerenciarHorariosComponent } from './dialogo-gerenciar-horarios.component';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfiguracoesAgendamentoService } from 'src/app/services/configuracoes-agendamento.service';
import { of } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('DialogoGerenciarHorariosComponent', () => {
  let component: DialogoGerenciarHorariosComponent;
  let fixture: ComponentFixture<DialogoGerenciarHorariosComponent>;
  let serviceSpy: jasmine.SpyObj<ConfiguracoesAgendamentoService>;
  let snackSpy: jasmine.SpyObj<MatSnackBar>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<DialogoGerenciarHorariosComponent>>;

  beforeEach(() => {
    serviceSpy = jasmine.createSpyObj('ConfiguracoesAgendamentoService', ['getConfig', 'updateConfig']);
    snackSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    TestBed.configureTestingModule({
      declarations: [DialogoGerenciarHorariosComponent],
      imports: [FormsModule, MatCardModule, MatButtonModule, BrowserAnimationsModule],
      providers: [
        { provide: ConfiguracoesAgendamentoService, useValue: serviceSpy },
        { provide: MatSnackBar, useValue: snackSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy }
      ]
    }).compileComponents();

    serviceSpy.getConfig.and.returnValue(of({ horarioInicio: '08:00', horarioFim: '17:00' }));
    serviceSpy.updateConfig.and.returnValue(of({ horarioInicio: '09:00', horarioFim: '18:00' }));

    fixture = TestBed.createComponent(DialogoGerenciarHorariosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('carrega os horários ao iniciar', () => {
    expect(serviceSpy.getConfig).toHaveBeenCalled();
    expect(component.horarioInicio).toBe('08:00');
    expect(component.horarioFim).toBe('17:00');
  });

  it('envia os horários ao salvar', () => {
    component.horarioInicio = '09:00';
    component.horarioFim = '18:00';
    component.salvar();

    expect(serviceSpy.updateConfig).toHaveBeenCalledWith({ horarioInicio: '09:00', horarioFim: '18:00' });
    expect(snackSpy.open).toHaveBeenCalled();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
  });
});

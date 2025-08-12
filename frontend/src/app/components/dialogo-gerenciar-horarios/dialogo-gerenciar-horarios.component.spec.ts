import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { DialogoGerenciarHorariosComponent } from './dialogo-gerenciar-horarios.component';
import { MatDialogRef } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';

describe('DialogoGerenciarHorariosComponent', () => {
  let component: DialogoGerenciarHorariosComponent;
  let fixture: ComponentFixture<DialogoGerenciarHorariosComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<DialogoGerenciarHorariosComponent>>;

  beforeEach(async () => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      declarations: [DialogoGerenciarHorariosComponent],
      imports: [FormsModule],
      providers: [{ provide: MatDialogRef, useValue: dialogRefSpy }],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(DialogoGerenciarHorariosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('generate time slots', () => {
    component.horaInicio = '08:00';
    component.horaFim = '09:00';
    component.intervalo = 30;
    component.gerarHorarios();
    expect(component.horariosGerados.length).toBe(3);
    expect(component.horariosGerados[0].hora).toBe('08:00');
    expect(component.horariosGerados[2].hora).toBe('09:00');
  });

  it('confirm returns selected hours', () => {
    component.horariosGerados = [
      { hora: '08:00', selecionado: true },
      { hora: '08:30', selecionado: false }
    ];
    component.confirmar();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(['08:00']);
  });
});

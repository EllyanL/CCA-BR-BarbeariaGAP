import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DialogoGerenciarHorariosComponent } from './dialogo-gerenciar-horarios.component';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('DialogoGerenciarHorariosComponent', () => {
  let component: DialogoGerenciarHorariosComponent;
  let fixture: ComponentFixture<DialogoGerenciarHorariosComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<DialogoGerenciarHorariosComponent>>;

  beforeEach(async () => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      declarations: [DialogoGerenciarHorariosComponent],
      imports: [FormsModule, MatDialogModule, MatSnackBarModule, HttpClientTestingModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: { categoria: 'GRADUADO' } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(DialogoGerenciarHorariosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('validates time inputs', () => {
    component.horaInicio = '08:00';
    component.horaFim = '09:00';
    expect(component.isValid()).toBeTrue();
  });
});


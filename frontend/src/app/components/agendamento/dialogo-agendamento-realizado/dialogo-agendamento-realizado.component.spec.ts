import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogoAgendamentoRealizadoComponent } from './dialogo-agendamento-realizado.component';

describe('DialogoAgendamentoRealizadoComponent', () => {
  let component: DialogoAgendamentoRealizadoComponent;
  let fixture: ComponentFixture<DialogoAgendamentoRealizadoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DialogoAgendamentoRealizadoComponent],
      providers: [
        { provide: MatDialogRef, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DialogoAgendamentoRealizadoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

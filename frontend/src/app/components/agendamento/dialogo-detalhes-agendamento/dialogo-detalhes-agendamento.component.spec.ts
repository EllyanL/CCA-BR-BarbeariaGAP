import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { DialogoDetalhesAgendamentoComponent } from './dialogo-detalhes-agendamento.component';

describe('DialogoDetalhesAgendamentoComponent', () => {
  let component: DialogoDetalhesAgendamentoComponent;
  let fixture: ComponentFixture<DialogoDetalhesAgendamentoComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MatDialogModule, MatSnackBarModule],
      declarations: [DialogoDetalhesAgendamentoComponent],
      providers: [
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: {} }
      ]
    });
    fixture = TestBed.createComponent(DialogoDetalhesAgendamentoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

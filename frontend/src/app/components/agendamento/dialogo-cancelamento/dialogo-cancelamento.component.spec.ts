import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogoCancelamentoComponent } from './dialogo-cancelamento.component';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

describe('DialogoCancelamentoComponent', () => {
  let component: DialogoCancelamentoComponent;
  let fixture: ComponentFixture<DialogoCancelamentoComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MatDialogModule],
      declarations: [DialogoCancelamentoComponent],
      providers: [
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: { diaSemana: 'segunda', hora: '09:00', usuarioId: 1, data: '2024-01-01' } }
      ]
    });
    fixture = TestBed.createComponent(DialogoCancelamentoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

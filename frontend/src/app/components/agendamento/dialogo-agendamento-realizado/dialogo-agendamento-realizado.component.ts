import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-dialogo-agendamento-realizado',
  template: `
    <h1 mat-dialog-title>Agendamento realizado</h1>
    <div mat-dialog-actions align="end">
      <button mat-button color="primary" (click)="fechar()">Ciente</button>
    </div>
  `,
})
export class DialogoAgendamentoRealizadoComponent {
  constructor(private dialogRef: MatDialogRef<DialogoAgendamentoRealizadoComponent>) {}

  fechar(): void {
    this.dialogRef.close();
  }
}

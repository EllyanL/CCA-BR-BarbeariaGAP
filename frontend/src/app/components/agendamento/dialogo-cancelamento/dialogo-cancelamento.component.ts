import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface DialogData {
  diaSemana: string;
  hora: string;
  usuarioId?: number;
  data: string;
}

@Component({
  selector: 'app-dialogo-cancelamento',
  template: `
  <h1 mat-dialog-title class="confirm-dialog__title">Confirmação</h1>
<div mat-dialog-content class="confirm-dialog__content">
  <p class="confirm-dialog__warning-text">
    Tem certeza que deseja desmarcar este horário?
  </p>
  <p class="confirm-dialog__info">
    Dia: <b>{{ data.diaSemana | uppercase }}</b>
  </p>
  <p class="confirm-dialog__info">
    Hora: <b>{{ data.hora.substring(0, 5) }}</b>
  </p>
</div>
<div mat-dialog-actions class="confirm-dialog__actions">
  <button mat-button color="warn" (click)="onNoClick()" class="confirm-dialog__button">
    CANCELAR
  </button>
  <button
    mat-button
    color="warn"
    (click)="onYesClick()"
    class="confirm-dialog__button"
  >
    DESMARCAR
  </button>
</div>
  `,
})
export class DialogoCancelamentoComponent {

  constructor(
    public dialogRef: MatDialogRef<DialogoCancelamentoComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
  ) {}

  onNoClick(): void {
    this.dialogRef.close(false);
  }

  onYesClick(): void {
    this.dialogRef.close(true);
  }
}

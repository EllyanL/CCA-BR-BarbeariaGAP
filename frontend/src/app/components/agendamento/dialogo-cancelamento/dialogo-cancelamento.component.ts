import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LoggingService } from 'src/app/services/logging.service';

export interface DialogData {
  diaSemana: string;
  hora: string;
  usuarioId?: number;
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
  <button mat-button (click)="onNoClick()" class="confirm-dialog__button">
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
    private snackBar: MatSnackBar,
    private logger: LoggingService,
  ) {
  }

  onNoClick(): void {
    this.dialogRef.close(false);
  }

  onYesClick(): void {
    const autorizado = this.verifySaram();
    if (autorizado) {
      this.dialogRef.close({ dia: this.data.diaSemana, hora: this.data.hora, usuarioId: this.data.usuarioId });
    } else {
      this.snackBar.open('Somente o militar associado ao agendamento pode desmarcar.', 'Ciente', {
        duration: 3000,
      });
      this.dialogRef.close(false);
    }
  }

  verifySaram(): boolean {
    const ldapDataString = sessionStorage.getItem('user-data') || localStorage.getItem('user-data');
    if (ldapDataString) {
      const ldapData = JSON.parse(ldapDataString);
      const id = ldapData[0].id;
      // Compara o ID armazenado com o ID do agendamento clicado.
      if (id === this.data.usuarioId) {
        return true;
      } else {
        return false;
      }
    } else {
      this.logger.error('Nenhum dado encontrado no armazenamento.');
      return false;
    }
  }
}

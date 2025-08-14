import { Component, TemplateRef, ViewChild, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { ConfigHorarioService } from 'src/app/services/config-horario.service';

export interface GerenciarHorariosResult {
  inicio: string; // HH:mm
  fim: string;    // HH:mm
}

@Component({
  selector: 'app-dialogo-gerenciar-horarios',
  templateUrl: './dialogo-gerenciar-horarios.component.html',
  styleUrls: ['./dialogo-gerenciar-horarios.component.css'],
})
export class DialogoGerenciarHorariosComponent {
  horaInicio = '';
  horaFim = '';
  categoria = '';

  @ViewChild('conflitoDialog') conflitoDialog?: TemplateRef<any>;

  // HH:mm entre 00:00 e 23:59
  private readonly timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

  constructor(
    private configService: ConfigHorarioService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<DialogoGerenciarHorariosComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) private data: { categoria: string }
  ) {
    this.categoria = data?.categoria ?? '';
  }

  /** Valida os campos (formato HH:mm e início < fim) */
  isValid(): boolean {
    if (!this.timeRegex.test(this.horaInicio) || !this.timeRegex.test(this.horaFim)) {
      return false;
    }
    // Comparação lexicográfica funciona para HH:mm
    return this.horaInicio < this.horaFim;
  }

  /** Salva a nova janela de horários via API */
  gerarHorarios(): void {
    if (!this.isValid()) return;
    this.configService.put({ inicio: this.horaInicio, fim: this.horaFim, categoria: this.categoria }).subscribe({
      next: () => {
        this.snackBar.open('Janela de horários atualizada.', 'Ciente', { duration: 3000 });
        this.configService.emitirRecarregarGrade(this.categoria);
        this.dialogRef.close(true);
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 409 && err.error?.code === 'JANELA_CONFLITO_AGENDAMENTOS') {
          if (this.conflitoDialog) {
            this.dialog.open(this.conflitoDialog);
          } else {
            this.snackBar.open(
              'Não é possível realizar alteração com agendamentos ativos.',
              'Ciente',
              { duration: 3000 }
            );
          }
        }
      }
    });
  }

  /** Fecha sem retornar nada (cancelado) */
  cancelar(): void {
    this.dialogRef.close(false);
  }
}

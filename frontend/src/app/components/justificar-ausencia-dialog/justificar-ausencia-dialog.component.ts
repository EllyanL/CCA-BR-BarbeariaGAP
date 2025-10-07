import { Component, Inject } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { Agendamento } from '../../models/agendamento';
import { JustificativaAusencia } from '../../models/justificativa-ausencia';
import { JustificativaAusenciaService } from '../../services/justificativa-ausencia.service';

@Component({
  selector: 'app-justificar-ausencia-dialog',
  templateUrl: './justificar-ausencia-dialog.component.html',
  styleUrls: ['./justificar-ausencia-dialog.component.css']
})
export class JustificarAusenciaDialogComponent {
  justificativaControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(250)]
  });
  enviando = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public agendamento: Agendamento,
    private dialogRef: MatDialogRef<JustificarAusenciaDialogComponent, JustificativaAusencia>,
    private justificativaService: JustificativaAusenciaService,
    private snackBar: MatSnackBar
  ) {}

  get caracteresRestantes(): number {
    const valor = this.justificativaControl.value ?? '';
    return 250 - valor.length;
  }

  enviar(): void {
    if (this.justificativaControl.invalid || !this.agendamento.id) {
      this.justificativaControl.markAsTouched();
      return;
    }

    this.enviando = true;
    this.justificativaService
      .solicitar(this.agendamento.id, this.justificativaControl.value)
      .subscribe({
        next: justificativa => {
          this.enviando = false;
          this.snackBar.open('Justificativa enviada com sucesso.', 'Fechar', {
            duration: 4000
          });
          this.dialogRef.close(justificativa);
        },
        error: () => {
          this.enviando = false;
          this.snackBar.open('Não foi possível enviar a justificativa.', 'Fechar', {
            duration: 5000
          });
        }
      });
  }
}

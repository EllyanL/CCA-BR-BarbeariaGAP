import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

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

  // HH:mm entre 00:00 e 23:59
  private readonly timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

  constructor(
    public dialogRef: MatDialogRef<DialogoGerenciarHorariosComponent, GerenciarHorariosResult | null>
  ) {}

  /** Valida os campos (formato HH:mm e início < fim) */
  isValid(): boolean {
    if (!this.timeRegex.test(this.horaInicio) || !this.timeRegex.test(this.horaFim)) {
      return false;
    }
    // Comparação lexicográfica funciona para HH:mm
    return this.horaInicio < this.horaFim;
  }

  /** Fecha retornando os horários escolhidos */
  gerarHorarios(): void {
    if (!this.isValid()) return;
    this.dialogRef.close({
      inicio: this.horaInicio,
      fim: this.horaFim,
    });
  }

  /** Fecha sem retornar nada (cancelado) */
  cancelar(): void {
    this.dialogRef.close(null);
  }
}

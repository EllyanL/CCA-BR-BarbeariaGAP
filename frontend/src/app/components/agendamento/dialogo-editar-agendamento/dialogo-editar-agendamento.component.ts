import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Agendamento } from 'src/app/models/agendamento';
import { AgendamentoService } from 'src/app/services/agendamento.service';
import { LoggingService } from 'src/app/services/logging.service';

@Component({
  selector: 'app-dialogo-editar-agendamento',
  template: `
    <h1 mat-dialog-title>Editar Agendamento</h1>
    <div mat-dialog-content>
      <mat-form-field class="edit-field">
        <mat-label>Data</mat-label>
        <input matInput [(ngModel)]="data" type="date" />
      </mat-form-field>
      <mat-form-field class="edit-field">
        <mat-label>Hora</mat-label>
        <input matInput [(ngModel)]="hora" type="time" />
      </mat-form-field>
      <mat-form-field class="edit-field">
        <mat-label>Dia da Semana</mat-label>
        <mat-select [(ngModel)]="diaSemana">
          <mat-option *ngFor="let d of dias" [value]="d">{{ d | uppercase }}</mat-option>
        </mat-select>
      </mat-form-field>
    </div>
    <div mat-dialog-actions>
      <button mat-button (click)="fechar()">Cancelar</button>
      <button mat-button color="primary" (click)="salvar()">Salvar</button>
    </div>
  `,
  styles: [`.edit-field { width: 100%; }`]
})
export class DialogoEditarAgendamentoComponent {
  data: string;
  hora: string;
  diaSemana: string;
  dias = ['segunda', 'terça', 'quarta', 'quinta', 'sexta'];

  constructor(
    public dialogRef: MatDialogRef<DialogoEditarAgendamentoComponent>,
    @Inject(MAT_DIALOG_DATA) public agendamento: Agendamento,
    private agendamentoService: AgendamentoService,
    private snackBar: MatSnackBar,
    private logger: LoggingService
  ) {
    this.data = agendamento.data || '';
    this.hora = agendamento.hora.slice(0,5);
    this.diaSemana = agendamento.diaSemana;
  }

  fechar(): void {
    this.dialogRef.close(false);
  }

  salvar(): void {
    this.agendamentoService.updateAgendamento(this.agendamento.id!, {
      data: this.data,
      hora: this.hora,
      diaSemana: this.diaSemana
    }).subscribe({
      next: (updated) => {
        this.snackBar.open('Agendamento atualizado com sucesso.', 'Ciente', { duration: 3000 });
        this.dialogRef.close(updated);
      },
      error: (err) => {
        this.logger.error('Erro ao atualizar:', err);
        this.snackBar.open(err.error || 'Erro ao atualizar', 'Ciente', { duration: 3000 });
        this.dialogRef.close(false);
      }
    });
  }
}

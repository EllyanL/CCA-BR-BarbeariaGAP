import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Agendamento } from 'src/app/models/agendamento';
import { AgendamentoService } from 'src/app/services/agendamento.service';
import { LoggingService } from 'src/app/services/logging.service';
import { SNACKBAR_DURATION } from 'src/app/utils/ui-constants';

@Component({
  selector: 'app-dialogo-detalhes-agendamento',
  template: `
    <h1 mat-dialog-title class="detalhes-dialog__title">Detalhes do Agendamento</h1>
    <div mat-dialog-content>
      <p><strong>Data:</strong> {{ agendamento.data | date:'dd/MM/yyyy':'':'pt-BR' }}</p>
      <p><strong>Hora:</strong> {{ agendamento.hora | slice:0:5 }}</p>
      <p><strong>Dia:</strong> {{ agendamento.diaSemana | titlecase }}</p>
      <div *ngIf="agendamento.militar">
        <p><strong>SARAM:</strong> {{ agendamento.militar.saram }}</p>
        <p><strong>Nome:</strong> {{ formatarNome(agendamento.militar.nomeDeGuerra) }}</p>
        <p><strong>OM:</strong> {{ agendamento.militar.om }}</p>
      </div>
    </div>
    <div mat-dialog-actions class="detalhes-dialog__actions">
      <button mat-button color="warn" (click)="fechar()">Cancelar</button>
      <button *ngIf="podeDesmarcar" mat-button color="warn" (click)="desmarcar()">
        DESMARCAR
      </button>
    </div>
  `,
  styles: [`
    .detalhes-dialog__title {
      font-size: 1.5rem;
      text-align: center;
    }

    .detalhes-dialog__actions {
      display: flex;
      justify-content: space-between;
      gap: 8px;
    }
  `]
})
export class DialogoDetalhesAgendamentoComponent {
  agendamento: Agendamento;
  podeDesmarcar: boolean;

  constructor(
    public dialogRef: MatDialogRef<DialogoDetalhesAgendamentoComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { agendamento: Agendamento; podeDesmarcar: boolean },
    private agendamentoService: AgendamentoService,
    private snackBar: MatSnackBar,
    private logger: LoggingService
  ) {
    this.agendamento = data.agendamento;
    this.podeDesmarcar = data.podeDesmarcar;
  }

  fechar(): void {
    this.dialogRef.close(false);
  }

  desmarcar(): void {
    if (!this.podeDesmarcar || !this.agendamento.id) {
      return;
    }
    this.agendamentoService.cancelarAgendamento(this.agendamento.id).subscribe({
      next: () => {
        this.snackBar.open('Agendamento desmarcado com sucesso.', 'Ciente', { duration: SNACKBAR_DURATION });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.logger.error('Erro ao desmarcar agendamento:', err);
        this.snackBar.open('Erro ao desmarcar o agendamento', 'Ciente', { duration: SNACKBAR_DURATION });
      this.dialogRef.close(false);
    },
    });
  }

  formatarNome(nome: string): string {
    return nome
      .toLowerCase()
      .split(' ')
      .map(p => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }

  // edição desabilitada
}

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
    <div mat-dialog-content class="detalhes-dialog__content">
      <p><strong>Data:</strong> {{ agendamento.data ? (agendamento.data | date:'dd/MM/yyyy':'':'pt-BR') : 'Não informado' }}</p>
      <p><strong>Hora:</strong> {{ agendamento.hora ? (agendamento.hora | slice:0:5) : 'Não informado' }}</p>
      <p><strong>Dia:</strong> {{ agendamento.diaSemana ? (agendamento.diaSemana | titlecase) : 'Não informado' }}</p>
      <p><strong>SARAM:</strong> {{ obterSaramAgendamento() }}</p>
      <p><strong>Nome:</strong> {{ formatarNome(obterNomeAgendamento()) }}</p>
      <p><strong>OM:</strong> {{ obterOmAgendamento() }}</p>
    </div>
    <div mat-dialog-actions class="detalhes-dialog__actions">
      <button mat-flat-button color="primary" (click)="fechar()">Fechar</button>
      <button *ngIf="podeDesmarcar" mat-stroked-button color="warn" (click)="desmarcar()">
        Desmarcar
      </button>
    </div>
  `,
  styles: [`
    .detalhes-dialog__title {
      font-size: 1.5rem;
      text-align: center;
    }

    .detalhes-dialog__content p {
      margin: 0 0 8px 0;
    }

    .detalhes-dialog__actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
  `]
})
export class DialogoDetalhesAgendamentoComponent {
  agendamento: Agendamento;
  podeDesmarcar: boolean;

  constructor(
    public dialogRef: MatDialogRef<DialogoDetalhesAgendamentoComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { agendamento: Agendamento; podeDesmarcar?: boolean },
    private agendamentoService: AgendamentoService,
    private snackBar: MatSnackBar,
    private logger: LoggingService
  ) {
    this.agendamento = data.agendamento;
    this.podeDesmarcar = !!data.podeDesmarcar;
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

  formatarNome(nome?: string): string {
    if (!nome) {
      return 'Não informado';
    }
    return nome
      .toLowerCase()
      .split(' ')
      .map(p => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }

  obterSaramAgendamento(): string {
    return (
      this.agendamento.militar?.saram ||
      this.agendamento.saramUsuario ||
      this.agendamento.usuarioSaram ||
      'Não informado'
    );
  }

  obterNomeAgendamento(): string | undefined {
    return (
      this.agendamento.militar?.nomeDeGuerra ||
      this.agendamento.militar?.nomeCompleto ||
      this.agendamento.nomeUsuario ||
      undefined
    );
  }

  obterOmAgendamento(): string {
    return this.agendamento.militar?.om || 'Não informado';
  }

  // edição desabilitada
}

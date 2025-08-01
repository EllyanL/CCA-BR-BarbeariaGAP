import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AgendamentoService } from 'src/app/services/agendamento.service';
import { Militar } from 'src/app/models/militar';

@Component({
  selector: 'app-dialogo-desmarcar',
  templateUrl: './dialogo-desmarcar.component.html',
  styleUrls: ['./dialogo-desmarcar.component.css']
})
export class DialogoDesmarcarComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public dados: { id: number; dia: string; hora: string; militar?: Militar | null }
    ,
    private agendamentoService: AgendamentoService,
    public dialogRef: MatDialogRef<DialogoDesmarcarComponent>,
    private snackBar: MatSnackBar
  ) {}

  formatarNomeCompleto(posto: string, nomeGuerra: string): string {
    return `${posto} ${nomeGuerra}`
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  desmarcar(): void {
    this.agendamentoService.cancelarAgendamento(this.dados.id, true).subscribe({
      next: () => {
        this.snackBar.open("Horário desmarcado com sucesso.", "Ciente", { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err: any) => {
        this.snackBar.open("Erro ao desmarcar: " + err.message, "Ciente", { duration: 3000 });
      }
    });
    
  }
}

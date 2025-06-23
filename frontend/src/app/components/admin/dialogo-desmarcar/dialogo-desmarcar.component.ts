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

  desmarcar(): void {
    this.agendamentoService.deleteAgendamento(this.dados.id).subscribe({
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

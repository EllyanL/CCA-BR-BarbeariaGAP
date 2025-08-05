import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfiguracoesAgendamentoService, ConfiguracaoAgendamento } from 'src/app/services/configuracoes-agendamento.service';

@Component({
  selector: 'app-dialogo-gerenciar-horarios',
  templateUrl: './dialogo-gerenciar-horarios.component.html',
  styleUrls: ['./dialogo-gerenciar-horarios.component.css']
})
export class DialogoGerenciarHorariosComponent implements OnInit {
  horarioInicio = '';
  horarioFim = '';

  constructor(
    private dialogRef: MatDialogRef<DialogoGerenciarHorariosComponent>,
    private configuracoesService: ConfiguracoesAgendamentoService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.configuracoesService.getConfig().subscribe(config => {
      this.horarioInicio = config.horarioInicio;
      this.horarioFim = config.horarioFim;
    });
  }

  cancelar(): void {
    this.dialogRef.close();
  }

  salvar(): void {
    const config: ConfiguracaoAgendamento = {
      horarioInicio: this.horarioInicio,
      horarioFim: this.horarioFim
    };

    this.configuracoesService.updateConfig(config).subscribe(() => {
      this.snackBar.open('Horários atualizados com sucesso', 'Fechar', { duration: 3000 });
      this.dialogRef.close(true);
    });
  }
}

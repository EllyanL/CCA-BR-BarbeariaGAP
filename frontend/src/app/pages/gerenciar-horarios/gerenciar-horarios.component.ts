import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfiguracoesAgendamentoService, ConfiguracaoAgendamento } from '../../services/configuracoes-agendamento.service';

@Component({
  selector: 'app-gerenciar-horarios',
  templateUrl: './gerenciar-horarios.component.html',
  styleUrls: ['./gerenciar-horarios.component.css']
})
export class GerenciarHorariosComponent implements OnInit {
  horarioInicio: string = '';
  horarioFim: string = '';

  constructor(
    private configService: ConfiguracoesAgendamentoService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.configService.getConfig().subscribe(config => {
      if (config) {
        this.horarioInicio = config.horarioInicio?.slice(0, 5) || '';
        this.horarioFim = config.horarioFim?.slice(0, 5) || '';
      }
    });
  }

  salvar(): void {
    const configuracao: ConfiguracaoAgendamento = {
      horarioInicio: this.horarioInicio,
      horarioFim: this.horarioFim
    };
    this.configService.updateConfig(configuracao).subscribe(() => {
      this.snackBar.open('Horários de agendamento atualizados com sucesso', 'Ciente', { duration: 3000 });
    });
  }
}


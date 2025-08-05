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
    const regex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!regex.test(this.horarioInicio) || !regex.test(this.horarioFim)) {
      this.snackBar.open('Informe horários válidos (HH:mm).', 'Ciente', { duration: 3000 });
      return;
    }
    const toMinutes = (h: string) => {
      const [hh, mm] = h.split(':').map(Number);
      return hh * 60 + mm;
    };
    if (toMinutes(this.horarioInicio) >= toMinutes(this.horarioFim)) {
      this.snackBar.open('Horário inicial deve ser menor que o final.', 'Ciente', { duration: 3000 });
      return;
    }

    const configuracao: ConfiguracaoAgendamento = {
      horarioInicio: this.horarioInicio,
      horarioFim: this.horarioFim
    };
    this.configService.updateConfig(configuracao).subscribe(() => {
      this.snackBar.open('Horários de agendamento atualizados com sucesso', 'Ciente', { duration: 3000 });
    });
  }
}


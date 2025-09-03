import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { ConfiguracoesAgendamentoService, ConfiguracaoAgendamento } from 'src/app/services/configuracoes-agendamento.service';

@Component({
  selector: 'app-orientacoes',
  templateUrl: './orientacoes.component.html',
  styles: [`
    .orientacoes-card {
      width: 100%;
      max-width: 900px;
      padding: 24px;
      white-space: normal;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .orientacoes-card__header {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .orientacoes-card__title {
      margin-top: 0;
      color: var(--text-primary, #000);
      font-weight: 600;
      font-size: 1.25rem;
    }

    .orientacoes-card__list-item {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      white-space: normal !important;
    }

    mat-list-item {
      white-space: normal !important;
    }

    .mat-list-text {
      white-space: normal !important;
    }

    .orientacoes-card__list-item:last-child {
      margin-bottom: 0;
    }

    .orientacoes-card__list-item mat-icon {
      vertical-align: middle;
    }

    @media (max-width: 600px) {
      .orientacoes-card {
        max-width: 95vw;
      }
    }
  `]
})
export class OrientacoesComponent implements OnInit {
  horarioInicio?: string;
  horarioFim?: string;
  naoMostrarNovamente = false;

  constructor(
    private configService: ConfiguracoesAgendamentoService,
    private dialogRef: MatDialogRef<OrientacoesComponent>
  ) {}

  ngOnInit(): void {
    this.configService.getConfig().subscribe((config: ConfiguracaoAgendamento) => {
      this.horarioInicio = config.horarioInicio?.slice(0, 5);
      this.horarioFim = config.horarioFim?.slice(0, 5);
    });
  }

  onCiente(): void {
    if (this.naoMostrarNovamente) {
      localStorage.setItem('orientacoesOcultas', 'true');
    }
    this.dialogRef.close();
  }
}

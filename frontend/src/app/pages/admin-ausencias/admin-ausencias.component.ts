import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

import {
  JustificativaAusenciaAdmin,
  JustificativaStatus
} from '../../models/justificativa-ausencia';
import { JustificativaAusenciaService } from '../../services/justificativa-ausencia.service';
import { LoggingService } from '../../services/logging.service';

@Component({
  selector: 'app-admin-ausencias',
  templateUrl: './admin-ausencias.component.html',
  styleUrls: ['./admin-ausencias.component.css']
})
export class AdminAusenciasComponent implements OnInit {
  solicitacoes: JustificativaAusenciaAdmin[] = [];
  selecionada?: JustificativaAusenciaAdmin;
  carregando = false;
  erroCarregamento = false;

  constructor(
    private justificativaService: JustificativaAusenciaService,
    private snackBar: MatSnackBar,
    private logger: LoggingService
  ) {}

  ngOnInit(): void {
    this.carregarSolicitacoes();
  }

  carregarSolicitacoes(): void {
    this.carregando = true;
    this.erroCarregamento = false;
    this.justificativaService.listarAdmin().subscribe({
      next: solicitacoes => {
        this.solicitacoes = solicitacoes;
        this.selecionada = solicitacoes[0];
        this.carregando = false;
      },
      error: erro => {
        this.logger.error('Erro ao carregar justificativas de ausência:', erro);
        this.erroCarregamento = true;
        this.carregando = false;
        this.snackBar.open('Não foi possível carregar as justificativas.', 'Fechar', {
          duration: 5000
        });
      }
    });
  }

  selecionar(solicitacao: JustificativaAusenciaAdmin): void {
    this.selecionada = solicitacao;
  }

  tituloSolicitacao(solicitacao: JustificativaAusenciaAdmin): string {
    const posto = solicitacao.postoGradMilitar ?? '';
    const nome = solicitacao.nomeDeGuerraMilitar ?? '';
    const statusDescricao = this.descricaoStatus(solicitacao);
    return `${posto} ${nome}`.trim() +
      ` Ausentou-se ${solicitacao.diaSemana} ${solicitacao.data} às ${solicitacao.hora} Status: ${statusDescricao}`;
  }

  descricaoStatus(solicitacao: JustificativaAusenciaAdmin): string {
    if (solicitacao.status === 'AGUARDANDO') {
      return 'AGUARDANDO';
    }
    const avaliador = [
      solicitacao.avaliadoPorPostoGrad,
      solicitacao.avaliadoPorNomeDeGuerra
    ]
      .filter(Boolean)
      .join(' ');
    if (!avaliador) {
      return solicitacao.status;
    }
    return `${solicitacao.status} por ${avaliador}`;
  }

  classeStatus(status: JustificativaStatus): string {
    const mapa: Record<JustificativaStatus, string> = {
      AGUARDANDO: 'status-aguardando',
      APROVADO: 'status-aprovado',
      RECUSADO: 'status-recusado'
    };
    return mapa[status];
  }

  aprovarSelecionada(): void {
    if (!this.selecionada) {
      return;
    }
    this.justificativaService.aprovar(this.selecionada.id).subscribe({
      next: atualizada => {
        this.atualizarSolicitacao(atualizada);
        this.snackBar.open('Justificativa aprovada.', 'Fechar', { duration: 4000 });
      },
      error: erro => {
        this.logger.error('Erro ao aprovar justificativa:', erro);
        this.snackBar.open('Não foi possível aprovar a justificativa.', 'Fechar', { duration: 5000 });
      }
    });
  }

  recusarSelecionada(): void {
    if (!this.selecionada) {
      return;
    }
    this.justificativaService.recusar(this.selecionada.id).subscribe({
      next: atualizada => {
        this.atualizarSolicitacao(atualizada);
        this.snackBar.open('Justificativa recusada.', 'Fechar', { duration: 4000 });
      },
      error: erro => {
        this.logger.error('Erro ao recusar justificativa:', erro);
        this.snackBar.open('Não foi possível recusar a justificativa.', 'Fechar', { duration: 5000 });
      }
    });
  }

  private atualizarSolicitacao(atualizada: JustificativaAusenciaAdmin): void {
    this.solicitacoes = this.solicitacoes.map(item =>
      item.id === atualizada.id ? { ...item, ...atualizada } : item
    );
    const novaSelecionada = this.solicitacoes.find(item => item.id === atualizada.id);
    this.selecionada = novaSelecionada ?? this.selecionada;
  }
}

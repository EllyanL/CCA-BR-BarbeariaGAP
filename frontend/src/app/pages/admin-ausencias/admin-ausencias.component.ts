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
  solicitacoesFiltradas: JustificativaAusenciaAdmin[] = [];
  selecionada?: JustificativaAusenciaAdmin;
  carregando = false;
  erroCarregamento = false;
  filtroTexto = '';
  filtroDataInicio: Date | null = null;
  filtroDataFim: Date | null = null;
  filtroStatus: JustificativaStatus[] = [];
  readonly statusOptions: { value: JustificativaStatus; label: string }[] = [
    { value: 'AGUARDANDO', label: 'Aguardando' },
    { value: 'APROVADO', label: 'Aprovado' },
    { value: 'RECUSADO', label: 'Negado' }
  ];

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
        this.aplicarFiltros();
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

  aplicarFiltros(): void {
    let filtradas = [...this.solicitacoes];

    if (this.filtroTexto.trim()) {
      const termo = this.filtroTexto.trim().toLowerCase();
      filtradas = filtradas.filter(item => {
        const posto = (item.postoGradMilitar || '').toLowerCase();
        const nome = (item.nomeDeGuerraMilitar || '').toLowerCase();
        return posto.includes(termo) || nome.includes(termo);
      });
    }

    const inicio = this.normalizarInicio(this.filtroDataInicio);
    const fim = this.normalizarFim(this.filtroDataFim);
    if (inicio || fim) {
      const [dataInicio, dataFim] = this.ordenarDatas(inicio, fim);
      filtradas = filtradas.filter(item => {
        const data = this.converterParaDate(item.data);
        if (!data) {
          return false;
        }
        return (!dataInicio || data >= dataInicio) && (!dataFim || data <= dataFim);
      });
    }

    if (this.filtroStatus.length) {
      const filtroSet = new Set(this.filtroStatus);
      filtradas = filtradas.filter(item => filtroSet.has(item.status));
    }

    this.solicitacoesFiltradas = filtradas;

    if (!filtradas.length) {
      this.selecionada = undefined;
      return;
    }

    if (!this.selecionada || !filtradas.some(item => item.id === this.selecionada?.id)) {
      this.selecionada = filtradas[0];
    } else {
      this.selecionada = filtradas.find(item => item.id === this.selecionada?.id);
    }
  }

  limparCampo(campo: 'texto' | 'dataInicio' | 'dataFim' | 'status'): void {
    if (campo === 'texto') {
      this.filtroTexto = '';
    } else if (campo === 'dataInicio') {
      this.filtroDataInicio = null;
    } else if (campo === 'dataFim') {
      this.filtroDataFim = null;
    } else if (campo === 'status') {
      this.filtroStatus = [];
    }
    this.aplicarFiltros();
  }

  limparFiltros(): void {
    this.filtroTexto = '';
    this.filtroDataInicio = null;
    this.filtroDataFim = null;
    this.filtroStatus = [];
    this.aplicarFiltros();
  }

  temFiltros(): boolean {
    return (
      !!this.filtroTexto.trim() ||
      !!this.filtroDataInicio ||
      !!this.filtroDataFim ||
      this.filtroStatus.length > 0
    );
  }

  tituloSolicitacao(solicitacao: JustificativaAusenciaAdmin): string {
    const posto = solicitacao.postoGradMilitar ?? '';
    const nome = solicitacao.nomeDeGuerraMilitar ?? '';
    const statusDescricao = this.descricaoStatus(solicitacao);
    return `${posto} ${nome}`.trim() +
      ` Ausentou-se ${solicitacao.diaSemana} ${solicitacao.data} às ${solicitacao.hora} Status: ${statusDescricao}`;
  }

  descricaoStatus(solicitacao: JustificativaAusenciaAdmin): string {
    const statusBase = solicitacao.status === 'RECUSADO' ? 'NEGADO' : solicitacao.status;
    if (solicitacao.status === 'AGUARDANDO') {
      return statusBase;
    }
    const avaliador = [
      solicitacao.avaliadoPorPostoGrad,
      solicitacao.avaliadoPorNomeDeGuerra
    ]
      .filter(Boolean)
      .join(' ');
    if (!avaliador) {
      return statusBase;
    }
    return `${statusBase} por ${avaliador}`;
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
    this.aplicarFiltros();
  }

  private converterParaDate(data?: string): Date | null {
    if (!data) {
      return null;
    }
    const partes = data.split('/').map(Number);
    if (partes.length !== 3) {
      return null;
    }
    const [dia, mes, ano] = partes;
    if (!dia || !mes || !ano) {
      return null;
    }
    const resultado = new Date(ano, mes - 1, dia, 12);
    return Number.isNaN(resultado.getTime()) ? null : resultado;
  }

  private normalizarInicio(data: Date | null): Date | null {
    if (!data) {
      return null;
    }
    const inicio = new Date(data);
    inicio.setHours(0, 0, 0, 0);
    return inicio;
  }

  private normalizarFim(data: Date | null): Date | null {
    if (!data) {
      return null;
    }
    const fim = new Date(data);
    fim.setHours(23, 59, 59, 999);
    return fim;
  }

  private ordenarDatas(
    inicio: Date | null,
    fim: Date | null
  ): [Date | null, Date | null] {
    if (inicio && fim && inicio > fim) {
      return [fim, inicio];
    }
    return [inicio, fim];
  }
}

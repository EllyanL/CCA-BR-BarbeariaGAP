import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatSort, MatSortable } from '@angular/material/sort';

import { Agendamento } from '../../models/agendamento';
import { AgendamentoService } from '../../services/agendamento.service';
import { DatePipe } from '@angular/common';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { JustificativaAusencia, JustificativaStatus } from '../../models/justificativa-ausencia';
import { JustificarAusenciaDialogComponent } from '../../components/justificar-ausencia-dialog/justificar-ausencia-dialog.component';

@Component({
  selector: 'app-meus-agendamentos',
  templateUrl: './meus-agendamentos.component.html',
  styleUrls: ['./meus-agendamentos.component.css'],
  providers: [DatePipe]
})
export class MeusAgendamentosComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = [
    'data',
    'hora',
    'postoGrad',
    'nomeDeGuerra',
    'status',
    'canceladoPor',
    'ausencia'
  ];
  dataSource = new MatTableDataSource<Agendamento>([]);

  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort) sort?: MatSort;

  constructor(
    private agendamentoService: AgendamentoService,
    private datePipe: DatePipe,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.carregarAgendamentos();
  }

  ngAfterViewInit(): void {
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
    if (this.sort) {
      this.dataSource.sort = this.sort;
      this.sort.active = 'data';
      this.sort.direction = 'desc';
      this.sort.sort({ id: 'data', start: 'desc', disableClear: true } as MatSortable);
      this.dataSource.sortingDataAccessor = (item, property) => {
        switch (property) {
          case 'data':
            if (!item.data) {
              return 0;
            }
            const [dia, mes, ano] = item.data.split('/');
            const [hora, minuto] = (item.hora || '00:00').split(':');
            const date = new Date(
              Number(ano),
              Number(mes) - 1,
              Number(dia),
              Number(hora),
              Number(minuto)
            );
            return date.getTime();
          default:
            return (item as any)[property];
        }
      };
    }
  }

  aplicarFiltro(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    const normalized = filterValue.trim().toLowerCase();

    this.dataSource.filterPredicate = (a: Agendamento, filter: string): boolean => {
      const f = filter.trim().toLowerCase();
      const data = this.datePipe.transform(a.data, 'dd/MM/yyyy', undefined, 'pt-BR') || '';
      return [
        data,
        a.hora,
        a.militar?.postoGrad,
        a.militar?.nomeDeGuerra,
        this.formatarStatus(a.status ?? ''),
        this.formatarCanceladoPor(a.canceladoPor)
      ]
        .map(v => (v ?? '').toLowerCase())
        .some(v => v.includes(f));
    };

    this.dataSource.filter = normalized;
    if (this.paginator) {
      this.paginator.firstPage();
    }
  }

  private carregarAgendamentos(): void {
    this.agendamentoService.getMeusAgendamentos().subscribe({
      next: (dados) => {
        this.dataSource.data = dados;
      },
      error: (err) => {
        console.error('Erro ao carregar agendamentos', err);
      }
    });
  }

  podeExibirBotao(agendamento: Agendamento): boolean {
    return this.podeJustificar(agendamento) || !!agendamento.justificativaAusencia;
  }

  podeJustificar(agendamento: Agendamento): boolean {
    if (!agendamento || agendamento.justificativaAusencia) {
      return false;
    }

    if (!agendamento.data || !agendamento.hora) {
      return false;
    }

    const status = (agendamento.status || '').toUpperCase();
    if (status === 'CANCELADO' || status === 'ADMIN_CANCELADO') {
      return false;
    }

    const statusPermitidos = new Set(['REALIZADO', 'EFETUADO']);
    if (!statusPermitidos.has(status)) {
      return false;
    }

    const dataAgendamento = new Date(agendamento.data);
    if (Number.isNaN(dataAgendamento.getTime())) {
      return false;
    }

    const [horaStr, minutoStr] = (agendamento.hora || '00:00').split(':');
    const dataHora = new Date(dataAgendamento);
    dataHora.setHours(Number(horaStr ?? 0), Number(minutoStr ?? 0), 0, 0);
    const agora = new Date();

    if (agora < dataHora) {
      return false;
    }

    const diffDias = this.diferencaDias(this.normalizarData(agora), this.normalizarData(dataAgendamento));
    return diffDias >= 0 && diffDias <= 3;
  }

  textoBotaoJustificativa(agendamento: Agendamento): string {
    const justificativa = agendamento.justificativaAusencia;
    if (!justificativa) {
      return 'Justificar ausência';
    }

    const mapa: Record<JustificativaStatus, string> = {
      AGUARDANDO: 'Aguardando',
      APROVADO: 'Aprovado',
      RECUSADO: 'Recusado'
    };
    return mapa[justificativa.status] ?? 'Justificar ausência';
  }

  classeBotaoJustificativa(justificativa?: JustificativaAusencia | null): string {
    if (!justificativa) {
      return '';
    }
    const mapa: Record<JustificativaStatus, string> = {
      AGUARDANDO: 'btn-aguardando',
      APROVADO: 'btn-aprovado',
      RECUSADO: 'btn-recusado'
    };
    return mapa[justificativa.status] ?? '';
  }

  tooltipJustificativa(agendamento: Agendamento): string {
    const justificativa = agendamento.justificativaAusencia;
    if (!justificativa) {
      return '';
    }

    if (justificativa.status === 'AGUARDANDO') {
      return 'Aguardando análise do administrador.';
    }

    const avaliador = [
      justificativa.avaliadoPorPostoGrad,
      justificativa.avaliadoPorNomeDeGuerra
    ]
      .filter(Boolean)
      .join(' ');
    if (!avaliador) {
      return '';
    }

    const textoBase = justificativa.status === 'APROVADO' ? 'Aprovado' : 'Recusado';
    return `${textoBase} por ${avaliador}.`;
  }

  abrirDialogoJustificar(agendamento: Agendamento): void {
    if (!this.podeJustificar(agendamento)) {
      return;
    }

    const dialogRef = this.dialog.open(JustificarAusenciaDialogComponent, {
      width: '420px',
      data: agendamento
    });

    dialogRef.afterClosed().subscribe((justificativa?: JustificativaAusencia) => {
      if (!justificativa) {
        return;
      }

      const dados = this.dataSource.data.map(item =>
        item.id === agendamento.id ? { ...item, justificativaAusencia: justificativa } : item
      );
      this.dataSource.data = dados;
      this.snackBar.open('Solicitação enviada. Aguarde a análise do administrador.', 'Fechar', {
        duration: 5000
      });
    });
  }

  private diferencaDias(dataFinal: Date, dataInicial: Date): number {
    const diff = dataFinal.getTime() - dataInicial.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  private normalizarData(data: Date): Date {
    const d = new Date(data);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  formatarStatus(status: string): string {
    if (!status) return '';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }

  formatarCanceladoPor(valor?: string | null): string {
    if (!valor) {
      return '';
    }
    const mapa: Record<string, string> = {
      ADMIN: 'Admin',
      USUARIO: 'Usuário'
    };
    return mapa[valor.toUpperCase()] || valor;
  }

  statusClass(status?: string): string {
    const s = (status || '').toUpperCase();
    return (
      {
        AGENDADO: 'status-agendado',
        DISPONIVEL: 'status-disponivel',
        INDISPONIVEL: 'status-indisponivel'
      } as any
    )[s] || '';
  }
}

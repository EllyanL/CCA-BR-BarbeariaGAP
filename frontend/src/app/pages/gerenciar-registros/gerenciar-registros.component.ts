import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { Agendamento } from '../../models/agendamento';
import { AgendamentoService } from '../../services/agendamento.service';
import { LoggingService } from '../../services/logging.service';

@Component({
  selector: 'app-gerenciar-registros',
  templateUrl: './gerenciar-registros.component.html',
  styleUrls: ['./gerenciar-registros.component.css']
})
export class GerenciarRegistrosComponent implements OnInit, AfterViewInit {
  displayedColumns = [
    'data',
    'hora',
    'postoGrad',
    'nomeDeGuerra',
    'secao',
    'email',
    'status',
    'canceladoPor'
  ];

  dataSourceGraduados = new MatTableDataSource<Agendamento>([]);
  dataSourceOficiais = new MatTableDataSource<Agendamento>([]);
  searchTerm = '';
  dataInicial?: Date | null;
  dataFinal?: Date | null;
  currentTab = 0;

  @ViewChild('graduadosPaginator') graduadosPaginator?: MatPaginator;
  @ViewChild('oficiaisPaginator') oficiaisPaginator?: MatPaginator;
  @ViewChild('graduadosSort') graduadosSort?: MatSort;
  @ViewChild('oficiaisSort') oficiaisSort?: MatSort;

  constructor(
    private agendamentoService: AgendamentoService,
    private logger: LoggingService
  ) {}

  ngOnInit(): void {
    this.carregarAgendamentos();
  }

  ngAfterViewInit(): void {
    if (this.graduadosPaginator) {
      this.dataSourceGraduados.paginator = this.graduadosPaginator;
    }
    if (this.oficiaisPaginator) {
      this.dataSourceOficiais.paginator = this.oficiaisPaginator;
    }
    if (this.graduadosSort) {
      this.dataSourceGraduados.sort = this.graduadosSort;
    }
    if (this.oficiaisSort) {
      this.dataSourceOficiais.sort = this.oficiaisSort;
    }
  }

  carregarAgendamentos(): void {
    const inicio = this.dataInicial ? this.formatDate(this.dataInicial) : undefined;
    const fim = this.dataFinal ? this.formatDate(this.dataFinal) : undefined;

    this.agendamentoService
      .listarFiltrado('GRADUADO', inicio, fim)
      .subscribe({
        next: data => {
          this.dataSourceGraduados.data = data;
          this.applyFilter();
        },
        error: err => this.logger.error('Erro ao carregar graduados:', err)
      });

    this.agendamentoService
      .listarFiltrado('OFICIAL', inicio, fim)
      .subscribe({
        next: data => {
          this.dataSourceOficiais.data = data;
          this.applyFilter();
        },
        error: err => this.logger.error('Erro ao carregar oficiais:', err)
      });
  }

  applyFilter(event?: Event): void {
    if (event) {
      const value = (event.target as HTMLInputElement).value;
      this.searchTerm = value.trim().toLowerCase();
    }

    const predicate = (a: Agendamento, filter: string): boolean => {
      const f = filter.trim().toLowerCase();
      return [
        a.data,
        a.hora,
        a.militar?.postoGrad,
        a.militar?.nomeDeGuerra,
        a.militar?.secao,
        a.militar?.email,
        a.status,
        a.canceladoPor
      ]
        .map(v => (v ?? '').toLowerCase())
        .some(v => v.includes(f));
    };

    this.dataSourceGraduados.filterPredicate = predicate;
    this.dataSourceOficiais.filterPredicate = predicate;
    this.dataSourceGraduados.filter = this.searchTerm;
    this.dataSourceOficiais.filter = this.searchTerm;

    if (this.graduadosPaginator) {
      this.graduadosPaginator.firstPage();
    }
    if (this.oficiaisPaginator) {
      this.oficiaisPaginator.firstPage();
    }
  }

  onTabChange(index: number): void {
    this.currentTab = index;
  }

  exportarPdf(): void {
    const rows =
      this.currentTab === 0
        ? this.dataSourceGraduados.filteredData
        : this.dataSourceOficiais.filteredData;

    import('jspdf')
      .then(jsPDF =>
        import('jspdf-autotable').then(() => {
          const doc = new jsPDF.jsPDF();
          const pageWidth = doc.internal.pageSize.getWidth();

          // Title
          doc.setFontSize(16);
          doc.text('Barbearia GAP - Registros', pageWidth / 2, 14, {
            align: 'center'
          });

          // Subtitle with date range
          const dataIni = this.formatDateBr(this.dataInicial);
          const dataFim = this.formatDateBr(this.dataFinal);
          doc.setFontSize(11);
          doc.text(
            `Intervalo de Busca: ${dataIni} À ${dataFim}`,
            pageWidth / 2,
            22,
            { align: 'center' }
          );

          // Table
          (doc as any).autoTable({
            startY: 28,
            head: [
              [
                'DATA',
                'HORA',
                'POSTO/GRADUAÇÃO',
                'NOME DE GUERRA',
                'SEÇÃO',
                'EMAIL',
                'STATUS',
                'CANCELADO POR'
              ]
            ],
            body: rows.map(r => [
              this.toBrDate(r.data),
              this.toTime(r.hora),
              r.militar?.postoGrad ?? '',
              this.formatName(r.militar?.nomeDeGuerra),
              r.militar?.secao ?? '',
              r.militar?.email ?? '',
              this.mapStatus(r.status, r.canceladoPor),
              r.canceladoPor ?? ''
            ]),
            styles: { fontSize: 10, cellPadding: 3 },
            headStyles: { fillColor: [220, 220, 220] }
          });

          doc.save('registros.pdf');
        })
      )
      .catch(err => this.logger.error('Erro ao exportar PDF:', err));
  }

  private formatDateBr(d?: Date | null): string {
    if (!d) {
      return '-';
    }
    const day = `${d.getDate()}`.padStart(2, '0');
    const month = `${d.getMonth() + 1}`.padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private toBrDate(dateStr?: string): string {
    if (!dateStr) {
      return '';
    }
    const d = new Date(dateStr);
    const day = `${d.getDate()}`.padStart(2, '0');
    const month = `${d.getMonth() + 1}`.padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
    
  }

  private toTime(time?: string): string {
    if (!time) {
      return '';
    }
    return time.substring(0, 5);
  }

  private mapStatus(status?: string, canceladoPor?: string): string {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'AGENDADO':
        return this.formatName('agendado');
      case 'REALIZADO':
        return this.formatName('realizado');
      case 'CANCELADO':
        return canceladoPor
          ? `${this.formatName(canceladoPor)}: ${this.formatName('cancelado')}`
          : this.formatName('cancelado');
      default:
        return '';
    }
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  formatName(nome?: string | null): string {
    if (!nome) {
      return '';
    }
    return nome
      .toLowerCase()
      .split(' ')
      .map(n => n.charAt(0).toUpperCase() + n.substring(1))
      .join(' ');
  }

  statusClass(status?: string): string {
    const s = (status || '').toUpperCase();
    return (
      {
        AGENDADO: 'status-agendado',
        CANCELADO: 'status-cancelado',
        INDISPONIVEL: 'status-indisponivel'
      } as any
    )[s] || '';
  }
}

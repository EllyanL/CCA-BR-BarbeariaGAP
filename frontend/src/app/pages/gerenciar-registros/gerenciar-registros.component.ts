import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Agendamento } from '../../models/agendamento';
import { AgendamentoService } from '../../services/agendamento.service';
import { LoggingService } from '../../services/logging.service';

@Component({
  selector: 'app-gerenciar-registros',
  templateUrl: './gerenciar-registros.component.html',
  styleUrls: ['./gerenciar-registros.component.css'],
  providers: [DatePipe]
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
    private logger: LoggingService,
    private datePipe: DatePipe
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

    forkJoin({
      graduados: this.agendamentoService.listarFiltrado('GRADUADO', inicio, fim),
      oficiais: this.agendamentoService.listarFiltrado('OFICIAL', inicio, fim)
    }).subscribe({
      next: ({ graduados, oficiais }) => {
        this.dataSourceGraduados.data = graduados;
        this.dataSourceOficiais.data = oficiais;
        this.applyFilter();
      },
      error: err => this.logger.error('Erro ao carregar agendamentos:', err)
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
        a.data ? new Date(a.data).toLocaleDateString('pt-BR') : '',
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

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Header
      doc.setFontSize(16);
      doc.text('Barbearia GAP - Registros', pageWidth / 2, 15, {
        align: 'center'
      });

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
      autoTable(doc, {
        startY: 30,
        head: [
          [
            'DATA',
            'HORA',
            'SARAM',
            'POSTO/GRAD',
            'NOME DE GUERRA',
            'STATUS',
            'CANCELADO POR'
          ]
        ],
        body: rows.map(r => [
          this.datePipe.transform(r.data, 'dd/MM/yyyy', 'pt-BR') ?? '',
          this.toTime(r.hora),
          r.militar?.saram ?? '',
          r.militar?.postoGrad ?? '',
          this.formatName(r.militar?.nomeDeGuerra),
          this.formatarStatus(r.status ?? ''),
          this.formatName(r.canceladoPor)
        ]),
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [220, 220, 220] }
      });

      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.text(
          `Página ${i} de ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      doc.save('registros.pdf');
    } catch (err) {
      this.logger.error('Erro ao exportar PDF:', err);
    }
  }

  private formatDateBr(d?: Date | null): string {
    return d ? this.datePipe.transform(d, 'dd/MM/yyyy', 'pt-BR') ?? '-' : '-';
  }

  toBrDate(dateStr?: string): string {
    return dateStr ? this.datePipe.transform(dateStr, 'dd/MM/yyyy', 'pt-BR') ?? '' : '';
  }

  private toTime(time?: string): string {
    if (!time) {
      return '';
    }
    return time.substring(0, 5);
  }

  private formatDate(d: Date): string {
    return d.toISOString().split('T')[0];
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

  formatarStatus(texto: string): string {
    if (!texto) return '';
    const lower = texto.toLowerCase();
    if (lower === 'disponivel') return 'Disponível';
    if (lower === 'indisponivel') return 'Indisponível';
    if (lower === 'agendado') return 'Agendado';
    return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
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

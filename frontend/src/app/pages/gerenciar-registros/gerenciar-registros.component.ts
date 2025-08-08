import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';
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
    'status',
    'canceladoPor'
  ];

  dataSource = new MatTableDataSource<Agendamento>([]);
  searchTerm = '';
  dataInicial?: Date | null;
  dataFinal?: Date | null;

  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort) sort?: MatSort;

  constructor(
    private agendamentoService: AgendamentoService,
    private logger: LoggingService,
    private datePipe: DatePipe,
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
      this.dataSource.sortingDataAccessor = (item, property) => {
        switch (property) {
          case 'data':
            return new Date(`${item.data}T${item.hora || '00:00'}`).getTime();
          default:
            return (item as any)[property];
        }
      };
    }
  }

  carregarAgendamentos(): void {
    const inicio = this.dataInicial ? this.formatDate(this.dataInicial) : undefined;
    const fim = this.dataFinal ? this.formatDate(this.dataFinal) : undefined;

    this.agendamentoService
      .listarAgendamentosAdmin(undefined, inicio, fim)
      .subscribe({
        next: agendamentos => {
          this.dataSource.data = agendamentos;
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
        a.data ? this.datePipe.transform(a.data, 'dd/MM/yyyy', undefined, 'pt-BR') ?? '' : '',
        a.hora,
        a.militar?.postoGrad,
        a.militar?.nomeDeGuerra,
        a.status,
        this.formatarCanceladoPor(a.canceladoPor)
      ]
        .map(v => (v ?? '').toLowerCase())
        .some(v => v.includes(f));
    };

    this.dataSource.filterPredicate = predicate;
    this.dataSource.filter = this.searchTerm;

    if (this.paginator) {
      this.paginator.firstPage();
    }
  }

  exportarPdf(): void {
    const rows = this.dataSource.filteredData;

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Header
      doc.setFontSize(16);
      doc.text('Barbearia GAP - Registros', pageWidth / 2, 15, {
        align: 'center'
      });

      let headerText = 'Todos os registros';
      if (this.dataInicial || this.dataFinal) {
        const dataIni = this.formatDateBr(this.dataInicial);
        const dataFim = this.formatDateBr(this.dataFinal);
        headerText = `Intervalo de Busca: ${dataIni} À ${dataFim}`;
      }
      doc.setFontSize(11);
      doc.text(headerText, pageWidth / 2, 22, { align: 'center' });

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
          this.datePipe.transform(r.data, 'dd/MM/yyyy', undefined, 'pt-BR') ?? '',
          this.toTime(r.hora),
          r.militar?.saram ?? '',
          r.militar?.postoGrad ?? '',
          this.formatName(r.militar?.nomeDeGuerra),
          this.formatarStatus(r.status ?? ''),
          this.formatarCanceladoPor(r.canceladoPor)
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
    return d ? this.datePipe.transform(d, 'dd/MM/yyyy', undefined, 'pt-BR') ?? '-' : '-';
  }

  toBrDate(dateStr?: string): string {
    return dateStr ? this.datePipe.transform(dateStr, 'dd/MM/yyyy', undefined, 'pt-BR') ?? '' : '';
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

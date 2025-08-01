import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { Agendamento } from '../../models/agendamento';
import { AgendamentoService } from '../../services/agendamento.service';
import { LoggingService } from '../../services/logging.service';

@Component({
  selector: 'app-gerenciar-agenda',
  templateUrl: './gerenciar-agenda.component.html',
  styleUrls: ['./gerenciar-agenda.component.css']
})
export class GerenciarAgendaComponent implements OnInit, AfterViewInit {
  displayedColumns = [
    'data',
    'hora',
    'diaSemana',
    'nome',
    'postoGrad',
    'email',
    'secao',
    'categoria',
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
      .getAgendamentosAdmin('GRADUADO', inicio, fim)
      .subscribe({
        next: data => {
          this.dataSourceGraduados.data = data;
          this.applyFilter();
        },
        error: err => this.logger.error('Erro ao carregar graduados:', err)
      });

    this.agendamentoService
      .getAgendamentosAdmin('OFICIAL', inicio, fim)
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
        a.diaSemana,
        a.militar?.nomeCompleto,
        a.militar?.postoGrad,
        a.militar?.email,
        a.militar?.secao,
        a.categoria,
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
      .then(jsPDF => {
        const doc = new jsPDF.jsPDF();
        let y = 10;
        rows.forEach(r => {
          const line =
            `${r.data} ${r.hora} ${r.diaSemana} ` +
            `${this.formatName(r.militar?.nomeCompleto)} ` +
            `${r.militar?.postoGrad ?? ''} ${r.militar?.email ?? ''} ` +
            `${r.militar?.secao ?? ''} ${r.categoria ?? ''} ` +
            `${r.status ?? ''} ${r.canceladoPor ?? ''}`;
          doc.text(line, 10, y);
          y += 10;
          if (y > 280) {
            doc.addPage();
            y = 10;
          }
        });
        doc.save('agendamentos.pdf');
      })
      .catch(err => this.logger.error('Erro ao exportar PDF:', err));
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

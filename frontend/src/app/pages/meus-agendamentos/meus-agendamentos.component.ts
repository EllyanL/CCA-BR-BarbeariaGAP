import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortable } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Agendamento } from '../../models/agendamento';
import { AgendamentoService } from '../../services/agendamento.service';

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
    'canceladoPor'
  ];
  dataSource = new MatTableDataSource<Agendamento>([]);

  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort) sort?: MatSort;

  constructor(
    private agendamentoService: AgendamentoService,
    private datePipe: DatePipe
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
            return new Date(`${item.data}T${item.hora || '00:00'}`).getTime();
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
        this.formatarStatus(a.status),
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
        CANCELADO: 'status-cancelado',
        INDISPONIVEL: 'status-indisponivel'
      } as any
    )[s] || '';
  }
}

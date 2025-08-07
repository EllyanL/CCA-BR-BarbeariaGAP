import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatPaginator } from '@angular/material/paginator';
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
  displayedColumns: string[] = ['data', 'hora', 'postoGrad', 'nomeDeGuerra', 'status'];
  dataSource = new MatTableDataSource<Agendamento>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private agendamentoService: AgendamentoService,
    private datePipe: DatePipe
  ) {}

  ngOnInit(): void {
    this.carregarAgendamentos();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
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
        a.status
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
}

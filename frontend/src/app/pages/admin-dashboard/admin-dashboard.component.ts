import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { DashboardService, DashboardStats, WeeklyCount } from 'src/app/services/dashboard.service';

import { Agendamento } from 'src/app/models/agendamento';
import { AgendamentoService } from 'src/app/services/agendamento.service';
import { AuthService } from 'src/app/services/auth.service';
import { Chart } from 'chart.js/auto';
import { LoggingService } from 'src/app/services/logging.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { Router } from '@angular/router';
import { HorariosService } from 'src/app/services/horarios.service';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit, AfterViewInit {
  stats?: DashboardStats;
  recent: Agendamento[] = [];
  dataSource = new MatTableDataSource<Agendamento>([]);
  searchTerm = '';
  weekly: WeeklyCount[] = [];
  displayedColumns = ['data', 'hora', 'saram', 'militar', 'categoria', 'actions'];
  @ViewChild('weeklyChart') weeklyChart?: ElementRef<HTMLCanvasElement>;
  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort) sort?: MatSort;
  weeklyChartInstance?: Chart;

  constructor(
    private dashboardService: DashboardService,
    private logger: LoggingService,
    private authService: AuthService,
    private router: Router,
    private agendamentoService: AgendamentoService,
    private snackBar: MatSnackBar,
    private horariosService: HorariosService
  ) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadRecent();
    this.loadWeekly();
  }

  ngAfterViewInit(): void {
    this.renderWeeklyChart();
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
  }

  loadStats(): void {
    this.dashboardService.getStats().subscribe({
      next: data => {
        this.logger.log('Estatísticas recebidas:', data);
        this.stats = data;
      },
      error: err => this.logger.error('Erro ao carregar estatísticas', err)
    });
  }

  loadRecent(): void {
    this.dashboardService.getRecent().subscribe({
      next: data => {
        this.logger.log('Dados recentes recebidos:', data);
        this.recent = data;
        this.dataSource.data = data;
        this.applyFilters();
      },
      error: err => this.logger.error('Erro ao carregar recentes', err)
    });
  }

  gerenciarHorariosOficial(): void {
    this.router.navigate(['/admin/horarios'], { queryParams: { categoria: 'OFICIAL' } })
      .catch(err => this.logger.error('Erro na navegação:', err));
  }

  gerenciarHorariosGraduado(): void {
    this.router.navigate(['/admin/horarios'], { queryParams: { categoria: 'GRADUADO' } })
      .catch(err => this.logger.error('Erro na navegação:', err));
  }

  logout(): void {
    this.authService.logout();
  }


  loadWeekly(): void {
    this.dashboardService.getWeekly().subscribe({
      next: data => {
        this.weekly = data;
        this.renderWeeklyChart();
      },
      error: err => this.logger.error('Erro ao carregar dados semanais', err)
    });
  }

  applyFilters(event?: Event): void {
    if (event) {
      const target = event.target as HTMLInputElement;
      this.searchTerm = target.value.trim().toLowerCase();
    }

    this.dataSource.filterPredicate = (ag: Agendamento, filter: string): boolean => {
      if (!filter) { return true; }
      const f = filter.trim().toLowerCase();

      const nome = (ag.militar?.nomeCompleto || '').toLowerCase();
      const saram = (ag.usuarioSaram || ag.militar?.saram || '').toLowerCase();
      const categoria = (ag.categoria || ag.militar?.categoria || '').toLowerCase();
      const email = (ag.militar?.email || '').toLowerCase();
      const datas = this.normalizeDateFormats(ag.data).map(d => d.toLowerCase());

      return [nome, saram, categoria, email, ...datas].some(v => v.includes(f));
    };

    this.dataSource.filter = this.searchTerm;
    if (this.paginator) {
      this.paginator.firstPage();
    }
  }

  private normalizeDateFormats(dateStr?: string): string[] {
    if (!dateStr) { return []; }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) { return []; }
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = String(date.getFullYear());
    return [`${dd}/${mm}/${yyyy}`, `${yyyy}-${mm}-${dd}`];
  }
  

  deleteAgendamento(a: Agendamento): void {
    if (!a.id) { return; }
    const confirmado = confirm('Deseja realmente excluir este agendamento?');
    if (!confirmado) { return; }
    this.agendamentoService.deleteAgendamento(a.id).subscribe({
      next: () => {
        this.snackBar.open('Agendamento removido com sucesso.', 'Ciente', { duration: 3000 });
        this.recent = this.recent.filter(r => r.id !== a.id);
        this.dataSource.data = this.recent;
        this.applyFilters();
        this.horariosService.disponibilizarHorario(a.hora.slice(0,5), a.diaSemana, a.categoria)
          .subscribe({
            next: () => {
              this.horariosService.carregarHorariosDaSemana(a.categoria).subscribe({
                next: horarios => this.horariosService.atualizarHorarios(horarios),
                error: err => this.logger.error('Erro ao atualizar horários', err)
              });
            },
            error: err => this.logger.error('Erro ao disponibilizar horário', err)
          });
      },
      error: err => this.logger.error('Erro ao excluir agendamento', err)
    });
  }

  formatNome(valor?: string | null): string {
    if (!valor) {
      return 'Não informado';
    }
    return valor
      .toLowerCase()
      .split(' ')
      .map(p => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }

  formatCategoria(valor?: string | null): string {
    return this.formatNome(valor);
  }

  formatHora(hora: string): string {
    if (!hora) {
      return '';
    }
    const partes = hora.split(':');
    return partes.slice(0, 2).join(':');
  }

  private renderWeeklyChart(): void {
    if (!this.weeklyChart || this.weekly.length === 0) {
      return;
    }
    const labels = this.weekly.map(w => w.data);
    const values = this.weekly.map(w => w.total);
    if (this.weeklyChartInstance) {
      this.weeklyChartInstance.destroy();
    }
    this.weeklyChartInstance = new Chart(this.weeklyChart.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Agendamentos',
            data: values,
            backgroundColor: '#3f51b5'
          }
        ]
      },
      options: {
        responsive: true
      }
    });
  }
}

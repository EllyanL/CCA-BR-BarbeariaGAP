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

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit, AfterViewInit {
  stats?: DashboardStats;
  recent: Agendamento[] = [];
  dataSource = new MatTableDataSource<Agendamento>([]);
  filterDate: string | null = null;
  filterCategory = '';
  filterMilitar = '';
  weekly: WeeklyCount[] = [];
  displayedColumns = ['data', 'hora', 'militar', 'categoria', 'actions'];
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
    private snackBar: MatSnackBar
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
        this.stats = data;
      },
      error: err => this.logger.error('Erro ao carregar estatísticas', err)
    });
  }

  loadRecent(): void {
    this.dashboardService.getRecent().subscribe({
      next: data => {
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

  applyFilters(): void {
    this.dataSource.filterPredicate = (ag: Agendamento, filter: string): boolean => {
      const f = JSON.parse(filter);
  
      const matchesDate = f.date ? ag.data === f.date : true;
      const matchesCategory = f.category
        ? (ag.categoria || '').toLowerCase().includes(f.category.toLowerCase())
        : true;
      const matchesMilitar = f.militar
        ? (ag.militar?.nomeCompleto || '').toLowerCase().includes(f.militar.toLowerCase())
        : true;
  
      return matchesDate && matchesCategory && matchesMilitar;
    };
  
    this.dataSource.filter = JSON.stringify({
      date: this.filterDate,
      category: this.filterCategory,
      militar: this.filterMilitar
    });
    if (this.paginator) {
      this.paginator.firstPage();
    }
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
      },
      error: err => this.logger.error('Erro ao excluir agendamento', err)
    });
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

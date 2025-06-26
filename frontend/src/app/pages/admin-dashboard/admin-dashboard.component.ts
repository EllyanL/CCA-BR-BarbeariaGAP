import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Chart } from 'chart.js/auto';
import { DashboardService, DashboardStats } from 'src/app/services/dashboard.service';
import { LoggingService } from 'src/app/services/logging.service';
import { Agendamento } from 'src/app/models/agendamento';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit, AfterViewInit {
  stats?: DashboardStats;
  recent: Agendamento[] = [];
  displayedColumns = ['data', 'hora', 'militar', 'categoria', 'actions'];
  @ViewChild('categoryChart') categoryChart?: ElementRef<HTMLCanvasElement>;
  chart?: Chart;

  constructor(private dashboardService: DashboardService, private logger: LoggingService) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadRecent();
  }

  ngAfterViewInit(): void {
    this.renderCategoryChart();
  }

  loadStats(): void {
    this.dashboardService.getStats().subscribe({
      next: data => {
        this.stats = data;
        this.renderCategoryChart();
      },
      error: err => this.logger.error('Erro ao carregar estatísticas', err)
    });
  }

  loadRecent(): void {
    this.dashboardService.getRecent().subscribe({
      next: data => (this.recent = data),
      error: err => this.logger.error('Erro ao carregar recentes', err)
    });
  }

  private renderCategoryChart(): void {
    if (!this.categoryChart || !this.stats?.distribuicaoPorCategoria) {
      return;
    }
    const labels = Object.keys(this.stats.distribuicaoPorCategoria);
    const values = Object.values(this.stats.distribuicaoPorCategoria);
    if (this.chart) {
      this.chart.destroy();
    }
    this.chart = new Chart(this.categoryChart.nativeElement, {
      type: 'pie',
      data: {
        labels,
        datasets: [
          {
            data: values
          }
        ]
      },
      options: {
        responsive: true
      }
    });
  }
}

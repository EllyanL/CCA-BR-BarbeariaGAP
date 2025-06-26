import { Component, OnInit } from '@angular/core';
import { DashboardService, DashboardStats } from 'src/app/services/dashboard.service';
import { LoggingService } from 'src/app/services/logging.service';
import { Agendamento } from 'src/app/models/agendamento';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  stats?: DashboardStats;
  recent: Agendamento[] = [];
  displayedColumns = ['data', 'hora', 'militar', 'categoria', 'actions'];

  constructor(private dashboardService: DashboardService, private logger: LoggingService) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadRecent();
  }

  loadStats(): void {
    this.dashboardService.getStats().subscribe({
      next: data => (this.stats = data),
      error: err => this.logger.error('Erro ao carregar estatísticas', err)
    });
  }

  loadRecent(): void {
    this.dashboardService.getRecent().subscribe({
      next: data => (this.recent = data),
      error: err => this.logger.error('Erro ao carregar recentes', err)
    });
  }
}

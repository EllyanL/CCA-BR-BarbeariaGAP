import { Component, ChangeDetectionStrategy } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { Router } from '@angular/router';
import { LoggingService } from 'src/app/services/logging.service';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminComponent {
  constructor(
    private authService: AuthService,
    private router: Router,
    private logger: LoggingService
  ) {}

  logout(): void {
    this.authService.logout();
  }

  gerenciarHorariosGraduado() {
    this.logger.log('Navegando para horários - Graduado');
    this.router.navigate(['/admin/horarios'], { queryParams: { categoria: 'GRADUADO' } }).catch(err => this.logger.error('Erro na navegação:', err));
  }

  gerenciarHorariosOficial() {
    this.logger.log('Navegando para horários - Oficial');
    this.router.navigate(['/admin/horarios'], { queryParams: { categoria: 'OFICIAL' } }).catch(err => this.logger.error('Erro na navegação:', err));
  }

  gerenciarUsuarios() {
    this.logger.log('Navegando para usuários');
    this.router.navigate(['/admin/usuarios']).catch(err => this.logger.error('Erro na navegação:', err));
  }

  verBloqueios15Dias(): void {
    this.logger.log('Navegando para bloqueios da regra de 15 dias');
    this.router.navigate(['/admin/bloqueios']).catch(err => this.logger.error('Erro na navegação:', err));
  }

  abrirDashboard() {
    this.logger.log('Navegando para dashboard admin');
    this.router.navigate(['/admin/dashboard']).catch(err => this.logger.error('Erro na navegação:', err));
  }
}

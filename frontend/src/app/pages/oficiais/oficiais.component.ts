import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { HorariosService } from 'src/app/services/horarios.service'; // Importar o serviço
import { OrientacoesComponent } from 'src/app/components/agendamento/orientacoes/orientacoes.component';
import { LoggingService } from 'src/app/services/logging.service';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-oficiais',
  template: `
    <mat-sidenav-container class="page-container">
      <mat-sidenav mode="side" opened>
        <app-sidebar></app-sidebar>
      </mat-sidenav>
      <mat-sidenav-content>
        <div class="oficiais-page-content">
          <app-header
            class="oficiais-page-content__header"
            [titleHeader]="titleHeader"
          ></app-header>

          <app-tabela-semanal
            class="oficiais-page-content__tabela-semanal"
            [opcoesPostoGrad]="opcoesPostoGrad"
            [categoria]="categoria"
            [horariosPorDia]="horariosPorDia"
            [saramUsuario]="saramUsuario"
          ></app-tabela-semanal>
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
})
export class OficiaisComponent implements OnInit {
  titleHeader = 'OFICIAIS';
  // Categoria precisa estar em maiúsculo para corresponder ao backend
  categoria = 'OFICIAL';
  opcoesPostoGrad: string[] = ['ASP', '2TEN', '1TEN', 'CAP', 'MAJ', 'TC', 'CEL'];
  horariosPorDia: { [dia: string]: { horario: string, status: string }[] } = {};
  saramUsuario: string = '';

  constructor(
    private dialog: MatDialog,
    private horariosService: HorariosService,
    private logger: LoggingService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.horariosService.carregarHorariosDaSemana('OFICIAL').subscribe({
      next: (horarios) => {
        this.horariosPorDia = horarios;
      },
      error: (error) => {
        this.logger.error('Erro ao carregar horários em OficiaisComponent:', error);
      }
    });

    const usuario = this.authService.getUsuarioAutenticado();
    this.saramUsuario = usuario?.saram || '';

    this.dialog.open(OrientacoesComponent, {
      enterAnimationDuration: '1000ms'
    });
  }
}

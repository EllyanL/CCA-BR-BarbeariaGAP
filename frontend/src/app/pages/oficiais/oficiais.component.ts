import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { HorariosService } from 'src/app/services/horarios.service'; // Importar o serviço
import { HorariosPorDia } from 'src/app/models/slot-horario';
import { OrientacoesComponent } from 'src/app/components/agendamento/orientacoes/orientacoes.component';
import { LoggingService } from 'src/app/services/logging.service';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-oficiais',
  template: `
    <ng-container *ngIf="isAdmin; else noSidebar">
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
              [idMilitarLogado]="idMilitarLogado"
            ></app-tabela-semanal>
          </div>
        </mat-sidenav-content>
      </mat-sidenav-container>
    </ng-container>
    <ng-template #noSidebar>
      <div class="page-container">
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
            [idMilitarLogado]="idMilitarLogado"
          ></app-tabela-semanal>
        </div>
      </div>
    </ng-template>
  `,
  styleUrls: ['./oficiais.component.css'],
})
export class OficiaisComponent implements OnInit {
  titleHeader = 'OFICIAIS';
  // Categoria precisa estar em maiúsculo para corresponder ao backend
  categoria = 'OFICIAL';
  opcoesPostoGrad: string[] = ['ASP', '2TEN', '1TEN', 'CAP', 'MAJ', 'TC', 'CEL'];
  horariosPorDia: HorariosPorDia = {
    segunda: [],
    terca: [],
    quarta: [],
    quinta: [],
    sexta: [],
  };
  saramUsuario: string = '';
  idMilitarLogado: number | null = null;
  isAdmin: boolean = false;

  constructor(
    private dialog: MatDialog,
    private horariosService: HorariosService,
    private logger: LoggingService,
    private authService: AuthService
  ) {
    const usuario = this.authService.getUsuarioAutenticado();
    this.saramUsuario = usuario?.saram || '';
    this.idMilitarLogado = usuario?.id || null;
  }

  ngOnInit(): void {
    this.isAdmin = this.authService.isAdmin();
    this.horariosService.startPollingHorarios(this.categoria);
    this.horariosService.horariosPorDia$.subscribe({
      next: (horarios) => {
        this.horariosPorDia = horarios;
      },
      error: (error) => {
        this.logger.error('Erro ao atualizar horários em OficiaisComponent:', error);
      }
    });

    if (!localStorage.getItem('orientacoesOcultas')) {
      this.dialog.open(OrientacoesComponent, {
        enterAnimationDuration: '1000ms'
      });
    }
  }
}

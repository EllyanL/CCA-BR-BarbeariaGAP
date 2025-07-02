import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { HorariosPorDia, HorariosService } from 'src/app/services/horarios.service'; // Importar o serviço
import { OrientacoesComponent } from 'src/app/components/agendamento/orientacoes/orientacoes.component';
import { LoggingService } from 'src/app/services/logging.service';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-graduados',
  template: `
    <mat-sidenav-container class="page-container">
      <mat-sidenav mode="side" opened>
        <app-sidebar></app-sidebar>
      </mat-sidenav>
      <mat-sidenav-content>
        <div class="graduados-page-content">
          <app-header
            class="graduados-page-content__header"
            [titleHeader]="titleHeader"
          ></app-header>

          <app-tabela-semanal
            class="graduados-page-content__tabela-semanal"
            [opcoesPostoGrad]="opcoesGraduacoes"
            [categoria]="categoria"
            [horariosPorDia]="horariosPorDia"
            [saramUsuario]="saramUsuario"
          ></app-tabela-semanal>
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
})
export class GraduadosComponent implements OnInit {
  titleHeader = 'GRADUADOS';
  categoria = 'GRADUADO';  // cuidado: estava como 'graduado'
  opcoesGraduacoes: string[] = ['S2', 'S1', 'CB', '3S', '2S', '1S', 'SO'];

  horariosPorDia: HorariosPorDia = {}; // <-- ESSA LINHA É CRUCIAL
  saramUsuario: string = '';

  constructor(
    private dialog: MatDialog,
    private horariosService: HorariosService,
    private logger: LoggingService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.horariosService.carregarHorariosDaSemana(this.categoria).subscribe({
      next: (horarios) => {
        this.horariosPorDia = horarios;
        this.logger.log('Horários recebidos:', this.horariosPorDia);
      },
      error: (err) => {
        this.logger.error('Erro ao carregar horários:', err);
      }
    });

    const usuario = this.authService.getUsuarioAutenticado();
    this.saramUsuario = usuario?.saram || '';

    this.dialog.open(OrientacoesComponent, {
      enterAnimationDuration: '1000ms'
    });
  }
}

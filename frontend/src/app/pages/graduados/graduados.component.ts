import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { HorariosService } from 'src/app/services/horarios.service';
import { HorariosPorDia } from 'src/app/models/slot-horario';
import { OrientacoesComponent } from 'src/app/components/agendamento/orientacoes/orientacoes.component';
import { LoggingService } from 'src/app/services/logging.service';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-graduados',
  templateUrl: './graduados.component.html',
  styleUrls: ['./graduados.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraduadosComponent implements OnInit {
  titleHeader = 'GRADUADOS';
  categoria = 'GRADUADO';  // cuidado: estava como 'graduado'
  opcoesGraduacoes: string[] = ['S2', 'S1', 'CB', '3S', '2S', '1S', 'SO'];

  horariosPorDia: HorariosPorDia = {
    segunda: [],
    terca: [],
    quarta: [],
    quinta: [],
    sexta: [],
  }; // <-- ESSA LINHA É CRUCIAL
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
    this.horariosService.carregarHorariosDaSemana(this.categoria).subscribe({
      next: (horarios) => {
        this.horariosPorDia = horarios;
        this.logger.log('Horários recebidos:', this.horariosPorDia);
      },
      error: (err) => {
        this.logger.error('Erro ao carregar horários:', err);
      }
    });

    this.dialog.open(OrientacoesComponent, {
      enterAnimationDuration: '1000ms'
    });
  }
}

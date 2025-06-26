import { Component, OnInit } from '@angular/core';
import { HorariosPorDia, HorariosService } from '../../services/horarios.service';

import { Agendamento } from '../../models/agendamento';
import { AgendamentoService } from '../../services/agendamento.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-agendar-corte',
  templateUrl: './agendar-corte.component.html',
  styleUrls: ['./agendar-corte.component.css']
})
export class AgendarCorteComponent implements OnInit {
  dias = [
    { label: 'Segunda', key: 'segunda' },
    { label: 'Terça', key: 'terça' },
    { label: 'Quarta', key: 'quarta' },
    { label: 'Quinta', key: 'quinta' },
    { label: 'Sexta', key: 'sexta' }
  ];
  selectedDayIndex = 0;
  horarios: { hora: string; status: string; usuarioId?: number }[] = [];
  meusAgendamentos: Agendamento[] = [];
  categoria: string = '';

  constructor(
    private horariosService: HorariosService,
    private agendamentoService: AgendamentoService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const usuario = this.authService.getUsuarioAutenticado();
    this.categoria = usuario?.role === 'OFICIAL' ? 'OFICIAL' : 'GRADUADO';
    this.carregarHorarios();
    this.carregarMeusAgendamentos();
  }

  selecionarDia(index: number): void {
    this.selectedDayIndex = index;
    this.carregarHorarios();
  }

  carregarHorarios(): void {
    const dia = this.dias[this.selectedDayIndex].key;
    this.horariosService.carregarHorariosDaSemana(this.categoria).subscribe(res => {
      const horariosDia = res[dia] || [];
      this.horarios = horariosDia.map(h => ({
        hora: h.horario,
        status: h.status,
        usuarioId: h.usuarioId
      }));
    });
  }

  carregarMeusAgendamentos(): void {
    this.agendamentoService.getAgendamentos().subscribe(res => {
      this.meusAgendamentos = res || [];
    });
  }

  agendar(h: {hora: string}): void {
    const dia = this.dias[this.selectedDayIndex].key;
    const payload: Agendamento = {
      hora: h.hora,
      diaSemana: dia,
      categoria: this.categoria
    };
    this.agendamentoService.createAgendamento(payload).subscribe(() => {
      this.carregarHorarios();
      this.carregarMeusAgendamentos();
    });
  }

  cancelar(ag: Agendamento): void {
    if (!ag.id) return;
    this.agendamentoService.deleteAgendamento(ag.id).subscribe(() => {
      this.carregarHorarios();
      this.carregarMeusAgendamentos();
    });
  }

  podeCancelar(ag: Agendamento): boolean {
    if (ag.timestamp == null) return false;
    const diff = ag.timestamp - Date.now();
    return diff >= 15 * 60 * 1000;
  }
}

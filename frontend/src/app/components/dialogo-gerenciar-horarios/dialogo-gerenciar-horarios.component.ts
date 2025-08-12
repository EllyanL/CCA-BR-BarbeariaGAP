import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

interface Horario {
  hora: string;
  selecionado: boolean;
}

@Component({
  selector: 'app-dialogo-gerenciar-horarios',
  templateUrl: './dialogo-gerenciar-horarios.component.html',
  styleUrls: ['./dialogo-gerenciar-horarios.component.css']
})
export class DialogoGerenciarHorariosComponent {
  diasDaSemana = [
    { value: 0, label: 'Dom' },
    { value: 1, label: 'Seg' },
    { value: 2, label: 'Ter' },
    { value: 3, label: 'Qua' },
    { value: 4, label: 'Qui' },
    { value: 5, label: 'Sex' },
    { value: 6, label: 'Sáb' }
  ];
  diasSelecionados: number[] = [];

  horaInicio = '';
  horaFim = '';
  intervalo = 30;

  horariosGerados: Horario[] = [];

  constructor(public dialogRef: MatDialogRef<DialogoGerenciarHorariosComponent>) {}

  gerarHorarios(): void {
    if (!this.horaInicio || !this.horaFim) {
      this.horariosGerados = [];
      return;
    }

    const [startH, startM] = this.horaInicio.split(':').map(Number);
    const [endH, endM] = this.horaFim.split(':').map(Number);

    const start = new Date();
    start.setHours(startH, startM, 0, 0);
    const end = new Date();
    end.setHours(endH, endM, 0, 0);

    const horarios: Horario[] = [];
    const current = new Date(start.getTime());

    while (current <= end) {
      const hh = current.getHours().toString().padStart(2, '0');
      const mm = current.getMinutes().toString().padStart(2, '0');
      horarios.push({ hora: `${hh}:${mm}`, selecionado: false });
      current.setMinutes(current.getMinutes() + this.intervalo);
    }

    this.horariosGerados = horarios;
  }

  selecionarTodos(): void {
    this.horariosGerados.forEach(h => (h.selecionado = true));
  }

  limparSelecao(): void {
    this.horariosGerados.forEach(h => (h.selecionado = false));
  }

  confirmar(): void {
    const selecionados = this.horariosGerados
      .filter(h => h.selecionado)
      .map(h => h.hora);
    this.dialogRef.close(selecionados);
  }
}

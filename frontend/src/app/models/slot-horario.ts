export interface SlotHorario {
  id?: number;
  horario: string;
  status: 'DISPONIVEL' | 'AGENDADO' | 'INDISPONIVEL';
  usuarioId?: number | null;
}

export type HorariosPorDia = Record<string, SlotHorario[]>;

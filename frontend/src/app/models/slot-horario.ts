import { DiaKey } from '../shared/dias.util';

export interface SlotHorario {
  id?: number;
  horario: string;
  status: 'DISPONIVEL' | 'AGENDADO' | 'INDISPONIVEL' | 'REALIZADO' | 'REAGENDADO';
  usuarioId?: number | null;
}

export type HorariosPorDia = Record<DiaKey, SlotHorario[]>;

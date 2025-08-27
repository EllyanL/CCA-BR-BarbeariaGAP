import { DiaKey } from '../shared/dias.util';

export interface Horario {
  id?: number;
  dia: DiaKey;
  horario: string;
  categoria: string;
  status: 'DISPONIVEL' | 'AGENDADO' | 'CANCELADO' | 'REALIZADO' | 'INDISPONIVEL';
  // Status possibilities for a given horário
  usuarioId?: number;
}

export interface HorarioRequest {
  dia: DiaKey;
  horario: string;
  categoria: string;
}

import { DiaKey } from '../shared/dias.util';

export interface HorarioDTO {
  id?: number;
  dia: DiaKey;
  horario: string;
  categoria: string;
  status: 'DISPONIVEL' | 'AGENDADO' | 'CANCELADO' | 'REALIZADO' | 'INDISPONIVEL';
  usuarioId?: number | null;
}

import { DiaKey } from '../shared/dias.util';

export interface HorarioDTO {
  id?: number;
  dia: DiaKey;
  horario: string;
  categoria: string;
  status: 'DISPONIVEL' | 'AGENDADO' | 'INDISPONIVEL';
  usuarioId?: number | null;
}

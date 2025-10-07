import { Militar } from './militar';
import { DiaKey } from '../shared/dias.util';
import { JustificativaAusencia } from './justificativa-ausencia';

export { Militar } from './militar';

export interface Agendamento {
  id?: number;
  data?: string;
  hora: string;
  diaSemana: DiaKey;
  categoria: string;
  militar?: Partial<Militar> | null; // aceita resumos vindos do backend
  usuarioSaram?: string;
  saramUsuario?: string;
  cpfUsuario?: string;
  nomeUsuario?: string;
  disponivel?: boolean;
  timestamp?: number;
  status?: string;
  canceladoPor?: string;
  justificativaAusencia?: JustificativaAusencia | null;
}

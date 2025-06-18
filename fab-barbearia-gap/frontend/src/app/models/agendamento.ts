import { Militar } from './militar';

export { Militar } from './militar';

export interface Agendamento {
  id?: number;
  data?: string;
  hora: string;
  diaSemana: string;
  categoria: string;
  militar?: Militar | null; // ← agora opcional
  disponivel?: boolean;
  timestamp?: number;
}

export interface Horario {
  id?: number;
  dia: string;
  horario: string;
  categoria: string;
  status: 'DISPONIVEL' | 'AGENDADO' | 'CANCELADO' | 'REALIZADO' | 'INDISPONIVEL';
  // Status possibilities for a given horário
  usuarioId?: number;
}
export interface HorarioRequest {
  dia: string;
  horario: string;
  categoria: string;
}

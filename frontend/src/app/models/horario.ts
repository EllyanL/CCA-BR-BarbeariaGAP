export interface Horario {
  id?: number;
  dia: string;
  horario: string;
  categoria: string;
  status: string; // 'DISPONIVEL', 'Indisponivel', 'Agendado'
  usuarioId?: number;
}
export interface HorarioRequest {
  dia: string;
  horario: string;
  categoria: string;
}

export interface Horario {
  id?: number;
  dia: string;
  horario: string;
  categoria: string;
  status: string; // 'Disponível', 'Indisponível', 'Agendado'
  usuarioId?: number;
}
export interface HorarioRequest {
  dia: string;
  horario: string;
  categoria: string;
}

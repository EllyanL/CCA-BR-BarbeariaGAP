export interface HorarioDTO {
  id?: number;
  dia: string;
  horario: string;
  categoria: string;
  status: 'DISPONIVEL' | 'AGENDADO' | 'CANCELADO' | 'REALIZADO' | 'INDISPONIVEL';
  usuarioId?: number | null;
}

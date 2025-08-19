import { HorariosPorDia } from '../models/slot-horario';

/**
 * Retorna uma cópia de HorariosPorDia garantindo que cada horário esteja no
 * formato HH:mm (sem segundos).
 */
export function normalizeHorariosPorDia(horarios: HorariosPorDia): HorariosPorDia {
  const result: HorariosPorDia = { ...horarios } as any;
  Object.keys(result || {}).forEach((dia) => {
    const lista = result[dia as keyof HorariosPorDia] || [];
    result[dia as keyof HorariosPorDia] = lista.map(h => ({
      ...h,
      horario: h.horario.slice(0, 5)
    }));
  });
  return result;
}

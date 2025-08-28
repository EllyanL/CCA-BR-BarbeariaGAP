import { HorariosPorDia } from '../models/slot-horario';
import { DiaKey } from '../shared/dias.util';

/**
 * Normaliza uma string de horário garantindo o formato HH:mm.
 */
export function normalizeHora(hora?: string | null): string {
  if (!hora) {
    return '';
  }
  const clean = hora
    .replace(/\u00A0/g, '')
    .trim();
  const [h = '', m = ''] = clean.split(':');
  const hh = h.padStart(2, '0');
  const mm = m.padStart(2, '0');
  return `${hh}:${mm}`.slice(0, 5);
}

/**
 * Retorna uma cópia de HorariosPorDia garantindo que cada horário esteja no
 * formato HH:mm (sem segundos).
 */
export function normalizeHorariosPorDia(horarios: HorariosPorDia): HorariosPorDia {
  const result: HorariosPorDia = { ...horarios };
  for (const dia of Object.keys(result) as DiaKey[]) {
    const lista = result[dia] || [];
    result[dia] = lista.map(h => ({
      ...h,
      horario: normalizeHora(h.horario)
    }));
  }
  return result;
}

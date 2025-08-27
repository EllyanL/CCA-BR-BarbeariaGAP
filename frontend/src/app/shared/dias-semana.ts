export const DIA_SEMANA = {
  segunda: 'segunda',
  terca: 'terça',
  quarta: 'quarta',
  quinta: 'quinta',
  sexta: 'sexta'
} as const;
export type DiaSemana = keyof typeof DIA_SEMANA;
export const normalizeDia = (d: string) =>
  d.normalize('NFD').replace(/\p{M}/g, '').toLowerCase() as DiaSemana;

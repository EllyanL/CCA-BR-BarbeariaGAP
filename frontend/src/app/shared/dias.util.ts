export const DIA_SEMANA = {
  segunda: 'segunda',
  terca: 'terca',
  quarta: 'quarta',
  quinta: 'quinta',
  sexta: 'sexta',
} as const;

export type DiaKey = keyof typeof DIA_SEMANA;

export const DIA_LABEL_MAP: Record<DiaKey, string> = {
  segunda: 'segunda',
  terca: 'terça',
  quarta: 'quarta',
  quinta: 'quinta',
  sexta: 'sexta',
} as const;

export const normalizeDia = (d: string): DiaKey =>
  d
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase() as DiaKey;

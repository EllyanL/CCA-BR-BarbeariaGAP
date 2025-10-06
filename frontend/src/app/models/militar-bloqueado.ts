export interface MilitarBloqueado {
  militarId: number;
  saram?: string | null;
  nomeCompleto?: string | null;
  nomeDeGuerra?: string | null;
  postoGrad?: string | null;
  categoria?: string | null;
  ultimaData: string;
  diasRestantes: number;
}

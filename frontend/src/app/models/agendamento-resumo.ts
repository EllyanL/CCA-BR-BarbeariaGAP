export interface AgendamentoResumoMilitar {
  postoGrad?: string | null;
  nomeDeGuerra?: string | null;
}

export interface AgendamentoResumo {
  id: number;
  dia: string;
  hora: string;
  categoria: string;
  militar?: AgendamentoResumoMilitar | null;
}

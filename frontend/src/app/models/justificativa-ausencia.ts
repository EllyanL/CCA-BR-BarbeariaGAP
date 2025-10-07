export type JustificativaStatus = 'AGUARDANDO' | 'APROVADO' | 'RECUSADO';

export interface JustificativaAusencia {
  id: number;
  status: JustificativaStatus;
  justificativa: string;
  dataSolicitacao?: string;
  dataResposta?: string;
  avaliadoPorPostoGrad?: string;
  avaliadoPorNomeDeGuerra?: string;
}

export interface JustificativaAusenciaAdmin extends JustificativaAusencia {
  agendamentoId: number;
  postoGradMilitar?: string;
  nomeDeGuerraMilitar?: string;
  diaSemana: string;
  data: string;
  hora: string;
}

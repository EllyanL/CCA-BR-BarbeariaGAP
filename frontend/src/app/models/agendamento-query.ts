export type AgendamentoQuery = {
  categoria?: string;
  dataInicio?: string;
  dataFim?: string;
} & {
  [param: string]: string;
};


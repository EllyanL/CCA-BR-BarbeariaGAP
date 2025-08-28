import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'statusFormat'
})
export class StatusFormatPipe implements PipeTransform {
  private readonly textMap: Record<string, string> = {
    DISPONIVEL: 'Disponível',
    INDISPONIVEL: 'Indisponível',
    AGENDADO: 'Agendado'
  };

  private readonly classMap: Record<string, string> = {
    AGENDADO: 'status-agendado',
    DISPONIVEL: 'status-disponivel',
    INDISPONIVEL: 'status-indisponivel'
  };

  private readonly tabelaClassMap: Record<string, string> = {
    DISPONIVEL: 'tabela-botao-disponivel',
    AGENDADO: 'botao-agendado',
    INDISPONIVEL: 'tabela-botao-indisponivel'
  };

  transform(value?: string, mode: 'text' | 'class' | 'tabelaClass' = 'text'): string {
    const key = (value || '').toUpperCase();
    switch (mode) {
      case 'class':
        return this.classMap[key] || '';
      case 'tabelaClass':
        return this.tabelaClassMap[key] || 'tabela-botao-indisponivel';
      default:
        if (!value) {
          return '';
        }
        return this.textMap[key] || value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    }
  }
}


import { StatusFormatPipe } from './status-format.pipe';

describe('StatusFormatPipe', () => {
  const pipe = new StatusFormatPipe();

  it('formats status text', () => {
    expect(pipe.transform('disponivel')).toBe('Disponível');
    expect(pipe.transform('AGENDADO')).toBe('Agendado');
  });

  it('maps status to class', () => {
    expect(pipe.transform('AGENDADO', 'class')).toBe('status-agendado');
    expect(pipe.transform('indisponivel', 'class')).toBe('status-indisponivel');
  });

  it('maps status to tabela class', () => {
    expect(pipe.transform('DISPONIVEL', 'tabelaClass')).toBe('tabela-botao-disponivel');
    expect(pipe.transform('agendado', 'tabelaClass')).toBe('botao-agendado');
  });
});


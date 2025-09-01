import { StatusFormatPipe } from './status-format.pipe';

describe('StatusFormatPipe', () => {
  const pipe = new StatusFormatPipe();

  it('formats status text', () => {
    expect(pipe.transform('disponivel')).toBe('Disponível');
    expect(pipe.transform('AGENDADO')).toBe('Agendado');
    expect(pipe.transform('REALIZADO')).toBe('Efetuado');
    expect(pipe.transform('cancelado')).toBe('Cancelado');
  });

  it('maps status to class', () => {
    expect(pipe.transform('AGENDADO', 'class')).toBe('status-agendado');
    expect(pipe.transform('indisponivel', 'class')).toBe('status-indisponivel');
    expect(pipe.transform('realizado', 'class')).toBe('status-realizado');
    expect(pipe.transform('CANCELADO', 'class')).toBe('status-cancelado');
  });

  it('maps status to tabela class', () => {
    expect(pipe.transform('DISPONIVEL', 'tabelaClass')).toBe('tabela-botao-disponivel');
    expect(pipe.transform('agendado', 'tabelaClass')).toBe('botao-agendado');
    expect(pipe.transform('REALIZADO', 'tabelaClass')).toBe('tabela-botao-realizado');
    expect(pipe.transform('cancelado', 'tabelaClass')).toBe('tabela-botao-cancelado');
  });
});


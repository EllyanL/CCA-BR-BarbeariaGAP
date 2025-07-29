import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { LoggingService } from './logging.service';
import { UserService } from './user.service';

function createToken(payload: any): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

describe('AuthService token decoding', () => {
  let service: AuthService;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: Router, useValue: {} },
        { provide: LoggingService, useValue: { log: () => {}, error: () => {} } },
        { provide: UserService, useValue: { setUserData: () => {}, getUserData: () => [{ id: 1 }] } }
      ]
    });
    service = TestBed.inject(AuthService);
  });

  it('extracts saram field from JWT', () => {
    const payload = {
      sub: '123',
      saram: '456',
      categoria: 'GRADUADO',
      nomeCompleto: 'Nome',
      email: 'n@example.com',
      om: 'OM',
      postoGrad: 'SGT'
    };
    const token = createToken(payload);
    localStorage.setItem('barbearia-token', token);

    const militar = service.getUsuarioAutenticado();

    expect(militar).toEqual(jasmine.objectContaining({
      cpf: payload.sub,
      saram: payload.saram,
      categoria: payload.categoria
    }));

    localStorage.removeItem('barbearia-token');
  });

  it('uses id claim when present', () => {
    const payload = {
      sub: '123',
      id: 99,
      saram: '456',
      categoria: 'GRADUADO'
    };
    const token = createToken(payload);
    sessionStorage.setItem('barbearia-token', token);

    const militar = service.getUsuarioAutenticado();

    expect(militar?.id).toBe(99);

    sessionStorage.removeItem('barbearia-token');
  });

  it('extracts nomeCompleto and email when present', () => {
    const payload = {
      sub: '123',
      saram: '456',
      categoria: 'GRADUADO',
      nomeCompleto: 'Nome Teste',
      email: 'email@test.com'
    };
    const token = createToken(payload);
    localStorage.setItem('barbearia-token', token);

    const militar = service.getUsuarioAutenticado();

    expect(militar?.nomeCompleto).toBe(payload.nomeCompleto);
    expect(militar?.email).toBe(payload.email);

    localStorage.removeItem('barbearia-token');
  });
});

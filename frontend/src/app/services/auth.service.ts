import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, tap, throwError } from 'rxjs';

import { Injectable } from '@angular/core';
import { LoggingService } from './logging.service';
import { Router } from '@angular/router';
import { UserData } from '../models/userData';
import { Militar } from '../models/militar';
import { UserService } from './user.service';
import { environment } from 'src/environments/environment';
import { jwtDecode } from 'jwt-decode';

export interface LoginResponse {
  id?: number;
  token: string;
  role: string; // Garantir que role venha do backend como GRADUADO ou OFICIAL
  postoGrad?: string;
  om?: string;
  nomeDeGuerra?: string;
  saram?: string;
  nomeCompleto?: string;
  email?: string;
  secao?: string;
  ramal?: string;
}


@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private readonly headers = new HttpHeaders({ 'Content-Type': 'application/json' });
  private readonly tokenKey = 'barbearia-token';

  constructor(
    private http: HttpClient,
    private router: Router,
    private userService: UserService,
    private logger: LoggingService
  ) {}

  login(cpf: string, senha: string, rememberMe: boolean = false): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { cpf, senha }, { headers: this.headers }).pipe(
      tap((response) => {
        this.logger.log('Resposta do login:', response);
        this.saveToken(response.token, rememberMe);
        const userData: UserData = {
          id: response.id,
          postoGrad: response.postoGrad || 'Desconhecido',
          nomeDeGuerra: response.nomeDeGuerra || 'Desconhecido',
          role: response.role || 'GRADUADO', // Garantir que role seja válido
          om: response.om || '',
          cpf: cpf,
          saram: response.saram || '',
          nomeCompleto: response.nomeCompleto || '',
          email: response.email || '',
          secao: response.secao || '',
          ramal: response.ramal || ''
        };
        this.userService.setUserData([userData]);
        if (rememberMe) {
          localStorage.setItem('user-data', JSON.stringify([userData]));
        }
      }),
      catchError(this.handleError)
    );
  }

  logout(): void {
    this.clearToken();
    this.userService.setUserData([]);
    this.router.navigate(['/auth/login']);
  }

  saveToken(token: string, rememberMe: boolean): void {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(this.tokenKey, token); // this.tokenKey deve ser 'barbearia-token'
  }  

  isAuthenticated(): boolean {
    const token = this.getToken();
    return !!token;
  }

  private hasRole(role: string): boolean {
    const token = this.getToken();
    if (token) {
      try {
        const decodedToken: any = jwtDecode(token);
        return decodedToken.role === role;
      } catch (error) {
        this.logger.error('Erro ao decodificar o token:', error);
      }
    }
    return false;
  }

  isAdmin(): boolean { return this.hasRole('ADMIN'); }
  isOficial(): boolean { return this.hasRole('OFICIAL'); }
  isGraduado(): boolean { return this.hasRole('GRADUADO'); }

  getUsuarioAutenticado(): Militar | null {
    const token = this.getToken();
    let roleFromToken: string | null = null;
    const idFromUserData = this.userService.getUserData()[0]?.id;

    if (token) {
      try {
        const decodedToken: any = jwtDecode(token);
        roleFromToken = decodedToken.role || null;
        this.logger.log('🔑 ROLE do token:', roleFromToken); // 👈 ADICIONE ISTO
        return {
          id: idFromUserData,
          cpf: decodedToken.sub,
          saram: decodedToken.saram,
          role: roleFromToken,
          nomeCompleto: decodedToken.nomeCompleto,
          email: decodedToken.email,
          om: decodedToken.om,
          postoGrad: decodedToken.postoGrad
        } as Militar;
      } catch (error) {
        this.logger.error('Erro ao decodificar o token:', error);
      }
    }
  
    return null;
  }

  getToken(): string | null {
    return localStorage.getItem('barbearia-token') || sessionStorage.getItem('barbearia-token');
  }
  
  private clearToken(): void {
    localStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.tokenKey);
    localStorage.removeItem('user-data');
    sessionStorage.removeItem('user-data');
  }

  private handleError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'Ocorreu um erro inesperado. Tente novamente mais tarde.';
    if (error.status === 401) errorMessage = 'CPF ou senha incorretos. Verifique suas credenciais.';
    else if (error.status === 503) errorMessage = 'O servidor está indisponível no momento. Tente novamente mais tarde.';
    else if (error.status >= 500) errorMessage = 'Erro no servidor. Por favor, tente novamente mais tarde.';
    else if (error.status >= 400 && error.status < 500) errorMessage = 'Erro na solicitação. Verifique os dados informados.';
    this.logger.error('Erro capturado:', error);
    return throwError(() => new Error(errorMessage));
  };
}

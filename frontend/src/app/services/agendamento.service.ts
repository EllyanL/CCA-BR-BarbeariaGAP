import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, throwError, map } from 'rxjs';

import { Agendamento } from '../models/agendamento';
import { Injectable } from '@angular/core';
import { LoggingService } from './logging.service';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AgendamentoService {
  private readonly apiUrl = `${environment.apiUrl}/agendamentos`;

  constructor(
    private http: HttpClient,
    private logger: LoggingService
  ) {}

  getAgendamentos(): Observable<Agendamento[]> {
    return this.http.get<Agendamento[] | null>(this.apiUrl).pipe(
      map(response => response ?? []),
      catchError(error => {
        this.logger.error('Erro ao obter agendamentos (service):', error);
        return throwError(() => error);
      })
    );
  }

  getAgendamentosAdmin(
    categoria?: string,
    inicio?: string,
    fim?: string
  ): Observable<Agendamento[]> {
    let params: any = {};
    if (categoria) params.categoria = categoria;
    if (inicio) params.inicio = inicio;
    if (fim) params.fim = fim;
    return this.http
      .get<Agendamento[] | null>(`${this.apiUrl}/admin`, { params })
      .pipe(
        map(res => res ?? []),
        catchError(error => {
          this.logger.error('Erro ao obter agendamentos admin:', error);
          return throwError(() => error);
        })
      );
  }

  listarFiltrado(
    categoria?: string,
    inicio?: string,
    fim?: string
  ): Observable<Agendamento[]> {
    let params: any = {};
    if (categoria) params.categoria = categoria;
    if (inicio) params.inicio = inicio;
    if (fim) params.fim = fim;
    return this.http
      .get<Agendamento[] | null>(`${this.apiUrl}/admin`, { params })
      .pipe(
        map(res => res ?? []),
        catchError(error => {
          this.logger.error('Erro ao listar agendamentos filtrados:', error);
          return throwError(() => error);
        })
      );
  }

  getAgendamentoPorHorario(data: string, hora: string, dia: string, categoria: string): Observable<Agendamento> {
    const params = { data, hora, dia, categoria };
    return this.http.get<Agendamento>(`${this.apiUrl}/check`, { params }).pipe(
      catchError(error => throwError(() => error))
    );
  }
    

  createAgendamento(agendamento: Agendamento): Observable<Agendamento> {
    this.logger.log('Enviando para URL:', this.apiUrl);
    return this.http.post<Agendamento>(this.apiUrl, agendamento).pipe(
      catchError(error => {
        this.logger.error('❌ Erro no createAgendamento():', error);
        return throwError(() => error);
      })
    );
  }
  

  cancelarAgendamento(id: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/cancelar`, {}).pipe(
      catchError(error => throwError(() => error))
    );
  }

  updateAgendamento(id: number, dados: Partial<Agendamento>): Observable<Agendamento> {
    const headers = this.getAuthHeaders();
    return this.http.put<Agendamento>(`${this.apiUrl}/${id}`, dados, { headers }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('barbearia-token') || sessionStorage.getItem('barbearia-token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
      });
  }

  getMeusAgendamentos(): Observable<Agendamento[]> {
    return this.http.get<Agendamento[] | null>(`${this.apiUrl}/meus`).pipe(
      map(res => res ?? []),
      catchError(error => {
        this.logger.error('Erro ao obter meus agendamentos:', error);
        return throwError(() => error);
      })
    );
  }
  
}

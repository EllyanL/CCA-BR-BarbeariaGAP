import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';

import {
  JustificativaAusencia,
  JustificativaAusenciaAdmin
} from '../models/justificativa-ausencia';
import { LoggingService } from './logging.service';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class JustificativaAusenciaService {
  private readonly apiUrl = `${environment.apiUrl}/justificativas-ausencia`;

  constructor(
    private http: HttpClient,
    private logger: LoggingService
  ) {}

  solicitar(agendamentoId: number, justificativa: string): Observable<JustificativaAusencia> {
    return this.http
      .post<JustificativaAusencia>(
        `${this.apiUrl}/agendamentos/${agendamentoId}`,
        { justificativa }
      )
      .pipe(
        catchError(error => {
          this.logger.error('Erro ao solicitar justificativa de ausência:', error);
          return throwError(() => error);
        })
      );
  }

  listarAdmin(): Observable<JustificativaAusenciaAdmin[]> {
    return this.http.get<JustificativaAusenciaAdmin[] | null>(`${this.apiUrl}/admin`).pipe(
      map(res => res ?? []),
      catchError(error => {
        this.logger.error('Erro ao listar justificativas de ausência (admin):', error);
        return throwError(() => error);
      })
    );
  }

  detalhar(id: number): Observable<JustificativaAusenciaAdmin> {
    return this.http.get<JustificativaAusenciaAdmin>(`${this.apiUrl}/admin/${id}`).pipe(
      catchError(error => {
        this.logger.error('Erro ao detalhar justificativa de ausência:', error);
        return throwError(() => error);
      })
    );
  }

  aprovar(id: number): Observable<JustificativaAusenciaAdmin> {
    return this.http.post<JustificativaAusenciaAdmin>(`${this.apiUrl}/admin/${id}/aprovar`, {}).pipe(
      catchError(error => {
        this.logger.error('Erro ao aprovar justificativa de ausência:', error);
        return throwError(() => error);
      })
    );
  }

  recusar(id: number): Observable<JustificativaAusenciaAdmin> {
    return this.http.post<JustificativaAusenciaAdmin>(`${this.apiUrl}/admin/${id}/recusar`, {}).pipe(
      catchError(error => {
        this.logger.error('Erro ao recusar justificativa de ausência:', error);
        return throwError(() => error);
      })
    );
  }
}

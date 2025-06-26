import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { LoggingService } from './logging.service';
import { Agendamento } from '../models/agendamento';

export interface DashboardStats {
  agendamentosHoje: number;
  totalUsuarios: number;
  distribuicaoPorCategoria: { [key: string]: number };
  ocupacaoAtual: number;
}

export interface WeeklyCount {
  data: string;
  total: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly apiUrl = `${environment.apiUrl}/dashboard`;

  constructor(private http: HttpClient, private logger: LoggingService) {}

  getStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/stats`).pipe(
      catchError(err => {
        this.logger.error('Erro ao obter estatísticas', err);
        return throwError(() => err);
      })
    );
  }

  getRecent(): Observable<Agendamento[]> {
    return this.http.get<Agendamento[]>(`${this.apiUrl}/recent`).pipe(
      catchError(err => {
        this.logger.error('Erro ao obter agendamentos recentes', err);
        return throwError(() => err);
      })
    );
  }

  getWeekly(): Observable<WeeklyCount[]> {
    return this.http.get<WeeklyCount[]>(`${this.apiUrl}/stats/weekly`).pipe(
      catchError(err => {
        this.logger.error('Erro ao obter dados semanais', err);
        return throwError(() => err);
      })
    );
  }
}

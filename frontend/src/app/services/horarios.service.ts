import { BehaviorSubject, Observable, Subscription, forkJoin, interval, throwError } from 'rxjs';
import { Horario, HorarioRequest } from '../models/horario';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { catchError, map, startWith, switchMap, tap } from 'rxjs/operators';

import { Agendamento } from '../models/agendamento';
import { Injectable } from '@angular/core';
import { LoggingService } from './logging.service';
import { environment } from 'src/environments/environment';

interface HorarioResponse {
  mensagem: string;
  horariosAfetados: Horario[];
}

export interface HorariosPorDiaECategoria {
  [dia: string]: {
    [categoria: string]: Horario[];
  };
}

export interface HorariosPorDia {
  [dia: string]: { horario: string; status: string; usuarioId?: number }[];
}


interface HorarioBase {
  id: number;
  horario: string;
}

@Injectable({
  providedIn: 'root'
})
export class HorariosService {
  private readonly apiUrl = `${environment.apiUrl}/horarios`;
  private readonly agendamentosUrl = `${environment.apiUrl}/agendamentos`;
  private horariosPorDiaSource = new BehaviorSubject<HorariosPorDia>({
    segunda: [],
    terça: [],
    quarta: [],
    quinta: [],
    sexta: []
  });
  horariosPorDia$ = this.horariosPorDiaSource.asObservable();
  private pollingSub?: Subscription;

  constructor(
    private http: HttpClient,
    private logger: LoggingService
  ) {}

  //---------------⏰ Gerenciamento de Horários---------------

  carregarHorariosDaSemana(categoria: string): Observable<HorariosPorDia> {
    return this.http.get<HorariosPorDia>(`${this.apiUrl}/categoria/${categoria}`).pipe(
      map((data: HorariosPorDia) => {
        // Validação: garantir que cada valor seja array de objetos válidos
        const resultado: HorariosPorDia = {};
        Object.entries(data).forEach(([dia, horarios]) => {
          if (Array.isArray(horarios)) {
            resultado[dia] = horarios.map((h: any) => ({
              horario: h.horario,
              status: h.status?.toUpperCase() || 'INDISPONIVEL',
              usuarioId: h.usuarioId
            }));
          }
        });
        return resultado;
      }),
      catchError((error) => {
        this.logger.error('❌ Erro ao carregar horários da semana:', error);
        return throwError(() => error);
      })
    );
  }


  getHorariosBase(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/base`).pipe(
      catchError(error => {
        this.logger.error('Erro ao buscar horários base:', error);
        return throwError(() => error);
      })
    );
  }

  adicionarHorarioBase(horario: string, dia: string, categoria: string): Observable<any> {
    const novoHorario = { horario, dia, categoria };
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/adicionar`, novoHorario, { headers });
  }  

  adicionarHorarioDia(horario: string, dia: string, categoria: string): Observable<any> {
    const payload = { horario, dia, categoria };
    return this.http.post(`${this.apiUrl}/adicionar`, payload, { headers: this.getAuthHeaders() });
  }

  removerHorarioBase(horario: string, dia: string, categoria: string): Observable<boolean> {
    const url = `${this.apiUrl}/remover`;
    const body = { horario, dia, categoria };
    return this.http.request('delete', url, { body, responseType: 'text' }).pipe(
      map(response => response.toLowerCase().includes('sucesso')),
      catchError((error: HttpErrorResponse | ProgressEvent) => {
        if (error instanceof HttpErrorResponse) {
          this.logger.error('Erro HTTP ao remover horário:', error.status, error.message);
          const errorMessage = error.error || error.message;
          return throwError(() => new Error(errorMessage));
        } else {
          this.logger.error('Erro de rede ao remover horário:', error);
          return throwError(() => new Error('Erro de rede: Não foi possível conectar ao servidor. Verifique se o backend está rodando.'));
        }
      })
    );
  }

  adicionarHorarioBaseEmDias(horario: string, dias: string[], categoria: string): Observable<any[]> {
    const requests = dias.map(d => this.adicionarHorarioBase(horario, d, categoria));
    return forkJoin(requests);
  }

  removerHorarioBaseEmDias(horario: string, dias: string[], categoria: string): Observable<any[]> {
    const requests = dias.map(d => this.removerHorarioBase(horario, d, categoria));
    return forkJoin(requests);
  }

  getHorariosDisponiveis(): Observable<HorariosPorDiaECategoria> {
    return this.http.get<HorariosPorDiaECategoria>(this.apiUrl).pipe(
      tap(response => this.logger.log('Resposta do backend:', response)),
      catchError((error: HttpErrorResponse) => {
        this.logger.error('Erro ao buscar horários disponíveis:', error);
        return throwError(() => new Error(error.message));
      })
    );
  }

  atualizarHorarios(novosHorarios: HorariosPorDia) {
    this.horariosPorDiaSource.next(novosHorarios);
  }

  startPollingHorarios(categoria: string, intervalMs: number = 30000): void {
    this.stopPollingHorarios();
    this.pollingSub = interval(intervalMs)
      .pipe(
        startWith(0),
        switchMap(() => this.carregarHorariosDaSemana(categoria))
      )
      .subscribe({
        next: horarios => this.atualizarHorarios(horarios),
        error: err => this.logger.error('Erro no polling de horários:', err)
      });
  }

  stopPollingHorarios(): void {
    this.pollingSub?.unsubscribe();
    this.pollingSub = undefined;
  }

  disponibilizarHorario(horario: string, dia: string, categoria: string): Observable<any> {
    const horarioRequest: HorarioRequest = { dia, horario, categoria };
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/disponibilizar`, horarioRequest, { headers });
  }

  indisponibilizarHorario(horario: string, dia: string, categoria: string): Observable<any> {
    const horarioRequest: HorarioRequest = { dia, horario, categoria };
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/indisponibilizar`, horarioRequest, { headers });
  }

  alterarDisponibilidadeEmDias(horario: string, dias: string[], categoria: string, disponibilizar: boolean): Observable<any[]> {
    const requests = dias.map(d =>
      disponibilizar
        ? this.disponibilizarHorario(horario, d, categoria)
        : this.indisponibilizarHorario(horario, d, categoria)
    );
    return forkJoin(requests);
  }

  indisponibilizarTodosHorarios(dia: string, horarios: string[], categoria: string): Observable<HorarioResponse> {
    const url = `${this.apiUrl}/indisponibilizar/tudo/${encodeURIComponent(dia)}?categoria=${encodeURIComponent(categoria)}`;
    return this.http.post<HorarioResponse>(url, horarios, { headers: this.getAuthHeaders() }).pipe(
      tap(() => this.logger.log(`Todos os horários de ${dia} foram indisponibilizados.`)),
      catchError((error: HttpErrorResponse) => {
        this.logger.error('Erro ao indisponibilizar todos os horários:', error.error, error.message);
        return throwError(() => new Error(error.message || 'Erro desconhecido'));
      })
    );
  }

  disponibilizarTodosHorariosComEndpoint(dia: string, horarios: string[], categoria: string): Observable<HorarioResponse> {
    const horariosFormatados = horarios.map(h => h.slice(0, 5)); // 👈 garante HH:mm
    
    const url = `${this.apiUrl}/disponibilizar/tudo/${encodeURIComponent(dia)}?categoria=${encodeURIComponent(categoria)}`;
    return this.http.post<HorarioResponse>(url, horariosFormatados, { headers: this.getAuthHeaders() }).pipe(
      tap(() => this.logger.log(`✅ Todos os horários de ${dia} foram disponibilizados.`)),
      catchError((error: HttpErrorResponse) => {
        this.logger.error('❌ Erro ao disponibilizar todos os horários:', error.error, error.message);
        return throwError(() => new Error(error.message || 'Erro desconhecido'));
      })
    );
  } 
  
  //--------------📅Gerenciamento de Agendamento-------------
  agendarHorario(agendamento: Agendamento): Observable<any> {
    return this.http.post(`${this.apiUrl}/agendar`, agendamento, { responseType: 'text' as 'json' }).pipe(
      catchError((error: HttpErrorResponse) => {
        this.logger.error('Erro ao agendar horário:', error);
        return throwError(() => new Error("Erro ao agendar"));
      })
    );
  }
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('barbearia-token') || sessionStorage.getItem('barbearia-token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }
}

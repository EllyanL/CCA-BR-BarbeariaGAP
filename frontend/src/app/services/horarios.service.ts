import { BehaviorSubject, Observable, forkJoin, throwError, from, of } from 'rxjs';
import { Horario, HorarioRequest } from '../models/horario';
import { HorarioDTO } from '../models/horario-dto';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { catchError, map, tap, mergeMap, toArray } from 'rxjs/operators';

import { Agendamento } from '../models/agendamento';
import { Injectable } from '@angular/core';
import { LoggingService } from './logging.service';
import { environment } from 'src/environments/environment';
import { SlotHorario, HorariosPorDia } from '../models/slot-horario';
import { normalizeHorariosPorDia } from '../utils/horarios-utils';

interface HorarioResponse {
  mensagem: string;
  horariosAfetados: Horario[];
}

export interface HorariosPorDiaECategoria {
  [dia: string]: {
    [categoria: string]: SlotHorario[];
  };
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
  private horariosPorDiaSource = new BehaviorSubject<HorariosPorDia>({
    segunda: [],
    terca: [],
    quarta: [],
    quinta: [],
    sexta: []
  });
  horariosPorDia$ = this.horariosPorDiaSource.asObservable();
  private eventSource?: EventSource;

  constructor(
    private http: HttpClient,
    private logger: LoggingService
  ) {}

  private normalizeDia(d: string): string {
    return d
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  //---------------⏰ Gerenciamento de Horários---------------

  carregarHorariosDaSemana(categoria: string): Observable<HorariosPorDia> {
    return this.http
      .get<HorariosPorDia>(`${this.apiUrl}/categoria/${categoria}`)
      .pipe(
        map((horarios) => {
          return Object.fromEntries(
            Object.entries(horarios || {}).map(([dia, slots]) => {
              const normalizedDia = this.normalizeDia(dia);
              const normalizedSlots = (slots || []).map((slot) => ({
                ...slot,
                horario: slot.horario.slice(0, 5),
              }));
              return [normalizedDia, normalizedSlots];
            })
          ) as HorariosPorDia;
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
    const novoHorario = { horario, dia: this.normalizeDia(dia), categoria };
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/adicionar`, novoHorario, { headers }).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404 || error.status === 409) {
          return of(null);
        }
        return throwError(() => error);
      })
    );
  }

  adicionarHorarioDia(horario: string, dia: string, categoria: string): Observable<any> {
    const payload = { horario, dia: this.normalizeDia(dia), categoria };
    return this.http.post(`${this.apiUrl}/adicionar`, payload, { headers: this.getAuthHeaders() });
  }

  /**
   * Remove definitivamente um horário base via endpoint `/remover`.
   */
  removerHorarioBase(horario: string, dia: string, categoria: string): Observable<boolean> {
    const url = `${this.apiUrl}/remover`;
    const body = { horario, dia: this.normalizeDia(dia), categoria };
    return this.http.request('delete', url, { body, responseType: 'text' }).pipe(
      map(response => response.toLowerCase().includes('sucesso')),
      catchError((error: HttpErrorResponse | ProgressEvent) => {
        if (error instanceof HttpErrorResponse) {
          if (error.status === 404 || error.status === 409) {
            return of(true);
          }
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
    return from(dias).pipe(
      mergeMap(d => this.adicionarHorarioBase(horario, d, categoria).pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 404 || error.status === 409) {
            return of(null);
          }
          return throwError(() => error);
        })
      )),
      toArray()
    );
  }

  removerHorarioBaseEmDias(horario: string, dias: string[], categoria: string): Observable<any[]> {
    return from(dias).pipe(
      mergeMap(d => this.removerHorarioBase(horario, d, categoria).pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 404 || error.status === 409) {
            return of(true);
          }
          return throwError(() => error);
        })
      )),
      toArray()
    );
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
    this.horariosPorDiaSource.next(normalizeHorariosPorDia(novosHorarios));
  }

  startPollingHorarios(categoria: string): void {
    this.stopPollingHorarios();
    const source = new EventSource(`${this.apiUrl}/stream`);
    this.eventSource = source;
    source.onmessage = () => {
      this.carregarHorariosDaSemana(categoria).subscribe({
        next: horarios => this.atualizarHorarios(horarios),
        error: err => this.logger.error('Erro ao atualizar horários via SSE:', err)
      });
    };
    source.onerror = err => {
      this.logger.error('Erro no stream de horários:', err);
    };
  }

  stopPollingHorarios(): void {
    this.eventSource?.close();
    this.eventSource = undefined;
  }

  disponibilizarHorario(dia: string, horario: string, categoria: string): Observable<Horario> {
    const horarioRequest: HorarioRequest = { dia, horario, categoria };
    const headers = this.getAuthHeaders();
    return this.http.post<Horario>(`${this.apiUrl}/disponibilizar`, horarioRequest, { headers });
  }

  indisponibilizarHorario(dia: string, horario: string, categoria: string): Observable<Horario> {
    const horarioRequest: HorarioRequest = { dia, horario, categoria };
    const headers = this.getAuthHeaders();
    return this.http.post<Horario>(`${this.apiUrl}/indisponibilizar`, horarioRequest, { headers });
  }

  toggleSlot(dia: string, horario: string, categoria: string): Observable<HorarioDTO> {
    const body: HorarioRequest = { dia: this.normalizeDia(dia), horario, categoria };
    return this.http
      .put<HorarioDTO>(`${this.apiUrl}/toggle`, body, { headers: this.getAuthHeaders() })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          this.logger.error('Erro ao alternar horário:', error);
          return throwError(() => error);
        })
      );
  }

  alterarStatusHorario(horarioId: number, status: 'DISPONIVEL' | 'INDISPONIVEL'): Observable<Horario> {
    const headers = this.getAuthHeaders();
    return this.http
      // Ajustado para usar o endpoint `/horarios/{id}` sem o sufixo `/status`
      .put<Horario>(`${this.apiUrl}/${horarioId}`, { status }, { headers })
      .pipe(
        tap(h => {
          const atuais = { ...this.horariosPorDiaSource.getValue() };
          const diaLower = this.normalizeDia(h.dia ?? '');
          if (diaLower && atuais[diaLower]) {
            const lista = [...atuais[diaLower]];
            const idx = lista.findIndex(s => s.horario === h.horario);
            if (idx !== -1) {
              lista[idx] = {
                ...lista[idx],
                status: h.status as SlotHorario['status'],
                usuarioId: h.usuarioId,
                id: h.id
              };
              atuais[diaLower] = lista;
              this.horariosPorDiaSource.next(atuais);
            }
          }
        }),
        catchError((error: HttpErrorResponse) => {
          this.logger.error('Erro ao alterar status do horário:', error);
          return throwError(() => error);
        })
      );
  }

  alterarDisponibilidadeEmDias(horario: string, dias: string[], categoria: string, disponibilizar: boolean): Observable<Horario[]> {
    const requests = dias.map(d =>
      disponibilizar
        ? this.disponibilizarHorario(d, horario, categoria)
        : this.indisponibilizarHorario(d, horario, categoria)
    );

    return forkJoin(requests).pipe(
      tap(horarios => {
        const atuais = { ...this.horariosPorDiaSource.getValue() };
        horarios.forEach(h => {
          const diaLower = this.normalizeDia(h.dia);
          const lista = atuais[diaLower] ?? [];
          const idx = lista.findIndex(s => s.horario === h.horario);
          if (idx !== -1) {
            lista[idx] = { ...lista[idx], status: h.status as SlotHorario['status'], usuarioId: h.usuarioId };
          }
          atuais[diaLower] = lista;
        });
        this.horariosPorDiaSource.next(atuais);
      })
    );
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

  toggleDia(
    payload: { dia: string; categoria: string; acao: 'DISPONIBILIZAR' | 'INDISPONIBILIZAR' }
  ): Observable<HorariosPorDia> {
    const body = {
      ...payload,
      dia: this.normalizeDia(payload.dia)
    };
    return this.http
      .put<HorariosPorDia>(`${this.apiUrl}/toggle-dia`, body, { headers: this.getAuthHeaders() })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          this.logger.error('Erro ao alternar dia:', error);
          return throwError(() => error);
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

        let message = error.error?.message || error.error || 'Erro ao agendar';
        if (error.status === 400 || error.status === 422) {
          message = message || (error.status === 400
            ? 'Você só pode agendar novamente após 15 dias'
            : 'Não é possível agendar horários passados');
        }

        return throwError(() => new Error(message));
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

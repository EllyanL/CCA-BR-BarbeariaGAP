import { BehaviorSubject, Observable, forkJoin, throwError, from, of } from 'rxjs';
import { Horario, HorarioRequest } from '../models/horario';
import { HorarioDTO } from '../models/horario-dto';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { catchError, map, tap, mergeMap, toArray } from 'rxjs/operators';

import { Injectable } from '@angular/core';
import { LoggingService } from './logging.service';
import { environment } from 'src/environments/environment';
import { SlotHorario, HorariosPorDia } from '../models/slot-horario';
import { normalizeHorariosPorDia } from '../utils/horarios-utils';
import { normalizeDia, DiaKey } from '../shared/dias.util';
import { getCookie } from '../utils/cookie.util';

interface HorarioResponse {
  mensagem: string;
  horariosAfetados: Horario[];
}

export type HorariosPorDiaECategoria = Record<DiaKey, Record<string, SlotHorario[]>>;

type BackendHorariosResponse = Record<string, Record<string, SlotHorario[]>>;


interface HorarioBase {
  id: number;
  horario: string;
}

export interface AdicionarHorarioBaseResultado {
  dia: DiaKey;
  horario: string;
  categoria: string;
  sucesso: boolean;
  conflito?: boolean;
  mensagem?: string;
  status?: number;
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

  //---------------⏰ Gerenciamento de Horários---------------

  carregarHorariosDaSemana(categoria: string): Observable<HorariosPorDia> {
    return this.http
      .get<HorariosPorDia>(`${this.apiUrl}/categoria/${categoria}`)
      .pipe(
        map((horarios) => {
          return Object.fromEntries(
            Object.entries(horarios || {}).map(([dia, slots]) => {
              const normalizedDia: DiaKey = normalizeDia(dia);
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

  adicionarHorarioBase(horario: string, dia: DiaKey, categoria: string): Observable<AdicionarHorarioBaseResultado> {
    const diaNormalizado = normalizeDia(dia) as DiaKey;
    const novoHorario = { horario, dia: diaNormalizado, categoria };
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/adicionar`, novoHorario, { headers }).pipe(
      map(() => ({
        dia: diaNormalizado,
        horario,
        categoria,
        sucesso: true,
        conflito: false,
        status: 200,
      } as AdicionarHorarioBaseResultado)),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404 || error.status === 409) {
          const mensagemPadrao = error.status === 409
            ? 'Horário já existente para o dia selecionado.'
            : 'Horário não encontrado para o dia selecionado.';
          const mensagem = this.extrairMensagemErro(error, mensagemPadrao);
          this.logger.warn('Horário base não pôde ser adicionado.', {
            status: error.status,
            horario,
            dia: diaNormalizado,
            categoria,
            mensagem,
          });
          return of({
            dia: diaNormalizado,
            horario,
            categoria,
            sucesso: false,
            conflito: error.status === 409,
            mensagem,
            status: error.status,
          });
        }
        return throwError(() => error);
      })
    );
  }

  adicionarHorarioDia(horario: string, dia: DiaKey, categoria: string): Observable<any> {
    const payload = { horario, dia: normalizeDia(dia) as DiaKey, categoria };
    return this.http.post(`${this.apiUrl}/adicionar`, payload, { headers: this.getAuthHeaders() });
  }

  /**
   * Remove definitivamente um horário base via endpoint `/remover`.
   */
  removerHorarioBase(horario: string, dia: DiaKey, categoria: string): Observable<boolean> {
    const url = `${this.apiUrl}/remover`;
    const body = { horario, dia: normalizeDia(dia) as DiaKey, categoria };
    return this.http.request('delete', url, { body, responseType: 'text' }).pipe(
      map(response => response.toLowerCase().includes('sucesso')),
      catchError((error: HttpErrorResponse | ProgressEvent) => {
        if (error instanceof HttpErrorResponse) {
          if (error.status === 404) {
            return of(true);
          }
          const mensagem = this.extrairMensagemErro(
            error,
            'Falha ao remover o horário. Cancele o agendamento antes de tentar novamente.'
          );
          this.logger.warn('Backend impediu remoção do horário.', {
            status: error.status,
            horario,
            dia,
            categoria,
            mensagem,
          });
          return throwError(() => new Error(mensagem));
        } else {
          this.logger.error('Erro de rede ao remover horário:', error);
          return throwError(() => new Error('Erro de rede: Não foi possível conectar ao servidor. Verifique se o backend está rodando.'));
        }
      })
    );
  }

  adicionarHorarioBaseEmDias(horario: string, dias: DiaKey[], categoria: string): Observable<AdicionarHorarioBaseResultado[]> {
    return from(dias).pipe(
      mergeMap(d => this.adicionarHorarioBase(horario, d, categoria)),
      toArray()
    );
  }

  removerHorarioBaseEmDias(horario: string, dias: DiaKey[], categoria: string): Observable<any[]> {
    return from(dias).pipe(
      mergeMap(d => this.removerHorarioBase(horario, d, categoria)),
      toArray()
    );
  }

  getHorariosDisponiveis(): Observable<HorariosPorDiaECategoria> {
    return this.http.get<BackendHorariosResponse>(this.apiUrl).pipe(
      map((response): HorariosPorDiaECategoria => {
        const normalized: HorariosPorDiaECategoria = {} as Record<DiaKey, Record<string, SlotHorario[]>>;
        Object.entries(response || {}).forEach(([dia, categorias]) => {
          normalized[normalizeDia(dia)] = categorias;
        });
        return normalized;
      }),
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

    const atualizarHorarios = () => {
      this.carregarHorariosDaSemana(categoria).subscribe({
        next: horarios => this.atualizarHorarios(horarios),
        error: err => this.logger.error('Erro ao atualizar horários via SSE:', err)
      });
    };

    // Realiza um carregamento imediato para garantir que a tabela reflita o estado atual do backend
    atualizarHorarios();

    const source = new EventSource(`${this.apiUrl}/stream`);
    this.eventSource = source;
    source.addEventListener('horarios-update', () => atualizarHorarios());
    source.onmessage = () => atualizarHorarios();
    source.onerror = err => {
      this.logger.error('Erro no stream de horários:', err);
    };
  }

  stopPollingHorarios(): void {
    this.eventSource?.close();
    this.eventSource = undefined;
  }

  disponibilizarHorario(dia: DiaKey, horario: string, categoria: string): Observable<Horario> {
    const horarioRequest: HorarioRequest = { dia: normalizeDia(dia) as DiaKey, horario, categoria };
    const headers = this.getAuthHeaders();
    return this.http.post<Horario>(`${this.apiUrl}/disponibilizar`, horarioRequest, { headers }).pipe(
      map(h => ({ ...h, dia: normalizeDia(h.dia) as DiaKey }))
    );
  }

  indisponibilizarHorario(dia: DiaKey, horario: string, categoria: string): Observable<Horario> {
    const horarioRequest: HorarioRequest = { dia: normalizeDia(dia) as DiaKey, horario, categoria };
    const headers = this.getAuthHeaders();
    return this.http.post<Horario>(`${this.apiUrl}/indisponibilizar`, horarioRequest, { headers }).pipe(
      map(h => ({ ...h, dia: normalizeDia(h.dia) as DiaKey }))
    );
  }

  toggleSlot(dia: DiaKey, horario: string, categoria: string): Observable<HorarioDTO> {
    const body: HorarioRequest = { dia: normalizeDia(dia) as DiaKey, horario, categoria };
    return this.http
      .put<HorarioDTO>(`${this.apiUrl}/toggle`, body, { headers: this.getAuthHeaders() })
      .pipe(
        map(h => ({ ...h, dia: normalizeDia(h.dia) as DiaKey })),
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
          const diaLower: DiaKey = normalizeDia(h.dia ?? '');
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
        map(h => ({ ...h, dia: normalizeDia(h.dia ?? '') as DiaKey })),
        catchError((error: HttpErrorResponse) => {
          this.logger.error('Erro ao alterar status do horário:', error);
          return throwError(() => error);
        })
      );
  }

  liberarHorario(horarioId: number): Observable<Horario> {
    const headers = this.getAuthHeaders();
    return this.http
      .put<Horario>(`${this.apiUrl}/${horarioId}/liberar`, {}, { headers })
      .pipe(
        tap(h => {
          const atuais = { ...this.horariosPorDiaSource.getValue() };
          const diaLower: DiaKey = normalizeDia(h.dia ?? '');
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
        map(h => ({ ...h, dia: normalizeDia(h.dia ?? '') as DiaKey })),
        catchError((error: HttpErrorResponse) => {
          this.logger.error('Erro ao liberar horário:', error);
          return throwError(() => error);
        })
      );
  }

  alterarDisponibilidadeEmDias(horario: string, dias: DiaKey[], categoria: string, disponibilizar: boolean): Observable<Horario[]> {
    const requests = dias.map(d =>
      disponibilizar
        ? this.disponibilizarHorario(d, horario, categoria)
        : this.indisponibilizarHorario(d, horario, categoria)
    );

    return forkJoin(requests).pipe(
      tap(horarios => {
        const atuais = { ...this.horariosPorDiaSource.getValue() };
        horarios.forEach(h => {
          const diaLower: DiaKey = normalizeDia(h.dia);
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

  indisponibilizarTodosHorarios(dia: DiaKey, horarios: string[], categoria: string): Observable<HorarioResponse> {
    const diaNorm: DiaKey = normalizeDia(dia);
    const url = `${this.apiUrl}/indisponibilizar/tudo/${encodeURIComponent(diaNorm)}?categoria=${encodeURIComponent(categoria)}`;
    return this.http.post<HorarioResponse>(url, horarios, { headers: this.getAuthHeaders() }).pipe(
      tap(() => this.logger.log(`Todos os horários de ${dia} foram indisponibilizados.`)),
      catchError((error: HttpErrorResponse) => {
        this.logger.error('Erro ao indisponibilizar todos os horários:', error.error, error.message);
        return throwError(() => new Error(error.message || 'Erro desconhecido'));
      })
    );
  }

  toggleDia(
    payload: { dia: DiaKey; categoria: string }
  ): Observable<HorariosPorDia> {
    const body = {
      dia: normalizeDia(payload.dia) as DiaKey,
      categoria: payload.categoria
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

  disponibilizarTodosHorariosComEndpoint(dia: DiaKey, horarios: string[], categoria: string): Observable<HorarioResponse> {
    const horariosFormatados = horarios.map(h => h.slice(0, 5)); // 👈 garante HH:mm
    const diaNorm: DiaKey = normalizeDia(dia);
    const url = `${this.apiUrl}/disponibilizar/tudo/${encodeURIComponent(diaNorm)}?categoria=${encodeURIComponent(categoria)}`;
    return this.http.post<HorarioResponse>(url, horariosFormatados, { headers: this.getAuthHeaders() }).pipe(
      tap(() => this.logger.log(`✅ Todos os horários de ${dia} foram disponibilizados.`)),
      catchError((error: HttpErrorResponse) => {
        this.logger.error('❌ Erro ao disponibilizar todos os horários:', error.error, error.message);
        return throwError(() => new Error(error.message || 'Erro desconhecido'));
      })
    );
  }

  private extrairMensagemErro(error: HttpErrorResponse, fallback: string): string {
    const payload = error?.error as unknown;
    if (typeof payload === 'string') {
      const mensagemLimpa = payload.trim();
      if (mensagemLimpa.length > 0) {
        return mensagemLimpa;
      }
    }
    if (payload && typeof payload === 'object') {
      const possivelMensagem = (payload as { mensagem?: unknown; message?: unknown; error?: unknown });
      const mensagemExtraida = [possivelMensagem.mensagem, possivelMensagem.message, possivelMensagem.error]
        .find(valor => typeof valor === 'string' && valor.trim().length > 0) as string | undefined;
      if (mensagemExtraida) {
        return mensagemExtraida.trim();
      }
    }
    if (typeof error?.message === 'string' && error.message.trim().length > 0) {
      return error.message.trim();
    }
    return fallback;
  }
  private getAuthHeaders(): HttpHeaders {
    const token = getCookie('barbearia-token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }
}

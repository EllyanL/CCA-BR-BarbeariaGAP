import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject, catchError, throwError, map, tap } from 'rxjs';

import { Agendamento } from '../models/agendamento';
import { AgendamentoQuery } from '../models/agendamento-query';
import { Injectable } from '@angular/core';
import { LoggingService } from './logging.service';
import { environment } from 'src/environments/environment';
import { normalizeDia, DiaKey } from '../shared/dias.util';
import { getCookie } from '../utils/cookie.util';
import { AgendamentoResumo } from '../models/agendamento-resumo';
import { normalizeHora } from '../utils/horarios-utils';

@Injectable({
  providedIn: 'root'
})
export class AgendamentoService {
  private readonly apiUrl = `${environment.apiUrl}/agendamentos`;

  private agendamentoAtualizadoSource = new Subject<void>();
  agendamentoAtualizado$ = this.agendamentoAtualizadoSource.asObservable();

  constructor(
    private http: HttpClient,
    private logger: LoggingService
  ) {}

  getAgendamentos(categoria?: string): Observable<Agendamento[]> {
    const options = categoria ? { params: { categoria } } : undefined;
    return this.http.get<Agendamento[] | null>(this.apiUrl, options).pipe(
      map(response =>
        (response ?? []).map(ag => ({
          ...ag,
          diaSemana: normalizeDia(ag.diaSemana)
        }))
      ),
      catchError(error => {
        this.logger.error('Erro ao obter agendamentos (service):', error);
        return throwError(() => error);
      })
    );
  }

  getAgendamentosPorCategoria(categoria: string): Observable<Agendamento[]> {
    const categoriaNormalizada = (categoria || '').toUpperCase();
    return this.http
      .get<AgendamentoResumo[] | null>(`${this.apiUrl}/categoria/${categoriaNormalizada}`)
      .pipe(
        map(response => (response ?? []).map(resumo => this.mapResumoParaAgendamento(resumo))),
        catchError(error => {
          this.logger.error('Erro ao obter agendamentos por categoria:', error);
          return throwError(() => error);
        })
      );
  }

  listarAgendamentosAdmin(
    categoria?: string,
    dataInicio?: string,
    dataFim?: string
  ): Observable<Agendamento[]> {
    const params: AgendamentoQuery = {};
    if (categoria) params.categoria = categoria;
    if (dataInicio) params.dataInicio = dataInicio;
    if (dataFim) params.dataFim = dataFim;
    return this.http
      .get<Agendamento[] | null>(`${this.apiUrl}/admin`, { params })
      .pipe(
        map(res =>
          (res ?? []).map(ag => ({
            ...ag,
            diaSemana: normalizeDia(ag.diaSemana)
          }))
        ),
        catchError(error => {
          this.logger.error('Erro ao obter agendamentos admin:', error);
          return throwError(() => error);
        })
      );
  }

  getAgendamentoPorHorario(data: string, hora: string, dia: DiaKey, categoria: string): Observable<Agendamento> {
    const params = { data, hora, dia: normalizeDia(dia), categoria };
    return this.http.get<Agendamento>(`${this.apiUrl}/check`, { params }).pipe(
      map(ag => ({ ...ag, diaSemana: normalizeDia(ag.diaSemana) })),
      catchError(error => throwError(() => error))
    );
  }
    

  createAgendamento(agendamento: Agendamento): Observable<Agendamento> {
    this.logger.log('Enviando para URL:', this.apiUrl);
    const payload = { ...agendamento, diaSemana: normalizeDia(agendamento.diaSemana) };
    return this.http.post<Agendamento>(this.apiUrl, payload).pipe(
      tap(() => this.agendamentoAtualizadoSource.next()),
      tap({
        error: error => this.logger.error('❌ Erro no createAgendamento():', error)
      }),
      catchError(error => throwError(() => error))
    );
  }
  

  cancelarAgendamento(id: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/cancelar`, {}).pipe(
      tap(() => this.agendamentoAtualizadoSource.next()),
      catchError(error => throwError(() => error))
    );
  }

  updateAgendamento(id: number, dados: Partial<Agendamento>): Observable<Agendamento> {
    const headers = this.getAuthHeaders();
    const payload: Partial<Agendamento> = { ...dados };
    if (payload.diaSemana) {
      payload.diaSemana = normalizeDia(payload.diaSemana);
    }
    return this.http.put<Agendamento>(`${this.apiUrl}/${id}`, payload, { headers }).pipe(
      map(ag => ({ ...ag, diaSemana: normalizeDia(ag.diaSemana) })),
      catchError(error => throwError(() => error))
    );
  }

  private getAuthHeaders(): HttpHeaders {
    const token = getCookie('barbearia-token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
      });
  }

  private mapResumoParaAgendamento(resumo: AgendamentoResumo): Agendamento {
    const diaIso = resumo.dia;
    const horaNormalizada = normalizeHora(resumo.hora);
    const diaSemana = this.diaIsoParaDiaKey(diaIso);
    const timestamp = this.calcularTimestamp(diaIso, horaNormalizada);
    const militarResumo = resumo.militar
      ? {
          postoGrad: resumo.militar.postoGrad ?? undefined,
          nomeDeGuerra: resumo.militar.nomeDeGuerra ?? undefined,
        }
      : null;

    return {
      id: resumo.id,
      data: diaIso,
      hora: horaNormalizada,
      diaSemana,
      categoria: resumo.categoria,
      status: 'AGENDADO',
      timestamp,
      militar: militarResumo ?? undefined,
    } as Agendamento;
  }

  private diaIsoParaDiaKey(diaIso: string): DiaKey {
    try {
      const [ano, mes, dia] = diaIso.split('-').map(Number);
      const data = new Date(ano, (mes ?? 1) - 1, dia ?? 1);
      const mapa: Record<number, DiaKey> = {
        1: 'segunda',
        2: 'terca',
        3: 'quarta',
        4: 'quinta',
        5: 'sexta',
      };
      return mapa[data.getDay()] ?? 'segunda';
    } catch {
      return 'segunda';
    }
  }

  private calcularTimestamp(diaIso: string, hora: string): number | undefined {
    if (!diaIso || !hora) {
      return undefined;
    }

    const [ano, mes, dia] = diaIso.split('-').map(Number);
    if ([ano, mes, dia].some(n => Number.isNaN(n))) {
      return undefined;
    }

    const [horaStr, minutoStr] = hora.split(':');
    const horaNum = Number(horaStr);
    const minutoNum = Number(minutoStr);
    if ([horaNum, minutoNum].some(n => Number.isNaN(n))) {
      return undefined;
    }

    const data = new Date(ano, (mes ?? 1) - 1, dia ?? 1, horaNum, minutoNum, 0, 0);
    return data.getTime();
  }

  getMeusAgendamentos(): Observable<Agendamento[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<Agendamento[] | null>(`${this.apiUrl}/meus`, { headers }).pipe(
      map(res =>
        (res ?? []).map(ag => ({
          ...ag,
          diaSemana: normalizeDia(ag.diaSemana)
        }))
      ),
      catchError(error => {
        this.logger.error('Erro ao obter meus agendamentos:', error);
        return throwError(() => error);
      })
    );
  }
  
}

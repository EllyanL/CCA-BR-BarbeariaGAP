import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ConfigHorario {
  id?: number;
  inicio: string;
  fim: string;
  /** Categoria a que a configuração pertence */
  categoria?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConfigHorarioService {
  private readonly apiUrl = `${environment.apiUrl}/config-horario`;
  private reloadSubject = new Subject<string>();
  /** Emite quando a janela de horários de uma categoria é atualizada. */
  recarregarGrade$ = this.reloadSubject.asObservable();

  constructor(private http: HttpClient) {}

  /** Obtém a configuração atual de horários. */
  get(): Observable<ConfigHorario> {
    return this.http.get<ConfigHorario>(this.apiUrl);
  }

  /** Atualiza a configuração de horários. */
  put(payload: { inicio: string; fim: string; categoria: string }): Observable<ConfigHorario> {
    return this.http.put<ConfigHorario>(this.apiUrl, payload);
  }

  /** Notifica assinantes para recarregar a grade de determinada categoria. */
  emitirRecarregarGrade(categoria: string): void {
    this.reloadSubject.next(categoria);
  }
}


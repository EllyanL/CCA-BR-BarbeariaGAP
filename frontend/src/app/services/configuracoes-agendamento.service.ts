import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ConfiguracaoAgendamento {
  horarioInicio: string;
  horarioFim: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConfiguracoesAgendamentoService {
  private readonly apiUrl = `${environment.apiUrl}/configuracoes`;
  private reloadSubject = new Subject<string>();
  recarregarGrade$ = this.reloadSubject.asObservable();

  constructor(private http: HttpClient) {}

  getConfig(): Observable<ConfiguracaoAgendamento> {
    return this.http.get<ConfiguracaoAgendamento>(this.apiUrl);
  }

  updateConfig(config: ConfiguracaoAgendamento): Observable<ConfiguracaoAgendamento> {
    return this.http.put<ConfiguracaoAgendamento>(this.apiUrl, config);
  }

  emitirRecarregarGrade(categoria: string): void {
    this.reloadSubject.next(categoria);
  }
}


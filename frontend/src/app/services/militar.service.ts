import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError } from 'rxjs';
import { LoggingService } from './logging.service';
import { Militar } from '../models/militar';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MilitarService {
  private readonly apiUrl = `${environment.apiUrl}/militares`;

  constructor(
    private http: HttpClient,
    private logger: LoggingService
  ) { }

  getMilitaresByCategoria(categoria: string): Observable<Militar[]> {
    return this.http.get<Militar[]>(`${this.apiUrl}/categoria/${categoria}`).pipe(
      catchError(error => {
        this.logger.error('Erro ao buscar militares: ', error);
        throw error;
      })
    );
  }

  getMilitares(): Observable<Militar[]> {
    return this.http.get<Militar[]>(this.apiUrl).pipe(
      catchError(error => {
        this.logger.error('Erro ao buscar militares: ', error);
        throw error;
      })
    );
  }
}

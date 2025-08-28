import { Injectable } from '@angular/core';
import { ReplaySubject } from 'rxjs';
import { LoggingService } from './logging.service';
import { UserData } from '../models/user-data';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private userDataSubject = new ReplaySubject<UserData[]>(1);
  public userData$ = this.userDataSubject.asObservable();
  private latestUserData: UserData[] = [];

  private readonly apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private logger: LoggingService
  ) {
    // Carregar dados armazenados
    const sessionData = sessionStorage.getItem('user-data');
    const localData = localStorage.getItem('user-data');
    const dataToLoad = sessionData || localData;
    if (dataToLoad) {
      const parsed = JSON.parse(dataToLoad);
      this.latestUserData = parsed;
      this.userDataSubject.next(parsed);
    } else {
      const token =
        sessionStorage.getItem('barbearia-token') ||
        localStorage.getItem('barbearia-token');
      if (token) {
        this.fetchUserData();
      }
    }
  }

  // Método para atualizar dados manualmente (usado pelo AuthService)
  setUserData(data: UserData[]): void {
    this.latestUserData = data;
    this.userDataSubject.next(data);
    this.saveUserData(data);
  }

  // Método para salvar no sessionStorage
  private saveUserData(data: UserData[]): void {
    sessionStorage.setItem('user-data', JSON.stringify(data));
  }

  // Método para carregar do sessionStorage (opcional)
  private loadData(): UserData[] {
    const data = sessionStorage.getItem('user-data');
    return data ? JSON.parse(data) : [];
  }

  fetchUserData(): void {
    this.http.get<UserData>(`${this.apiUrl}/auth/me`).subscribe({
      next: (data) => {
        const userArray = data ? [data] : [];
        this.latestUserData = userArray;
        this.userDataSubject.next(userArray);
        this.saveUserData(userArray);
      },
      error: (err) => {
        this.logger.error('Erro ao obter dados do usuário, retornando token:', err);
        this.userDataSubject.next([]);
      }
    });
  }

  // Novo método para obter os dados do usuário
  getUserData(): UserData[] {
    return this.latestUserData;
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ServerTimeResponse {
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class ServerTimeService {
  private readonly apiUrl = `${environment.apiUrl}/time`;

  constructor(private http: HttpClient) { }

  getServerTime(): Observable<ServerTimeResponse> {
    return this.http.get<ServerTimeResponse>(this.apiUrl);
  }
}

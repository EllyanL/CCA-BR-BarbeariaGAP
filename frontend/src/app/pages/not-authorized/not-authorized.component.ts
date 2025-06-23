import { Component } from '@angular/core';

@Component({
  selector: 'app-not-authorized',
  template: `
    <div class="error-container">
      <mat-card class="error-card mat-elevation-z8">
        <mat-card-header>
          <div class="error-number">
            403
          </div>
          <mat-card-title>Acesso não autorizado</mat-card-title>
        </mat-card-header>

        <mat-card-content>
          <p>Desculpe! Você não tem permissão para acessar esta página.</p>
          <p>Volte para <a class="text-page-inicial" routerLink="/">página inicial</a> ou contacte o suporte se achar que isso foi um erro. (61) 2023-1706</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .error-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background-size: cover;
    }

    .error-card {
      width: 500px;
      text-align: center;
      padding: 3rem;
    }

    .error-number {
      font-size: 8rem;
      color: #2a74c3;
      font-weight: bold;
      padding: 50px;
    }

    .text-page-inicial {
      font-weight: bold;
    }

    mat-card-header {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    mat-card-title {
      font-size: 1.6rem;
      color: #0063ba;
    }

    mat-card-content {
      font-size: 1rem;
    }

    a {
      color: #1e88e5;
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }
  `]
})
export class NotAuthorizedComponent {

}

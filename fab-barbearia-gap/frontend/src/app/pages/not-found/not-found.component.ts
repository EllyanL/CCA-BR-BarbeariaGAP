import { Component } from '@angular/core';

@Component({
  selector: 'app-not-found',
  template: `<div class="error-container">
  <mat-card class="error-card mat-elevation-z8">
    <mat-card-header>
      <div class="error-number">
        404
      </div>
      <mat-card-title>Página não encontrada</mat-card-title>
    </mat-card-header>

    <mat-card-content>
      <p>Ops! Parece que a página que você está procurando não existe.</p>
      <p>Volte para <a routerLink="/">página inicial</a></p>
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
      font-size: 4rem;
      color: #2a74c3;
      font-weight: bold;
      padding: 20px;
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
export class NotFoundComponent {

}

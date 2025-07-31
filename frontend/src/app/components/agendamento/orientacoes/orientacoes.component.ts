import { Component } from '@angular/core';

@Component({
  selector: 'app-orientacoes',
  template: `
  <mat-card class="orientacoes-card">
  <mat-card-header class="orientacoes-card__header">
    <div mat-card-avatar class="orientacoes-card__header-icon">
      <mat-icon>info</mat-icon>
    </div>
    <mat-card-title class="orientacoes-card__title"
      >ORIENTAÇÕES DO GAP-BR</mat-card-title
    >
  </mat-card-header>
  <mat-card-content class="orientacoes-card__content">
    <mat-list class="orientacoes-card__list">
      <mat-list-item class="orientacoes-card__list-item">
        <mat-icon matListIcon>event</mat-icon>
        Só é possível agendar para datas dentro da semana atual (Segunda à
        Sexta).
      </mat-list-item>
      <mat-list-item class="orientacoes-card__list-item">
        <mat-icon matListIcon>schedule</mat-icon>
        Os agendamentos estão disponíveis diariamente das 09:10 às 18:00.
      </mat-list-item>
      <mat-list-item class="orientacoes-card__list-item">
        <mat-icon matListIcon>repeat</mat-icon>
        Só é possível marcar uma vez a cada 15 dias.
      </mat-list-item>
      <mat-list-item class="orientacoes-card__list-item">
        <mat-icon matListIcon>access_time</mat-icon>
        A tolerância é de 10 minutos após o horário marcado.
      </mat-list-item>
      <mat-list-item class="orientacoes-card__list-item">
        <mat-icon matListIcon>assignment</mat-icon>
        O Atendimento será realizado conforme <b>marcação prévia</b>.
      </mat-list-item>
    </mat-list>
  </mat-card-content>
  <mat-dialog-actions align="end" class="orientacoes-card__actions">
    <button mat-button [mat-dialog-close]="true" color="primary">Ciente</button>
  </mat-dialog-actions>
</mat-card>
  `,
  styles: [`
    .orientacoes-card {
  max-width: 900px;
  padding: 24px;
  white-space: normal;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.orientacoes-card__header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.orientacoes-card__header .mat-card-avatar {
  margin-right: 0;
}

    @media (max-width: 600px) {
      .orientacoes-card { max-width: 95vw; }
    }

    .orientacoes-card__header-icon {
      background-color: #3f51b5;
      padding: 5px;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .orientacoes-card__title{
      margin-top: 0;
      color: var(--text-primary, #000);
      font-weight: 600;
      font-size: 1.25rem;
    }

    .orientacoes-card__list-item {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      margin-bottom: .5rem;
    }

    mat-list-item {
      white-space: normal !important;
      align-items: flex-start;
    }

    .mat-list-text {
      white-space: normal !important;
    }

    mat-icon {
      margin-right: 8px;
    }

    .orientacoes-card__list-item:last-child {
      margin-bottom: 0;
    }

    .orientacoes-card__list-item mat-icon {
      vertical-align: middle;
    }

    .orientacoes-card__header-icon mat-icon {
      color: white;
    }
  `]
})
export class OrientacoesComponent { }

import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { animate, state, style, transition, trigger } from '@angular/animations';

import { CapitalizePipe } from 'src/app/pipes/capitalize.pipe';
import { DialogoLogoutComponent } from '../../agendamento/dialogo-logout/dialogo-logout.component';
import { LoggingService } from 'src/app/services/logging.service';
import { MatDialog } from '@angular/material/dialog';
import { OrientacoesComponent } from '../../agendamento/orientacoes/orientacoes.component';
import { Subscription } from 'rxjs';
import { UserData } from 'src/app/models/userData';
import { UserService } from '../../../services/user.service';

// Certifique-se de importar o modelo



export const slide = trigger('slide', [
  state('void', style({ transform: 'translateY(-100%)', opacity: 0 })),
  state('*', style({ transform: 'translateY(0%)', opacity: 1 })),
  transition('void => *', [animate('500ms ease-in-out')]),
  transition('* => void', [animate('500ms ease-in-out')]),
]);

export const rotateToggle = trigger('rotateToggle', [
  state('expanded', style({ transform: 'rotate(180deg)' })),
  state('collapsed', style({ transform: 'rotate(0deg)' })),
  transition('collapsed <=> expanded', [animate('1000ms ease-in-out')]),
]);

@Component({
  selector: 'app-header',
  template: `
    <header class="header-container" [@slide]>
      <div class="left">
        <img src="assets/images/logo-gapbr.png" alt="Logo do GAP-BR" />
      </div>
      <div class="center">
        <img src="assets/images/Logo_Cabecalho_admin.png" alt="Logo da Barbearia" />
      </div>
      <div class="right">
        <mat-icon>home</mat-icon>
        <mat-icon>person</mat-icon>
        <span class="nome">{{ nomeHeader }}</span>
        <button
          mat-icon-button
          class="menu-toggle"
          [matMenuTriggerFor]="userMenu"
          (menuOpened)="menuOpen = true"
          (menuClosed)="menuOpen = false"
          aria-label="Menu do usuário"
          data-testid="menu-trigger"
        >
          <mat-icon [@rotateToggle]="menuOpen ? 'expanded' : 'collapsed'">
            expand_more
          </mat-icon>
        </button>
      </div>
      <mat-menu #userMenu="matMenu">
        <button mat-menu-item (click)="openRegras()">
          <mat-icon>assignment</mat-icon>
          <span>Regras</span>
        </button>
        <button mat-menu-item [routerLink]="'/meus-agendamentos'">
          <mat-icon>calendar_today</mat-icon>
          <span>Meus Agendamentos</span>
        </button>
        <button mat-menu-item (click)="logout()">
          <mat-icon>logout</mat-icon>
          <span>Sair</span>
        </button>
      </mat-menu>
    </header>
  `,
  animations: [slide, rotateToggle],
  styles: [`
    .header-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background-color: #070F5E;
      color: #ffffff;
      height: 06rem;
      padding: 0 1rem;
    }

    .left img {
      height: 5rem;
    }
    .center img {
      height: 3rem;
    }

    .center {
      flex: 1;
      display: flex;
      justify-content: center;
    }

    .right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .right mat-icon,
    .nome {
      color: #ffffff;
    }

    .menu-toggle {
      background: none;
      border: none;
      cursor: pointer;
      color: #ffffff;
    }

    mat-menu button.mat-menu-item mat-icon {
      margin-right: 0.5rem;
    }

  `]
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Input() titleHeader: string = '';
  nomeHeader: string = '';

  private userDataSubscription?: Subscription;

  menuOpen: boolean = false;

  constructor(
    private dialog: MatDialog,
    private userService: UserService,
    private logger: LoggingService
  ) {}

  ngOnInit(): void {
    this.setNomeHeader();
  }

  logout() {
    const dialogRef = this.dialog.open(DialogoLogoutComponent, { width: '300px' });
    dialogRef.afterClosed().subscribe(() => {});
  }

  openRegras() {
    this.dialog.open(OrientacoesComponent, { enterAnimationDuration: '500ms' });
  }

  setNomeHeader() {
    const capitalizePipe = new CapitalizePipe();
    this.userDataSubscription = this.userService.userData$.subscribe(
      (data: UserData[]) => {
        this.logger.log('Dados recebidos em setNomeHeader:', data);
        if (data && Array.isArray(data) && data.length > 0 && data[0]) {
          const postoGrad = data[0].postoGrad;
          const nomeDeGuerra = data[0].nomeDeGuerra;
          if (postoGrad && nomeDeGuerra) {
            const nome = `${postoGrad} ${capitalizePipe.transform(nomeDeGuerra)}`;
            this.nomeHeader = nome;
          } else {
            this.logger.warn('postoGrad ou nomeDeGuerra ausente em data[0]', data[0]);
            this.nomeHeader = 'Usuário Não Identificado';
          }
        } else {
          this.logger.warn('Dados inválidos ou vazios em setNomeHeader', data);
          this.nomeHeader = 'Usuário Não Identificado';
        }
      },
      (error) => {
        this.logger.error('Erro ao obter Posto/Graduação + Nome de Guerra:', error);
        this.nomeHeader = 'Usuário Não Identificado';
      }
    );
  }

  ngOnDestroy(): void {
    this.userDataSubscription?.unsubscribe();
  }
}

import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { DialogoLogoutComponent } from '../../agendamento/dialogo-logout/dialogo-logout.component';
import { MatDialog } from '@angular/material/dialog';
import { CapitalizePipe } from 'src/app/pipes/capitalize.pipe';
import { UserService } from '../../../services/user.service';
import { UserData } from 'src/app/models/userData';  // Certifique-se de importar o modelo
import { Subscription } from 'rxjs';
import { LoggingService } from 'src/app/services/logging.service';

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
    <mat-card-header *ngIf="!isCollapsed" class="header-card" [@slide]>
      <h2 class="header-card__welcome">
        Bem-vindo, <span class="header-card__nome">{{ nomeHeader }}</span>
      </h2>
      <mat-card-title class="header-card__title">
        BARBEARIA - {{ titleHeader }} - RAMAL {{ ramal }}
        <img
          src="assets/images/logo-gapbr.png"
          alt="Logo do GAP-BR"
          class="header-card__logo"
          width="50"
          height="55"
        />
         
        <button
          mat-mini-fab
          color="secondary"
          class="header-card__logout-button"
          (click)="logout()"
          title="Sair"
        >
          <img
            src="assets/images/logout.png"
            alt="Logout"
            class="header-card__logout-icon"
            width="30"
            height="30"
          />
        </button>
      </mat-card-title>
      <!-- Botão Toggle para expandir/recolher -->
      <button title="{{ isCollapsed ? 'Expandir Cabeçalho' : 'Encolher Cabeçalho' }}" class="button-toggle" (click)="toggleHeader()">
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFFFFF" [@rotateToggle]="isCollapsed ? 'collapsed' : 'expanded'">
          <path d="M480-528 296-344l-56-56 240-240 240 240-56 56-184-184Z"/>
        </svg>
      </button>
    </mat-card-header>
    <!-- Botão Toggle visível quando o cabeçalho está colapsado -->
    <div class="container-button-toggle" *ngIf="isCollapsed">
      <button class="button-toggle" title="Expandir Cabeçalho" (click)="toggleHeader()">
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFFFFF">
          <path d="M480-432 296-616l-56 56 240 240 240-240-56-56-184 184Z"/>
        </svg>
      </button>
    </div>
  `,
  animations: [slide, rotateToggle],
  styles: [`
    .header-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      background-color: #ffffff;
      color: #1976d2;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }

    .header-card__title {
      font-size: 1.8rem;
      text-align: center;
      color: #1976d2;
    }

    .header-card__welcome {
      margin: 0;
      color: #1976d2;
    }

    .header-card__nome {
      color: #1976d2;
    }

    .header-card__logout-button {
      background-color: #2196f3;
      color: #ffffff;
    }

    .header-card__logout-button:hover {
      background-color: #1976d2;
    }

    .button-toggle {
      background: none;
      border: none;
      padding: 0;
      margin: 0;
      outline: none;
      cursor: pointer;
    }

    .container-button-toggle {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
  `]
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Input() titleHeader: string = '';
  @Input() ramal: string = '';
  nomeHeader: string = '';

  private userDataSubscription?: Subscription;

  isCollapsed: boolean = false;

  constructor(
    private dialog: MatDialog,
    private userService: UserService,
    private logger: LoggingService
  ) {}

  ngOnInit(): void {
    this.setNomeHeader();
  }

  toggleHeader() {
    this.isCollapsed = !this.isCollapsed;
  }

  logout() {
    const dialogRef = this.dialog.open(DialogoLogoutComponent, { width: '300px' });
    dialogRef.afterClosed().subscribe(() => {});
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
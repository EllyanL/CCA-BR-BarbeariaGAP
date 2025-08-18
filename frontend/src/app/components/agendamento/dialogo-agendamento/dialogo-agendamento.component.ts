import { Component, Inject, OnInit, Input, OnDestroy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
  import { Militar } from 'src/app/models/militar';
  import { UserData } from 'src/app/models/userData';
  import { UserService } from 'src/app/services/user.service';
  import { AgendamentoService } from 'src/app/services/agendamento.service'; // Adicione o serviço
  import { Agendamento } from 'src/app/models/agendamento'; // Adicione a interface/modelo
import { LoggingService } from 'src/app/services/logging.service';
import { ErrorMessagesService } from 'src/app/services/error-messages.service';
import { Subscription } from 'rxjs';

    @Component({
      selector: 'app-dialogo-agendamento',
      template: `
    <h1 mat-dialog-title class="agendar-corte-dialog__title">Agendar Corte</h1>
    <div mat-dialog-content class="agendar-corte-dialog__content">
      <div *ngIf="errorMessage" class="error-message">{{ errorMessage }}</div>
      <div class="agendar-corte-dialog__date-time">
        <span class="agendar-corte-dialog__date">
        {{ data.data | date:'dd/MM/yyyy':'':'pt-BR' }}
        </span>
        <span class="agendar-corte-dialog__decorator"></span>
        <span class="agendar-corte-dialog__time"><b>Hora: {{ data.hora }}</b></span>
      </div>
      <!-- SARAM -->
      <mat-form-field class="agendar-corte-dialog__form-field">
        <mat-label>SARAM</mat-label>
        <input
          matInput
          [(ngModel)]="militar.saram"
          maxlength="9"
          (input)="validateNumericInput($event)"
          [disabled]="true"
        />
      </mat-form-field>
      <!-- Nome Completo -->
      <mat-form-field class="agendar-corte-dialog__form-field">
        <mat-label>Nome Completo</mat-label>
        <input
          matInput
          class="no-transform"
          [(ngModel)]="militar.nomeCompleto"
          maxlength="50"
          [disabled]="true"
        />
      </mat-form-field>
      <!-- POSTO/GRADUAÇÃO -->
      <mat-form-field class="agendar-corte-dialog__form-field no-overflow">
        <mat-label>Graduação / Posto</mat-label>
        <mat-select [(ngModel)]="militar.postoGrad" [disabled]="true">
          <mat-option *ngFor="let opcao of opcoesPostoGrad" [value]="opcao">
            {{ opcao }}
          </mat-option>
        </mat-select>
      </mat-form-field>
      <!-- NOME DE GUERRA -->
      <mat-form-field class="agendar-corte-dialog__form-field">
        <mat-label>Nome de Guerra</mat-label>
        <input
          matInput
          [(ngModel)]="militar.nomeDeGuerra"
          maxlength="25"
          [disabled]="true"
        />
      </mat-form-field>
      <!-- EMAIL -->
      <mat-form-field class="agendar-corte-dialog__form-field">
        <mat-label>Email</mat-label>
        <input
          matInput
          class="no-transform"
          [(ngModel)]="militar.email"
          maxlength="50"
          [disabled]="true"
        />
      </mat-form-field>
      <!-- OM -->
      <mat-form-field class="agendar-corte-dialog__form-field">
        <mat-label>Organização Militar (OM)</mat-label>
        <mat-select [(ngModel)]="militar.om" [disabled]="true">
          <mat-option *ngFor="let opcao of oms" [value]="opcao">
            {{ opcao }}
          </mat-option>
        </mat-select>
      </mat-form-field>
      <!-- SEÇÃO -->
      <mat-form-field class="agendar-corte-dialog__form-field">
        <mat-label>Seção</mat-label>
        <input
          matInput
          [(ngModel)]="militar.secao"
          maxlength="10"
          [disabled]="true"
        />
      </mat-form-field>
      <!-- RAMAL -->
      <mat-form-field class="agendar-corte-dialog__form-field">
        <mat-label>Ramal</mat-label>
        <input
          matInput
          [(ngModel)]="militar.ramal"
          maxlength="5"
          [disabled]="true"
        />
      </mat-form-field>
    </div>
    <!-- Garantir que mat-dialog-actions aparece apenas uma vez -->
    <div mat-dialog-actions class="agendar-corte-dialog__actions">
      <button mat-button (click)="onNoClick()" class="agendar-corte-dialog__button">
        CANCELAR
      </button>
      <button
        mat-button
        color="primary"
        (click)="onSaveClick()"
        class="agendar-corte-dialog__button"
      >
        AGENDAR
      </button>
    </div>
      `,
      styles: [`
        .agendar-corte-dialog__title {
          text-align: center;
          font-size: 1.75rem;
        }

        .agendar-corte-dialog__date-time {
          display: flex;
          align-items: center;
        }

        .agendar-corte-dialog__decorator {
          flex: 1;
          border-bottom: 1px dotted rgba(0, 0, 0, 0.3);
          margin: 0 8px;
        }

        .agendar-corte-dialog__actions {
          display: flex;
          justify-content: space-between;
        }

        .agendar-corte-dialog__form-field {
          width: 100%;
        }

        .agendar-corte-dialog__form-field input {
          text-transform: uppercase;
        }

        .no-transform {
          text-transform: none !important;
        }

        .no-overflow .mat-select-value-text {
          overflow: visible;
          white-space: normal;
        }

        .error-message {
          color: #f44336;
          font-weight: bold;
          margin-bottom: 10px;
          text-align: center;
        }
      `]
    })
    export class DialogoAgendamentoComponent implements OnInit, OnDestroy {
      @Input() opcoesPostoGrad?: string[] = [];

      userData: UserData[] = [];
      private userDataSubscription?: Subscription;
      militar: Militar = {
        saram: '',
        nomeCompleto: '',
        postoGrad: '',
        nomeDeGuerra: '',
        email: '',
        om: '',
        quadro: '',
        secao: '',
        ramal: '',
        cpf: '',
        categoria: ''
      };
      errorMessage: string = "";

      oms: string[] = ['CCA-BR', 'CDCAER', 'CIAER', 'COMGEP',
                      'COPAC','DIREF', 'DIRENS', 'EMAER',
                      'OABR','SEFA','CENCIAR','SECPROM',
                      'ASPAER', 'CECOMSAER', 'GABAER', 'COJAER'];

      constructor(
        public dialogRef: MatDialogRef<DialogoAgendamentoComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any,
        private userService: UserService,
        private agendamentoService: AgendamentoService,
        private logger: LoggingService,
        private snackBar: MatSnackBar,
        private errorMessages: ErrorMessagesService
      ) {}

      ngOnInit(): void {
        this.opcoesPostoGrad = this.data.opcoesPostoGrad;
        this.setUserData();
      }

      setUserData() {
        this.userDataSubscription = this.userService.userData$.subscribe(data => {
          this.logger.log('Dados recebidos do UserService:', data);
          this.userData = data;
          if (this.userData.length > 0) {
            const user = this.userData[0];
            this.militar.saram = user.saram || '';
            this.militar.nomeCompleto = this.formatarNome(user.nomeCompleto || '');
            this.militar.postoGrad = user.postoGrad || '';
            this.militar.nomeDeGuerra = user.nomeDeGuerra || '';
            this.militar.email = user.email || '';
            this.militar.om = user.om || '';
            this.militar.cpf = user.cpf || '';
            this.militar.secao = user.secao || '';
            this.militar.ramal = user.ramal || '';
            
            // 🚨 CORREÇÃO AQUI
            this.militar.categoria = (user.categoria && user.categoria.trim() !== '')
              ? user.categoria.toUpperCase()
              : this.data.categoria || 'GRADUADO';
          }
        });
      }
      

      onNoClick(): void {
        this.dialogRef.close();
      }

      onSaveClick(): void {
        const agendamentoData: Agendamento = {
          data: this.data.data,
          hora: this.data.hora,
          diaSemana: this.data.diaSemana,
          categoria: this.data.categoria
        };
        

        this.agendamentoService.createAgendamento(agendamentoData).subscribe(
          (response: Agendamento) => {
            this.logger.log('Agendamento criado:', response);
            this.errorMessage = "";
            this.militar = response.militar || this.militar;
            this.snackBar.open('Agendamento realizado', 'Ciente', { duration: 3000 });
            this.dialogRef.close({ sucesso: true, payload: response });
          },
          error => {
            this.logger.error('Erro ao criar agendamento:', error);

            const message = error?.error?.message || error?.error ||
              this.errorMessages.AGENDAMENTO_CREATE_ERROR;

            this.errorMessage = message;
            this.snackBar.open(message, 'OK', { duration: 5000 });
          }
        );
      }

      validateNumericInput(event: any): void {
        const input = event.target as HTMLInputElement;
        input.value = input.value.replace(/[^0-9]/g, '');
      }

      formatarNome(nome: string): string {
        return nome
          .toLowerCase()
          .split(' ')
          .map(p => p.charAt(0).toUpperCase() + p.slice(1))
          .join(' ');
      }

      ngOnDestroy(): void {
        this.userDataSubscription?.unsubscribe();
      }
    }

import { AuthService } from 'src/app/services/auth.service';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { LoggingService } from 'src/app/services/logging.service';
import { slide } from 'src/app/components/layout/header/header.component';

// Interface para a resposta do login
export interface LoginResponse {
  token: string;
  role: string;
  postoGrad?: string; // Adicionado para usar na lógica de redirecionamento
  om?: string; // Adicionado para validação de organização militar
}

@Component({
  selector: 'app-login',
  template: `
    <div class="login-logo">
      <img src="assets/images/gladio-3d-fab.png" alt="Gládio Alado" />
    </div>
    <div class="login-container" [@slide]>
      <div class="login-form">
        <h1><b>LOGIN ÚNICO</b></h1>
        <form (ngSubmit)="onLogin()">
          <mat-form-field appearance="fill">
            <mat-label>CPF</mat-label>
            <input matInput type="text" id="cpf" name="cpf" [(ngModel)]="cpf" required maxlength="11" pattern="[0-9]*" />
          </mat-form-field>
          <mat-form-field appearance="fill">
            <mat-label>Senha</mat-label>
            <input matInput [(ngModel)]="senha" [type]="isPasswordVisible ? 'text' : 'password'" id="senha" name="senha" required />
            <div mat-icon-button matSuffix (click)="togglePasswordVisibility()" [attr.aria-label]="isPasswordVisible ? 'Ocultar senha' : 'Mostrar senha'" style="padding: 10; min-width: 0; height: 30px;">
              <mat-icon>{{ isPasswordVisible ? 'visibility' : 'visibility_off' }}</mat-icon>
            </div>
          </mat-form-field>
          <mat-checkbox [(ngModel)]="rememberMe" name="rememberMe" color="primary">Lembrar acesso</mat-checkbox>
          <button mat-raised-button class="mb-2" type="submit" color="primary">ENTRAR</button>

          <div class="loading-spinner" *ngIf="isLoading">
            <mat-spinner [diameter]="100" [strokeWidth]="15" color="primary"></mat-spinner>
          </div>

          <div *ngIf="errorMessage" class="alert alert-danger" role="alert">
            {{ errorMessage }}
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-logo {
      display: flex;
      justify-content: center;
      align-items: center;
      margin-bottom: 50px;
    }

    .login-logo img {
      width: 300px;
    }

    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      background-size: cover;
    }

    .login-form {
      width: 400px;
      text-align: center;
      background: rgba(255, 255, 255, 0.8);
      padding: 2em;
      border-radius: 5px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }

    mat-form-field {
      width: 100%;
      margin-bottom: 1em;
    }

    mat-icon {
      font-size: 1.2rem;
      margin-top: 5px;
      padding-right: 5px;
    }

    button {
      width: 100%;
      margin-top: 1em;
    }

    a {
      text-decoration: none;
    }

    small {
      display: block;
      margin-top: 1em;
      color: #666;
    }

    h1,
    h2 {
      color: #3f51b5;
    }

    .loading-spinner {
      display: flex;
      justify-content: center;
      align-items: center;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      /* background: rgba(255, 255, 255, 0.8); */
      z-index: 1000;
    }
  `],
  animations: [slide]
})
export class LoginComponent {
  cpf: string = '';
  senha: string = '';
  errorMessage: string = '';
  rememberMe: boolean = false;
  isPasswordVisible: boolean = false;
  isLoading: boolean = false;

  // Listas para validação de postoGrad e om
  private postos: string[] = ['AP', '2T', '1T', 'CP', 'MJ', 'TC', 'CL', 'BG', 'MB', 'TB'];
  private omsMinisterio: string[] = ['CCA-BR', 'GAP-BR', 'GAP-DF', 'CDCAER', 'CIAER', 'COMGEP', 'COPAC', 'DIREF', 'DIRENS', 'EMAER', 'OABR', 'SEFA', 'CENCIAR', 'SECPROM', 'ASPAER', 'CECOMSAER', 'GABAER', 'COJAER', 'MD'];

  constructor(
    private authService: AuthService,
    private router: Router,
    private logger: LoggingService
  ) {}

  onLogin(): void {
    if (!this.cpf || !this.senha) {
      this.errorMessage = 'Por favor, preencha CPF e Senha.';
      return;
    }
  
    this.isLoading = true;
  
    this.authService.login(this.cpf, this.senha, this.rememberMe).subscribe({
      next: (response: LoginResponse) => {
        this.isLoading = false;

        // Correção aqui: usando `response.token`
        if (response.token) {
          this.redirectUser(response);
        } else {
          this.errorMessage = 'Erro de autenticação. Tente novamente.';
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.message || 'Erro ao tentar fazer login.';
        this.logger.error('Erro ao tentar fazer login:', err);
      }
    });
  }

  private redirectUser(response: LoginResponse): void {
    const usuario = this.authService.getUsuarioAutenticado();
    const role = response.role?.toUpperCase() || '';
    const postoGrad = response.postoGrad || ''; // Usado para determinar a rota, se necessário
    const om = response.om || ''; // Para validação de organização militar

    // Validação da Organização Militar
    if (!this.isAuthorizedOM(om)) {
      this.denyAccess();
      return;
    }

    let redirectUrl = '/not-authorized';
    if (role === 'ADMIN') {
      redirectUrl = '/admin';
    } else {
      // Se role não for ADMIN, usar postoGrad para determinar a rota
      redirectUrl = this.determineRoute(postoGrad);
    }

    this.logger.log('Redirecionando para:', redirectUrl);
    this.router.navigate([redirectUrl]);
  }

  private determineRoute(postoGrad: string): string {
    if (this.postos.includes(postoGrad)) {
      return '/oficiais';
    } else {
      return '/graduados';
    }
  }

  private isAuthorizedOM(om: string): boolean {
    return this.omsMinisterio.includes(om.toUpperCase().trim());
  }

  private denyAccess(): void {
    this.errorMessage = 'Acesso negado. Sua Organização Militar não está autorizada a realizar login no sistema.';
    this.authService.logout();
  }

  togglePasswordVisibility(): void {
    this.isPasswordVisible = !this.isPasswordVisible;
  }
}
import { AuthService } from 'src/app/services/auth.service';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { LoggingService } from 'src/app/services/logging.service';
import { ErrorMessagesService } from 'src/app/services/error-messages.service';
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
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
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
    private logger: LoggingService,
    private errorMessages: ErrorMessagesService
  ) {}

  onLogin(): void {
    if (!this.cpf || !this.senha) {
      this.errorMessage = this.errorMessages.LOGIN_EMPTY_FIELDS;
      return;
    }
  
    const sanitizedCpf = this.cpf.replace(/\D/g, '');

    this.isLoading = true;

    this.authService.login(sanitizedCpf, this.senha, this.rememberMe).subscribe({
      next: (response: LoginResponse) => {
        this.isLoading = false;

        // Correção aqui: usando `response.token`
        if (response.token) {
          this.redirectUser(response);
        } else {
          this.errorMessage = this.errorMessages.LOGIN_AUTH_ERROR;
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.message || this.errorMessages.LOGIN_ATTEMPT_ERROR;
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
    this.errorMessage = this.errorMessages.ACCESS_DENIED_OM;
    this.authService.logout();
  }

  togglePasswordVisibility(): void {
    this.isPasswordVisible = !this.isPasswordVisible;
  }
}
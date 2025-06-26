import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { LoginComponent } from './login.component';
import { CpfMaskDirective } from '../../directives/cpf-mask.directive';
import { AuthService } from '../../services/auth.service';
import { LoggingService } from '../../services/logging.service';
import { ErrorMessagesService } from '../../services/error-messages.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let logger: jasmine.SpyObj<LoggingService>;
  let errorMessages: ErrorMessagesService;

  beforeEach(() => {
    authService = jasmine.createSpyObj('AuthService', ['login']);
    router = jasmine.createSpyObj('Router', ['navigate']);
    logger = jasmine.createSpyObj('LoggingService', ['log', 'error']);
    errorMessages = new ErrorMessagesService();

    TestBed.configureTestingModule({
      declarations: [LoginComponent, CpfMaskDirective],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
        { provide: LoggingService, useValue: logger },
        { provide: ErrorMessagesService, useValue: errorMessages }
      ]
    });
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('sanitizes CPF and calls login on valid input', () => {
    authService.login.and.returnValue(of({ token: 't', role: 'GRADUADO' }));
    component.cpf = '123.456.789-10';
    component.senha = 'senha';

    component.onLogin();

    expect(authService.login).toHaveBeenCalledWith('12345678910', 'senha', false);
  });

  it('shows error when fields are empty', () => {
    component.cpf = '';
    component.senha = '';

    component.onLogin();

    expect(authService.login).not.toHaveBeenCalled();
    expect(component.errorMessage).toBe(errorMessages.LOGIN_EMPTY_FIELDS);
  });

  it('toggles password visibility', () => {
    expect(component.isPasswordVisible).toBeFalse();
    component.togglePasswordVisibility();
    expect(component.isPasswordVisible).toBeTrue();
    component.togglePasswordVisibility();
    expect(component.isPasswordVisible).toBeFalse();
  });

  it('redirects OFICIAL users to /oficiais', () => {
    authService.login.and.returnValue(of({ token: 't', role: 'OFICIAL', om: 'CCA-BR' }));
    component.cpf = '1';
    component.senha = 's';

    component.onLogin();

    expect(router.navigate).toHaveBeenCalledWith(['/oficiais']);
  });

  it('redirects GRADUADO users to /graduados', () => {
    authService.login.and.returnValue(of({ token: 't', role: 'GRADUADO', om: 'CCA-BR' }));
    component.cpf = '2';
    component.senha = 's';

    component.onLogin();

    expect(router.navigate).toHaveBeenCalledWith(['/graduados']);
  });

  it('redirects ADMIN users to /dashboard', () => {
    authService.login.and.returnValue(of({ token: 't', role: 'ADMIN', om: 'CCA-BR' }));
    component.cpf = '3';
    component.senha = 's';

    component.onLogin();

    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });
});

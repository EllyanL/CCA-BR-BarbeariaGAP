import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ErrorMessagesService {
  readonly LOGIN_EMPTY_FIELDS = 'Por favor, preencha CPF e Senha.';
  readonly LOGIN_AUTH_ERROR = 'Erro de autenticação. Tente novamente.';
  readonly LOGIN_ATTEMPT_ERROR = 'Erro ao tentar fazer login.';
  readonly ACCESS_DENIED_OM = 'Acesso negado. Sua Organização Militar não está autorizada a realizar login no sistema.';
  readonly AGENDAMENTO_CREATE_ERROR = 'Erro ao criar agendamento.';
  readonly AGENDAMENTO_INTERVAL_ERROR = 'Você só pode agendar um novo corte após 15 dias do último agendamento.';
}

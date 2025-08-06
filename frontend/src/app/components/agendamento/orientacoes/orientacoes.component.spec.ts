import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrientacoesComponent } from './orientacoes.component';
import { ConfiguracoesAgendamentoService } from 'src/app/services/configuracoes-agendamento.service';
import { of } from 'rxjs';

describe('OrientacoesComponent', () => {
  let component: OrientacoesComponent;
  let fixture: ComponentFixture<OrientacoesComponent>;
  let configService: jasmine.SpyObj<ConfiguracoesAgendamentoService>;

  beforeEach(() => {
    configService = jasmine.createSpyObj('ConfiguracoesAgendamentoService', ['getConfig']);
    configService.getConfig.and.returnValue(of({horarioInicio: '09:00', horarioFim: '18:00'}));

    TestBed.configureTestingModule({
      declarations: [OrientacoesComponent],
      providers: [
        { provide: ConfiguracoesAgendamentoService, useValue: configService }
      ]
    });
    fixture = TestBed.createComponent(OrientacoesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('exibe horários configurados', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('das 09:00 às 18:00');
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';

import { OrientacoesComponent } from './orientacoes.component';
import { ConfiguracoesAgendamentoService } from 'src/app/services/configuracoes-agendamento.service';
import { of } from 'rxjs';

describe('OrientacoesComponent', () => {
  let component: OrientacoesComponent;
  let fixture: ComponentFixture<OrientacoesComponent>;
  let configService: jasmine.SpyObj<ConfiguracoesAgendamentoService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<OrientacoesComponent>>;

  beforeEach(() => {
    configService = jasmine.createSpyObj('ConfiguracoesAgendamentoService', ['getConfig']);
    configService.getConfig.and.returnValue(of({ horarioInicio: '09:00', horarioFim: '18:00' }));

    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    TestBed.configureTestingModule({
      declarations: [OrientacoesComponent],
      imports: [
        MatDialogModule,
        MatCardModule,
        MatIconModule,
        MatListModule,
        MatButtonModule,
        MatCheckboxModule,
        FormsModule,
      ],
      providers: [
        { provide: ConfiguracoesAgendamentoService, useValue: configService },
        { provide: MatDialogRef, useValue: dialogRefSpy }
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

  it('salva preferencia quando marcado', () => {
    spyOn(localStorage, 'setItem');
    component.naoMostrarNovamente = true;
    component.onCiente();
    expect(localStorage.setItem).toHaveBeenCalledWith('orientacoesOcultas', 'true');
    expect(dialogRefSpy.close).toHaveBeenCalled();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';

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
      imports: [MatDialogModule, MatCardModule, MatIconModule, MatListModule, MatButtonModule],
      providers: [
        { provide: ConfiguracoesAgendamentoService, useValue: configService },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: { destino: '/graduado' } }
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

  it('emite destino ao agendar', () => {
    spyOn(component.navigate, 'emit');
    component.onAgendar();
    expect(component.navigate.emit).toHaveBeenCalledWith('/graduado');
    expect(dialogRefSpy.close).toHaveBeenCalled();
  });
});

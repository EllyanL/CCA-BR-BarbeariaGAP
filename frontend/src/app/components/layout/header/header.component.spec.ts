import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReplaySubject, of } from 'rxjs';

import { HeaderComponent } from './header.component';
import { LoggingService } from '../../../services/logging.service';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { UserService } from '../../../services/user.service';
import { RouterTestingModule } from '@angular/router/testing';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let userSubject: ReplaySubject<any>;

  beforeEach(() => {
    userSubject = new ReplaySubject(1);
    const userServiceStub = { userData$: userSubject.asObservable() } as Partial<UserService>;
    TestBed.configureTestingModule({
      declarations: [HeaderComponent],
      imports: [MatIconModule, MatMenuModule, RouterTestingModule],
      providers: [
        { provide: UserService, useValue: userServiceStub },
        { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of() }) } },
        { provide: LoggingService, useValue: { log: () => {}, warn: () => {}, error: () => {} } }
      ]
    });
    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    userSubject.next([{ postoGrad: 'SGT', nomeDeGuerra: 'Teste' }]);
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });
  it('renders icons and user name', () => {
    userSubject.next([{ postoGrad: 'SGT', nomeDeGuerra: 'Teste' }]);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const icons = compiled.querySelectorAll('mat-icon');
    expect(icons.length).toBeGreaterThan(2);
    expect(compiled.querySelector('.nome')?.textContent).toContain('SGT');
  });

  it('contains user menu trigger', () => {
    userSubject.next([{ postoGrad: 'SGT', nomeDeGuerra: 'Teste' }]);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const trigger = compiled.querySelector('[data-testid="menu-trigger"]');
    expect(trigger).toBeTruthy();
  });
});

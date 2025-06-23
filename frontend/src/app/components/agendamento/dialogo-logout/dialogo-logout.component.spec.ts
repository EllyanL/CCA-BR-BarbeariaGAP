import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogoLogoutComponent } from './dialogo-logout.component';

describe('DialogoLogoutComponent', () => {
  let component: DialogoLogoutComponent;
  let fixture: ComponentFixture<DialogoLogoutComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DialogoLogoutComponent]
    });
    fixture = TestBed.createComponent(DialogoLogoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

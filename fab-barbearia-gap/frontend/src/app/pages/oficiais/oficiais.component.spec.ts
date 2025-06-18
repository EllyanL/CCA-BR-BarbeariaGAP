import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OficiaisComponent } from './oficiais.component';

describe('OficiaisComponent', () => {
  let component: OficiaisComponent;
  let fixture: ComponentFixture<OficiaisComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [OficiaisComponent]
    });
    fixture = TestBed.createComponent(OficiaisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrientacoesComponent } from './orientacoes.component';

describe('OrientacoesComponent', () => {
  let component: OrientacoesComponent;
  let fixture: ComponentFixture<OrientacoesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [OrientacoesComponent]
    });
    fixture = TestBed.createComponent(OrientacoesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

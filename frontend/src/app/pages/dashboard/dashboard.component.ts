import { Component } from '@angular/core';

interface PeriodicElement {
  position: number;
  name: string;
  weight: number;
  symbol: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  displayedColumns: string[] = ['position', 'name', 'weight', 'symbol'];
  dataSource: PeriodicElement[] = [
    {position: 1, name: 'Hidrogênio', weight: 1.0079, symbol: 'H'},
    {position: 2, name: 'Hélio', weight: 4.0026, symbol: 'He'},
    {position: 3, name: 'Lítio', weight: 6.941, symbol: 'Li'},
    {position: 4, name: 'Berílio', weight: 9.0122, symbol: 'Be'},
  ];

  cards = [
    { title: 'Serviços Hoje', content: '3 agendamentos', badge: 'novo' },
    { title: 'Total Usuários', content: '150', badge: '99+' }
  ];
}

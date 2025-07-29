import { Component, OnInit, ViewChild } from '@angular/core';
import { MilitarService } from '../../services/militar.service';
import { Militar } from '../../models/militar';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { LoggingService } from '../../services/logging.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-usuarios',
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.css']
})
export class UsuariosComponent implements OnInit {
  displayedColumns: string[] = [
    'id',
    'nomeDeGuerra',
    'nomeCompleto',
    'email',
    'secao',
    'ramal',
    'categoria'
  ];
  dataSource = new MatTableDataSource<Militar>([]);
  filterValue = '';
  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort) sort?: MatSort;

  constructor(
    private militarService: MilitarService,
    private logger: LoggingService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.militarService.getMilitares().subscribe({
      next: militares => {
        this.dataSource.data = militares;
        this.dataSource.filterPredicate = (m: Militar, filter: string): boolean => {
          const f = filter.trim().toLowerCase();
          return (
            (m.nomeDeGuerra || '').toLowerCase().includes(f) ||
            (m.nomeCompleto || '').toLowerCase().includes(f) ||
            (m.email || '').toLowerCase().includes(f) ||
            (m.secao || '').toLowerCase().includes(f) ||
            (m.ramal || '').toLowerCase().includes(f) ||
            (m.categoria || '').toLowerCase().includes(f)
          );
        };
        if (this.paginator) {
          this.dataSource.paginator = this.paginator;
        }
        if (this.sort) {
          this.dataSource.sort = this.sort;
        }
      },
      error: err => this.logger.error('Erro ao buscar militares:', err)
    });
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.filterValue = filterValue.trim().toLowerCase();
    this.dataSource.filter = this.filterValue;
    if (this.paginator) {
      this.paginator.firstPage();
    }
  }

  logout(): void {
    this.authService.logout();
  }
}

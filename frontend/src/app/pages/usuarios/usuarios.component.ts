import { Component, OnInit, ViewChild } from '@angular/core';
import { MilitarService } from '../../services/militar.service';
import { Militar } from '../../models/militar';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { LoggingService } from '../../services/logging.service';

@Component({
  selector: 'app-usuarios',
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.css']
})
export class UsuariosComponent implements OnInit {
  displayedColumns: string[] = ['id', 'nomeCompleto', 'postoGrad', 'categoria', 'email'];
  dataSource = new MatTableDataSource<Militar>([]);
  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort) sort?: MatSort;

  constructor(private militarService: MilitarService, private logger: LoggingService) {}

  ngOnInit(): void {
    this.militarService.getMilitares().subscribe({
      next: militares => {
        this.dataSource.data = militares;
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
}

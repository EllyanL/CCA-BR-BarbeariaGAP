package intraer.ccabr.barbearia_api.models;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import intraer.ccabr.barbearia_api.enums.HorarioStatus;


@Entity
@Table(
    name = "horarios",
    indexes = {
        @Index(name = "idx_dia_horario_categoria", columnList = "dia, horario, categoria")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Horario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 15)
    private String dia;

    @Column(nullable = false, length = 10)
    private String horario;

    @Column(nullable = false, length = 15)
    private String categoria;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private HorarioStatus status = HorarioStatus.DISPONIVEL;


    public Horario(String dia, String horario, String categoria, HorarioStatus status) {
        this.dia = dia;
        this.horario = horario;
        this.categoria = categoria;
        this.status = status;
    }
}

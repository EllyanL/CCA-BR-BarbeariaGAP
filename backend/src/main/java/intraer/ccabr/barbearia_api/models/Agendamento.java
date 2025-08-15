package intraer.ccabr.barbearia_api.models;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;

@Entity(name = "Agendamento")
@Table(
    name = "agendamentos",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_agendamento_slot",
            columnNames = {"data", "hora", "dia_semana", "categoria"}
        )
    },
    indexes = {
        @Index(name = "idx_data_hora_dia_categoria", columnList = "data, hora, dia_semana, categoria"),
        @Index(name = "idx_militar", columnList = "militar_id")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
@Builder
@JsonIgnoreProperties(ignoreUnknown = true) 
public class Agendamento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate data;

    @Column(nullable = false)
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "HH:mm")
    private LocalTime hora;

    @Column(name = "dia_semana", nullable = false, length = 15)
    private String diaSemana;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "militar_id", nullable = false, referencedColumnName = "id", foreignKey = @ForeignKey(name = "fk_militar_id"))
    private Militar militar;

    @Column(length = 15, nullable = false)
    private String categoria;

    @Column(length = 20, nullable = false)
    private String status = "AGENDADO";

    @Column(name = "cancelado_por", length = 20)
    private String canceladoPor;

    @Override
    public String toString() {
        return "Agendamento{" +
                "id=" + id +
                ", data=" + data +
                ", hora=" + hora +
                ", diaSemana='" + diaSemana + '\'' +
                ", militar=" + (militar != null ? militar.toString() : "null") +
                ", categoria='" + categoria + '\'' +
                ", status='" + status + '\'' +
                ", canceladoPor='" + canceladoPor + '\'' +
                '}';
    }
}

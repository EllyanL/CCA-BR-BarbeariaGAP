package intraer.ccabr.barbearia_api.models;

import intraer.ccabr.barbearia_api.enums.JustificativaStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "justificativas_ausencia",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_justificativa_agendamento", columnNames = "agendamento_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class JustificativaAusencia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "agendamento_id", nullable = false, foreignKey = @ForeignKey(name = "fk_justificativa_agendamento"))
    private Agendamento agendamento;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "militar_id", nullable = false, foreignKey = @ForeignKey(name = "fk_justificativa_militar"))
    private Militar militar;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private JustificativaStatus status;

    @Column(length = 250, nullable = false)
    private String justificativa;

    @Column(name = "data_solicitacao", nullable = false)
    private LocalDateTime dataSolicitacao;

    @Column(name = "data_resposta")
    private LocalDateTime dataResposta;

    @Column(name = "avaliado_por_posto_grad", length = 20)
    private String avaliadoPorPostoGrad;

    @Column(name = "avaliado_por_nome_guerra", length = 40)
    private String avaliadoPorNomeGuerra;
}

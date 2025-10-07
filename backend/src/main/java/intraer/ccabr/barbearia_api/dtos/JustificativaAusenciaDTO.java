package intraer.ccabr.barbearia_api.dtos;

import intraer.ccabr.barbearia_api.models.JustificativaAusencia;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class JustificativaAusenciaDTO {
    private Long id;
    private String status;
    private String justificativa;
    private LocalDateTime dataSolicitacao;
    private LocalDateTime dataResposta;
    private String avaliadoPorPostoGrad;
    private String avaliadoPorNomeDeGuerra;

    public JustificativaAusenciaDTO(JustificativaAusencia justificativa) {
        this.id = justificativa.getId();
        this.status = justificativa.getStatus().name();
        this.justificativa = justificativa.getJustificativa();
        this.dataSolicitacao = justificativa.getDataSolicitacao();
        this.dataResposta = justificativa.getDataResposta();
        this.avaliadoPorPostoGrad = justificativa.getAvaliadoPorPostoGrad();
        this.avaliadoPorNomeDeGuerra = justificativa.getAvaliadoPorNomeGuerra();
    }
}

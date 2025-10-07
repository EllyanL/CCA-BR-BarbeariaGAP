package intraer.ccabr.barbearia_api.dtos;

import intraer.ccabr.barbearia_api.models.JustificativaAusencia;
import intraer.ccabr.barbearia_api.util.HoraUtil;
import lombok.Data;

import java.time.format.DateTimeFormatter;

@Data
public class JustificativaAusenciaAdminDTO {
    private Long id;
    private Long agendamentoId;
    private String postoGradMilitar;
    private String nomeDeGuerraMilitar;
    private String diaSemana;
    private String data;
    private String hora;
    private String status;
    private String justificativa;
    private String avaliadoPorPostoGrad;
    private String avaliadoPorNomeDeGuerra;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public JustificativaAusenciaAdminDTO(JustificativaAusencia justificativa) {
        this.id = justificativa.getId();
        this.agendamentoId = justificativa.getAgendamento().getId();
        this.postoGradMilitar = justificativa.getMilitar().getPostoGrad();
        this.nomeDeGuerraMilitar = justificativa.getMilitar().getNomeDeGuerra();
        this.diaSemana = justificativa.getAgendamento().getDiaSemana();
        this.data = justificativa.getAgendamento().getData().format(DATE_FMT);
        this.hora = HoraUtil.format(justificativa.getAgendamento().getHora());
        this.status = justificativa.getStatus().name();
        this.justificativa = justificativa.getJustificativa();
        this.avaliadoPorPostoGrad = justificativa.getAvaliadoPorPostoGrad();
        this.avaliadoPorNomeDeGuerra = justificativa.getAvaliadoPorNomeGuerra();
    }
}

package intraer.ccabr.barbearia_api.dtos;

import intraer.ccabr.barbearia_api.models.Agendamento;
import intraer.ccabr.barbearia_api.models.Militar;
import java.time.LocalDate;
import java.time.LocalTime;
import lombok.Data;

@Data
public class AgendamentoResumoDTO {
    private LocalDate dia;
    private LocalTime hora;
    private String categoria;
    private MilitarResumo militar;

    public AgendamentoResumoDTO(Agendamento agendamento) {
        this.dia = agendamento.getData();
        this.hora = agendamento.getHora();
        this.categoria = agendamento.getCategoria();
        Militar militarEntity = agendamento.getMilitar();
        if (militarEntity != null) {
            this.militar = new MilitarResumo(militarEntity.getPostoGrad(), militarEntity.getNomeDeGuerra());
        }
    }

    @Data
    public static class MilitarResumo {
        private final String postoGrad;
        private final String nomeDeGuerra;
    }
}

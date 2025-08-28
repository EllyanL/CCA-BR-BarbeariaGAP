package intraer.ccabr.barbearia_api.dtos;

import java.time.LocalTime;

import com.fasterxml.jackson.annotation.JsonFormat;

import intraer.ccabr.barbearia_api.models.ConfiguracaoAgendamento;
import lombok.Data;

@Data
public class ConfiguracaoAgendamentoResponse {
    private Long id;

    @JsonFormat(pattern = "HH:mm")
    private LocalTime horarioInicio;

    @JsonFormat(pattern = "HH:mm")
    private LocalTime horarioFim;

    public ConfiguracaoAgendamentoResponse(ConfiguracaoAgendamento configuracao) {
        this.id = configuracao.getId();
        this.horarioInicio = configuracao.getHorarioInicio();
        this.horarioFim = configuracao.getHorarioFim();
    }
}


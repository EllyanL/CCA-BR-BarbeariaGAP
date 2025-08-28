package intraer.ccabr.barbearia_api.dtos;

import java.time.LocalTime;

import com.fasterxml.jackson.annotation.JsonFormat;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ConfiguracaoAgendamentoRequest {

    @NotNull
    @JsonFormat(pattern = "HH:mm")
    private LocalTime horarioInicio;

    @NotNull
    @JsonFormat(pattern = "HH:mm")
    private LocalTime horarioFim;
}


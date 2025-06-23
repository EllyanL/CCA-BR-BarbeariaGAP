package intraer.ccabr.barbearia_api.dtos;

import java.time.LocalDate;
import java.time.LocalTime;

import com.fasterxml.jackson.annotation.JsonFormat;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AgendamentoCreateDTO {
    @NotNull
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate data;

    @NotNull
    @JsonFormat(pattern = "HH:mm")
    private LocalTime hora;

    @NotNull
    private String diaSemana;

    @NotNull
    private String categoria;
}

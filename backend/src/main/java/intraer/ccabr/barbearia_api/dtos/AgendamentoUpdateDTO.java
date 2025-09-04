package intraer.ccabr.barbearia_api.dtos;

import java.time.LocalDate;
import java.time.LocalTime;

import com.fasterxml.jackson.annotation.JsonFormat;

import lombok.Data;

@Data
public class AgendamentoUpdateDTO {
    @JsonFormat(pattern = "dd/MM/yyyy")
    private LocalDate data;
    private LocalTime hora;
    private String diaSemana;
}

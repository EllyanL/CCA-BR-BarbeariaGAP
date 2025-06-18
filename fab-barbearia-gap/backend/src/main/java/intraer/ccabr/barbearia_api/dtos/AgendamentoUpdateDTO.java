package intraer.ccabr.barbearia_api.dtos;

import java.time.LocalDate;
import java.time.LocalTime;

import lombok.Data;

@Data
public class AgendamentoUpdateDTO {
    private LocalDate data;
    private LocalTime hora;
    private String diaSemana;
}

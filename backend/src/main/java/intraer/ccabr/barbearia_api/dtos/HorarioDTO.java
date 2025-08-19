package intraer.ccabr.barbearia_api.dtos;

import intraer.ccabr.barbearia_api.models.Horario;
import lombok.Getter;
import lombok.Setter;
import java.time.format.DateTimeFormatter;

@Setter
@Getter
public class HorarioDTO {
    private Long id;
    private String dia;
    private String horario;
    private String categoria;
    private String status;
    private Long usuarioId;

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");
    
    public HorarioDTO() {
        // Construtor vazio obrigatório para Jackson desserializar o JSON
    }
    
    public HorarioDTO(Horario horario) {
        this.id = horario.getId();
        this.dia = horario.getDia();
        this.horario = horario.getHorario().format(TIME_FORMATTER);
        this.categoria = horario.getCategoria();
        this.status = horario.getStatus().name();
        this.usuarioId = null;
    }
}

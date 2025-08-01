package intraer.ccabr.barbearia_api.dtos;

import intraer.ccabr.barbearia_api.models.Agendamento;
import intraer.ccabr.barbearia_api.models.Militar;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Data
public class AgendamentoDTO {
    private Long id;
    private LocalDate data;
    private LocalTime hora;
    private String diaSemana;
    private String categoria;
    private String status;
    private String canceladoPor;
    private UserDTO militar;
    private String usuarioSaram;
    private Long timestamp;

    public AgendamentoDTO(Agendamento agendamento) {
        this.id = agendamento.getId();
        this.data = agendamento.getData();
        this.hora = agendamento.getHora();
        this.diaSemana = agendamento.getDiaSemana();
        this.categoria = agendamento.getCategoria();
        this.status = agendamento.getStatus();
        this.canceladoPor = agendamento.getCanceladoPor();
        this.timestamp = LocalDateTime.of(agendamento.getData(), agendamento.getHora())
                .atZone(ZoneId.of("America/Sao_Paulo"))
                .toInstant()
                .toEpochMilli();

        // Conversão explícita do Militar para UserDTO
        Militar m = agendamento.getMilitar();
        if (m != null) {
            this.militar = new UserDTO(
                m.getId(),
                m.getSaram(),
                m.getNomeCompleto(),
                m.getPostoGrad(),
                m.getNomeDeGuerra(),
                m.getEmail(),
                m.getOm(),
                m.getCpf()
            );
            this.militar.setCategoria(m.getCategoria().name());
            this.militar.setQuadro(m.getQuadro());
            this.militar.setSecao(m.getSecao());
            this.militar.setRamal(m.getRamal());
            this.usuarioSaram = m.getSaram();
        }
    }
}

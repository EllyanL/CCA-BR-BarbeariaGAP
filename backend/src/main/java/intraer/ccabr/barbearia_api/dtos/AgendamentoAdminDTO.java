package intraer.ccabr.barbearia_api.dtos;

import intraer.ccabr.barbearia_api.models.Agendamento;
import intraer.ccabr.barbearia_api.models.Militar;
import lombok.Data;

import java.time.format.DateTimeFormatter;
import intraer.ccabr.barbearia_api.util.HoraUtil;

@Data
public class AgendamentoAdminDTO {
    private Long id;
    private String data;
    private String hora;
    private String diaSemana;
    private String categoria;
    private String status;
    private String canceladoPor;
    private UserDTO militar;
    private String usuarioSaram;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public AgendamentoAdminDTO(Agendamento agendamento) {
        this.id = agendamento.getId();
        this.data = agendamento.getData().format(DATE_FMT);
        this.hora = HoraUtil.format(agendamento.getHora());
        this.diaSemana = agendamento.getDiaSemana();
        this.categoria = agendamento.getCategoria();
        this.status = agendamento.getStatus();
        this.canceladoPor = agendamento.getCanceladoPor();

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

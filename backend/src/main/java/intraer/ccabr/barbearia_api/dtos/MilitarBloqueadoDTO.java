package intraer.ccabr.barbearia_api.dtos;

import com.fasterxml.jackson.annotation.JsonFormat;
import intraer.ccabr.barbearia_api.models.Militar;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import lombok.Data;

@Data
public class MilitarBloqueadoDTO {
    private Long militarId;
    private String saram;
    private String nomeCompleto;
    private String nomeDeGuerra;
    private String postoGrad;
    private String categoria;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate ultimaData;

    private long diasRestantes;

    public MilitarBloqueadoDTO(Militar militar, LocalDate ultimaData, LocalDate referencia) {
        this.militarId = militar.getId();
        this.saram = militar.getSaram();
        this.nomeCompleto = militar.getNomeCompleto();
        this.nomeDeGuerra = militar.getNomeDeGuerra();
        this.postoGrad = militar.getPostoGrad();
        this.categoria = militar.getCategoria() != null ? militar.getCategoria().name() : null;
        this.ultimaData = ultimaData;
        long diasDesdeUltimo = ChronoUnit.DAYS.between(ultimaData, referencia);
        this.diasRestantes = Math.max(0, 15 - diasDesdeUltimo);
    }
}

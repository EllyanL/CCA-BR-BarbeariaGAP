package intraer.ccabr.barbearia_api.dtos;

import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class DashboardStatsDTO {
    // Total de agendamentos do dia com status AGENDADO ou REALIZADO
    private long agendamentosHoje;
    private long totalUsuarios;
    private Map<String, Long> distribuicaoPorCategoria;
    private double ocupacaoAtual;
}

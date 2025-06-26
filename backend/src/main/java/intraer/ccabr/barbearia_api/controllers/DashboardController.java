package intraer.ccabr.barbearia_api.controllers;

import intraer.ccabr.barbearia_api.dtos.AgendamentoDTO;
import intraer.ccabr.barbearia_api.dtos.DashboardStatsDTO;
import intraer.ccabr.barbearia_api.dtos.WeeklyCountDTO;
import intraer.ccabr.barbearia_api.models.Agendamento;
import intraer.ccabr.barbearia_api.repositories.AgendamentoRepository;
import intraer.ccabr.barbearia_api.repositories.HorarioRepository;
import intraer.ccabr.barbearia_api.repositories.MilitarRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final AgendamentoRepository agendamentoRepository;
    private final MilitarRepository militarRepository;
    private final HorarioRepository horarioRepository;

    public DashboardController(
            AgendamentoRepository agendamentoRepository,
            MilitarRepository militarRepository,
            HorarioRepository horarioRepository) {
        this.agendamentoRepository = agendamentoRepository;
        this.militarRepository = militarRepository;
        this.horarioRepository = horarioRepository;
    }

    @GetMapping("/stats")
    public DashboardStatsDTO getStats() {
        LocalDate today = LocalDate.now();
        long agendamentosHoje = agendamentoRepository.countByData(today);
        long totalUsuarios = militarRepository.count();

        Map<String, Long> porCategoria = agendamentoRepository.countByCategoria(today)
                .stream()
                .collect(Collectors.toMap(obj -> (String) obj[0], obj -> (Long) obj[1]));

        String diaSemana = mapDiaSemana(today.getDayOfWeek());
        long totalHorarios = horarioRepository.countByDia(diaSemana);
        double ocupacao = totalHorarios > 0 ? ((double) agendamentosHoje * 100) / totalHorarios : 0.0;

        return new DashboardStatsDTO(agendamentosHoje, totalUsuarios, porCategoria, ocupacao);
    }

    @GetMapping("/recent")
    public List<AgendamentoDTO> getRecentAgendamentos() {
        List<Agendamento> recentes = agendamentoRepository.findTop5ByOrderByDataDescHoraDesc();
        return recentes.stream().map(AgendamentoDTO::new).toList();
    }

    @GetMapping("/stats/weekly")
    public List<WeeklyCountDTO> getWeeklyStats() {
        LocalDate today = LocalDate.now();
        LocalDate start = today.minusDays(6);
        List<Object[]> results = agendamentoRepository.countByDataSince(start);
        return results.stream()
                .map(arr -> new WeeklyCountDTO((LocalDate) arr[0], (Long) arr[1]))
                .toList();
    }

    private String mapDiaSemana(DayOfWeek day) {
        return switch (day) {
            case MONDAY -> "segunda";
            case TUESDAY -> "terça";
            case WEDNESDAY -> "quarta";
            case THURSDAY -> "quinta";
            case FRIDAY -> "sexta";
            case SATURDAY -> "sábado";
            case SUNDAY -> "domingo";
        };
    }
}

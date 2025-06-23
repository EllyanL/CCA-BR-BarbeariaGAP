package intraer.ccabr.barbearia_api.services;

import intraer.ccabr.barbearia_api.dtos.HorarioDTO;
import intraer.ccabr.barbearia_api.enums.HorarioStatus;
import intraer.ccabr.barbearia_api.models.Horario;
import intraer.ccabr.barbearia_api.repositories.AgendamentoRepository;
import intraer.ccabr.barbearia_api.repositories.HorarioRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class HorarioService {

    private static final Logger logger = LoggerFactory.getLogger(HorarioService.class);

    private final HorarioRepository horarioRepository;

    private final AgendamentoRepository agendamentoRepository;

    public HorarioService(HorarioRepository horarioRepository, AgendamentoRepository agendamentoRepository) {
        this.horarioRepository = horarioRepository;
        this.agendamentoRepository = agendamentoRepository;
    }


    // @PostConstruct
    // public void inicializarHorariosBase() {
    //     // Preencher horariosBase com base nos horários únicos do banco
    //     List<Horario> todosHorarios = horarioRepository.findAll();
    //     Set<String> horariosUnicos = todosHorarios.stream()
    //             .map(Horario::getHorario)
    //             .collect(Collectors.toSet());
    //     for (String horario : horariosUnicos) {
    //         if (horariosBase.stream().noneMatch(h -> h.getHorario().equals(horario))) {
    //             HorarioBase novoHorarioBase = new HorarioBase();
    //             novoHorarioBase.setHorario(horario);
    //             horariosBase.add(novoHorarioBase);
    //         }
    //     }
    //     logger.info("Horários base inicializados a partir do banco: {}", horariosBase);
    // }

    public Map<String, Map<String, List<Horario>>> getTodosHorarios() {
        Map<String, Map<String, List<Horario>>> horarios = new HashMap<>();
        String[] dias = {"segunda", "terça", "quarta", "quinta", "sexta"};
        String[] categorias = {"GRADUADO", "OFICIAL"};

        for (String dia : dias) {
            Map<String, List<Horario>> porCategoria = new HashMap<>();
            for (String categoria : categorias) {
                List<Horario> horariosDiaCategoria = horarioRepository.findByDiaAndCategoria(dia, categoria);
                logger.debug("Horários encontrados para dia: {}, categoria: {}, quantidade: {}", dia, categoria, horariosDiaCategoria.size());
                porCategoria.put(categoria, horariosDiaCategoria);
            }
            horarios.put(dia, porCategoria);
        }
        logger.info("Retornando todos os horários: {}", horarios);
        return horarios;
    }

    public List<Horario> getHorariosPorDiaECategoria(String dia, String categoria) {
        return horarioRepository.findByDiaAndCategoria(dia, categoria);
    }

    public List<String> getHorariosUnicos() {
        return horarioRepository.findAll()
            .stream()
            .map(Horario::getHorario)
              .distinct()
            .sorted()
            .collect(Collectors.toList());
    }
    
    

    public Map<String, List<HorarioDTO>> listarHorariosAgrupadosPorCategoria(String categoria) {
        List<Horario> horarios = horarioRepository.findByCategoria(categoria);
        List<HorarioDTO> dtos = horarios.stream().map(h -> {
            HorarioDTO dto = new HorarioDTO(h);
            if (h.getStatus() == HorarioStatus.AGENDADO) {
                agendamentoRepository
                    .findFirstByHoraAndDiaSemanaAndCategoriaAndDataGreaterThanEqualOrderByDataAsc(
                            LocalTime.parse(h.getHorario()),
                            h.getDia(),
                            h.getCategoria(),
                            LocalDate.now())
                    .ifPresent(a -> dto.setUsuarioId(a.getMilitar().getId()));
            }
            return dto;
        }).toList();

        return dtos.stream().collect(Collectors.groupingBy(HorarioDTO::getDia));
    }
    

    public HorarioDTO alterarStatus(String dia, String horario, String categoria, HorarioStatus status) {
        Horario h = horarioRepository.findByDiaAndHorarioAndCategoria(dia, horario, categoria)
                .orElseThrow(() -> new RuntimeException("Horário não encontrado."));
        h.setStatus(status);
        return new HorarioDTO(horarioRepository.save(h));
    }

    public List<Horario> adicionarHorarioBaseParaTodos(String novoHorario) {
        List<String> dias = List.of("segunda", "terça", "quarta", "quinta", "sexta");
        List<String> categorias = List.of("GRADUADO", "OFICIAL");
    
        List<Horario> adicionados = new ArrayList<>();
        for (String dia : dias) {
            for (String categoria : categorias) {
                if (!horarioRepository.existsByDiaAndHorarioAndCategoria(dia, novoHorario, categoria)) {
                    Horario h = new Horario(dia, novoHorario, categoria, HorarioStatus.DISPONIVEL);
                    adicionados.add(horarioRepository.save(h));
                }
            }
        }
        return adicionados;
    }
    

    @Transactional
    public Horario salvarHorario(Horario horario) {
        return horarioRepository.save(horario);
    }

    @Transactional
    public Horario disponibilizarHorario(String dia, String horario, String categoria) {
        Optional<Horario> horarioOpt = horarioRepository.findByDiaAndHorarioAndCategoria(dia, horario, categoria);
        Horario h = horarioOpt.orElseGet(() -> new Horario(dia, horario, categoria, HorarioStatus.DISPONIVEL));
    
        // ⚠️ Converter String para LocalTime
        LocalTime horaConvertida = LocalTime.parse(horario);
    
        boolean hasAgendamento = agendamentoRepository.existsByHoraAndDiaSemanaAndCategoria(
                horaConvertida,
                dia,
                categoria
        );
    
        if (hasAgendamento) {
            h.setStatus(HorarioStatus.INDISPONIVEL);
        } else {
            h.setStatus(HorarioStatus.DISPONIVEL);
        }
        return horarioRepository.save(h);
    }
    
    @Transactional
    public Horario indisponibilizarHorario(String dia, String horario, String categoria) {
        Optional<Horario> horarioOpt = horarioRepository.findByDiaAndHorarioAndCategoria(dia, horario, categoria);
        Horario h = horarioOpt.orElseGet(() -> new Horario(dia, horario, categoria, HorarioStatus.INDISPONIVEL));

        LocalTime horaConvertida = LocalTime.parse(horario);
        boolean hasAgendamento = agendamentoRepository.existsByHoraAndDiaSemanaAndCategoria(
                horaConvertida,
                dia,
                categoria
        );

        if (hasAgendamento) {
            throw new IllegalArgumentException("Já existe agendamento para este horário.");
        }

        h.setStatus(HorarioStatus.INDISPONIVEL);
        return horarioRepository.save(h);
    }

    @Transactional
    public Map<String, Object> disponibilizarTodosHorarios(String dia, List<String> horarios, String categoria) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm");

        // ✅ Validar formatos
        List<String> horariosValidos = horarios.stream()
            .map(h -> {
                try {
                    LocalTime.parse(h, formatter); // apenas valida
                    return h;
                } catch (DateTimeParseException e) {
                    throw new IllegalArgumentException("Horário inválido: " + h);
                }
            })
            .toList();

        boolean hasAgendamentos = horariosValidos.stream().anyMatch(horario ->
            agendamentoRepository.existsByHoraAndDiaSemanaAndCategoria(
                LocalTime.parse(horario),
                dia,
                categoria
            )
        );

        if (hasAgendamentos) {
            throw new IllegalArgumentException("Existem horários agendados. Não é possível disponibilizar todos.");
        }

        Map<String, Object> response = new HashMap<>();
        response.put("mensagem", "Horários processados para " + dia + " (" + categoria + ")");

        List<Horario> afetados = horariosValidos.stream()
            .map(h -> {
                Optional<Horario> horarioOpt = horarioRepository.findByDiaAndHorarioAndCategoria(dia, h, categoria);
                Horario horarioEntity = horarioOpt.orElseGet(() -> new Horario(dia, h, categoria, HorarioStatus.DISPONIVEL));
                horarioEntity.setStatus(HorarioStatus.DISPONIVEL);
                return horarioRepository.save(horarioEntity);
            })
            .toList();

        response.put("horariosAfetados", afetados);
        return response;
    }



    @Transactional
    public Map<String, Object> indisponibilizarTodosHorarios(String dia, List<String> horarios, String categoria) {
        Map<String, Object> response = new HashMap<>();
        response.put("mensagem", "Horários indisponibilizados para " + dia + " (" + categoria + ")");
        List<Horario> afetados = horarios.stream()
                .map(h -> {
                    Optional<Horario> horarioOpt = horarioRepository.findByDiaAndHorarioAndCategoria(dia, h, categoria);
                    Horario horarioEntity = horarioOpt.orElseGet(() -> new Horario(dia, h, categoria,HorarioStatus.INDISPONIVEL));
                    horarioEntity.setStatus(HorarioStatus.INDISPONIVEL);
                    return horarioRepository.save(horarioEntity);
                })
                .collect(Collectors.toList());
        response.put("horariosAfetados", afetados);
        return response;
    }

    @Transactional
    public void sincronizarHorariosBaseComHorarios(String novoHorario) {
        List<String> diasDaSemana = Arrays.asList("segunda", "terça", "quarta", "quinta", "sexta");
        List<String> categorias = Arrays.asList("GRADUADO", "OFICIAL");
        for (String dia : diasDaSemana) {
            for (String categoria : categorias) {
                if (!horarioRepository.existsByDiaAndHorarioAndCategoria(dia, novoHorario, categoria)) {
                    Horario horario = new Horario(dia, novoHorario, categoria,HorarioStatus.DISPONIVEL);
                    horarioRepository.save(horario);
                    logger.info("Sincronizado novo horário: dia={}, horario={}, categoria={}", dia, novoHorario, categoria);
                }
            }
        }
    }
}
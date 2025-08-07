package intraer.ccabr.barbearia_api.services;

import intraer.ccabr.barbearia_api.dtos.HorarioDTO;
import intraer.ccabr.barbearia_api.enums.HorarioStatus;
import intraer.ccabr.barbearia_api.models.Horario;
import intraer.ccabr.barbearia_api.models.ConfiguracaoAgendamento;
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
import java.util.stream.Stream;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class HorarioService {

    private static final Logger logger = LoggerFactory.getLogger(HorarioService.class);

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    private final HorarioRepository horarioRepository;

    private final AgendamentoRepository agendamentoRepository;

    private final ConfiguracaoAgendamentoService configuracaoAgendamentoService;

    public HorarioService(HorarioRepository horarioRepository,
                          AgendamentoRepository agendamentoRepository,
                          ConfiguracaoAgendamentoService configuracaoAgendamentoService) {
        this.horarioRepository = horarioRepository;
        this.agendamentoRepository = agendamentoRepository;
        this.configuracaoAgendamentoService = configuracaoAgendamentoService;
    }

    private void validarHorarioDentroIntervalo(LocalTime hora) {
        ConfiguracaoAgendamento config = configuracaoAgendamentoService.buscarConfiguracao();
        if (hora.isBefore(config.getHorarioInicio()) || hora.isAfter(config.getHorarioFim())) {
            throw new IllegalArgumentException("Horário fora do intervalo permitido.");
        }
    }

    private boolean horarioDentroIntervalo(LocalTime hora, ConfiguracaoAgendamento config) {
        return !hora.isBefore(config.getHorarioInicio()) && !hora.isAfter(config.getHorarioFim());
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
        ConfiguracaoAgendamento config = configuracaoAgendamentoService.buscarConfiguracao();
        Map<String, Map<String, List<Horario>>> horarios = new HashMap<>();
        String[] dias = {"segunda", "terça", "quarta", "quinta", "sexta"};
        String[] categorias = {"GRADUADO", "OFICIAL"};

        for (String dia : dias) {
            Map<String, List<Horario>> porCategoria = new HashMap<>();
            for (String categoria : categorias) {
                List<Horario> horariosDiaCategoria = horarioRepository.findByDiaAndCategoria(dia, categoria)
                    .stream()
                    .filter(h -> horarioDentroIntervalo(LocalTime.parse(h.getHorario()), config))
                    .collect(Collectors.toList());
                logger.debug("Horários encontrados para dia: {}, categoria: {}, quantidade: {}", dia, categoria, horariosDiaCategoria.size());
                porCategoria.put(categoria, horariosDiaCategoria);
            }
            horarios.put(dia, porCategoria);
        }
        logger.info("Retornando todos os horários: {}", horarios);
        return horarios;
    }

    public List<Horario> getHorariosPorDiaECategoria(String dia, String categoria) {
        ConfiguracaoAgendamento config = configuracaoAgendamentoService.buscarConfiguracao();
        return horarioRepository.findByDiaAndCategoria(dia, categoria).stream()
                .filter(h -> horarioDentroIntervalo(LocalTime.parse(h.getHorario()), config))
                .collect(Collectors.toList());
    }

    public List<String> getHorariosUnicos() {
        ConfiguracaoAgendamento config = configuracaoAgendamentoService.buscarConfiguracao();

        // Horários gerados a partir da configuração (intervalos de 30 minutos)
        List<String> gerados = new ArrayList<>();
        for (LocalTime t = config.getHorarioInicio(); !t.isAfter(config.getHorarioFim()); t = t.plusMinutes(30)) {
            gerados.add(t.format(TIME_FORMATTER));
        }

        // Horários existentes no banco dentro do intervalo configurado
        List<String> existentes = horarioRepository.findAll().stream()
                .map(Horario::getHorario)
                .map(LocalTime::parse)
                .filter(h -> horarioDentroIntervalo(h, config))
                .map(h -> h.format(TIME_FORMATTER))
                .toList();

        // Combina, remove duplicados e ordena
        return Stream.concat(gerados.stream(), existentes.stream())
                .distinct()
                .sorted()
                .collect(Collectors.toList());
    }
    
    

    public Map<String, List<HorarioDTO>> listarHorariosAgrupadosPorCategoria(String categoria) {
        ConfiguracaoAgendamento config = configuracaoAgendamentoService.buscarConfiguracao();
        List<Horario> horarios = horarioRepository.findByCategoria(categoria).stream()
                .filter(h -> horarioDentroIntervalo(LocalTime.parse(h.getHorario()), config))
                .collect(Collectors.toList());
        List<HorarioDTO> dtos = horarios.stream().map(h -> {
            HorarioDTO dto = new HorarioDTO(h);
            agendamentoRepository
                .findFirstByHoraAndDiaSemanaAndCategoriaAndDataGreaterThanEqualOrderByDataAsc(
                        LocalTime.parse(h.getHorario()),
                        h.getDia(),
                        h.getCategoria(),
                        LocalDate.now())
                .ifPresent(a -> dto.setUsuarioId(a.getMilitar().getId()));
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
        LocalTime hora = LocalTime.parse(novoHorario);
        validarHorarioDentroIntervalo(hora);

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
        LocalTime hora = LocalTime.parse(horario.getHorario());
        validarHorarioDentroIntervalo(hora);
        return horarioRepository.save(horario);
    }

    @Transactional
    public Horario disponibilizarHorario(String dia, String horario, String categoria) {
        Optional<Horario> horarioOpt = horarioRepository.findByDiaAndHorarioAndCategoria(dia, horario, categoria);
        if (horarioOpt.isEmpty()) {
            return null;
        }
        Horario h = horarioOpt.get();

        // ⚠️ Converter String para LocalTime com validação de formato
        LocalTime horaConvertida;
        try {
            horaConvertida = LocalTime.parse(horario, TIME_FORMATTER);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("Horário inválido: " + horario, e);
        }
        validarHorarioDentroIntervalo(horaConvertida);

        boolean hasAgendamentoAtivo = agendamentoRepository.existsByHoraAndDiaSemanaAndCategoria(
                horaConvertida,
                dia,
                categoria
        );

        if (hasAgendamentoAtivo) {
            h.setStatus(HorarioStatus.INDISPONIVEL);
        } else {
            h.setStatus(HorarioStatus.DISPONIVEL);
        }
        return horarioRepository.save(h);
    }

    @Transactional
    public boolean removerHorarioPersonalizado(String dia, String horario, String categoria) {
        Optional<Horario> existente = horarioRepository.findByDiaAndHorarioAndCategoria(dia, horario, categoria);
        existente.ifPresent(horarioRepository::delete);
        return existente.isPresent();
    }

    @Transactional
    public Horario indisponibilizarHorario(String dia, String horario, String categoria) {
        Optional<Horario> horarioOpt = horarioRepository.findByDiaAndHorarioAndCategoria(dia, horario, categoria);
        if (horarioOpt.isEmpty()) {
            return null;
        }
        Horario h = horarioOpt.get();

        LocalTime horaConvertida;
        try {
            horaConvertida = LocalTime.parse(horario, TIME_FORMATTER);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("Horário inválido: " + horario, e);
        }
        validarHorarioDentroIntervalo(horaConvertida);
        boolean hasAgendamentoAtivo = agendamentoRepository.existsByHoraAndDiaSemanaAndCategoria(
                horaConvertida,
                dia,
                categoria
        );

        if (hasAgendamentoAtivo) {
            throw new IllegalArgumentException("Já existe agendamento ativo para este horário.");
        }

        h.setStatus(HorarioStatus.INDISPONIVEL);
        return horarioRepository.save(h);
    }

    @Transactional
    public Map<String, Object> disponibilizarTodosHorarios(String dia, List<String> horarios, String categoria) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm");

        Map<String, Object> response = new HashMap<>();
        response.put("mensagem", "Horários processados para " + dia + " (" + categoria + ")");

        List<Horario> afetados = new ArrayList<>();
        for (String h : horarios) {
            try {
                LocalTime hora = LocalTime.parse(h, formatter);
                validarHorarioDentroIntervalo(hora);

                boolean agendado = agendamentoRepository.existsByHoraAndDiaSemanaAndCategoria(
                        hora,
                        dia,
                        categoria);
                if (agendado) {
                    // Se já houver agendamento, ignoramos este horário
                    continue;
                }

                Horario horarioEntity = horarioRepository
                        .findByDiaAndHorarioAndCategoria(dia, h, categoria)
                        .orElseGet(() -> new Horario(dia, h, categoria, HorarioStatus.DISPONIVEL));
                horarioEntity.setStatus(HorarioStatus.DISPONIVEL);
                afetados.add(horarioRepository.save(horarioEntity));
            } catch (Exception e) {
                // Ignora erros de horários já processados ou inválidos
                logger.warn("Falha ao disponibilizar horário {} em {}: {}", h, dia, e.getMessage());
            }
        }

        response.put("horariosAfetados", afetados);
        return response;
    }



    @Transactional
    public Map<String, Object> indisponibilizarTodosHorarios(String dia, List<String> horarios, String categoria) {
        Map<String, Object> response = new HashMap<>();
        response.put("mensagem", "Horários indisponibilizados para " + dia + " (" + categoria + ")");

        List<Horario> afetados = new ArrayList<>();
        for (String h : horarios) {
            try {
                LocalTime hora = LocalTime.parse(h);
                validarHorarioDentroIntervalo(hora);
                Horario horarioEntity = horarioRepository
                        .findByDiaAndHorarioAndCategoria(dia, h, categoria)
                        .orElseGet(() -> new Horario(dia, h, categoria, HorarioStatus.INDISPONIVEL));
                horarioEntity.setStatus(HorarioStatus.INDISPONIVEL);
                afetados.add(horarioRepository.save(horarioEntity));
            } catch (Exception e) {
                // Ignora erros de horários já processados ou inexistentes
                logger.warn("Falha ao indisponibilizar horário {} em {}: {}", h, dia, e.getMessage());
            }
        }

        response.put("horariosAfetados", afetados);
        return response;
    }

    @Transactional
    public void sincronizarHorariosBaseComHorarios(String novoHorario) {
        LocalTime hora = LocalTime.parse(novoHorario);
        validarHorarioDentroIntervalo(hora);
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

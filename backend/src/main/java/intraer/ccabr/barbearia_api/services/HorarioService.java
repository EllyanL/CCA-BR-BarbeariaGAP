package intraer.ccabr.barbearia_api.services;

import intraer.ccabr.barbearia_api.dtos.HorarioDTO;
import intraer.ccabr.barbearia_api.enums.HorarioStatus;
import intraer.ccabr.barbearia_api.enums.DiaSemana;
import intraer.ccabr.barbearia_api.exceptions.HorarioComAgendamentoAtivoException;
import intraer.ccabr.barbearia_api.models.Horario;
import intraer.ccabr.barbearia_api.models.Agendamento;
import intraer.ccabr.barbearia_api.models.ConfiguracaoAgendamento;
import intraer.ccabr.barbearia_api.repositories.AgendamentoRepository;
import intraer.ccabr.barbearia_api.repositories.HorarioRepository;
import intraer.ccabr.barbearia_api.util.HoraUtil;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;
import org.springframework.cache.annotation.CacheEvict;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class HorarioService {

    private static final Logger logger = LoggerFactory.getLogger(HorarioService.class);

    private final HorarioRepository horarioRepository;

    private final AgendamentoRepository agendamentoRepository;

    private final ConfiguracaoAgendamentoService configuracaoAgendamentoService;
    private final AgendamentoService agendamentoService;

    public HorarioService(HorarioRepository horarioRepository,
                          AgendamentoRepository agendamentoRepository,
                          ConfiguracaoAgendamentoService configuracaoAgendamentoService,
                          AgendamentoService agendamentoService) {
        this.horarioRepository = horarioRepository;
        this.agendamentoRepository = agendamentoRepository;
        this.configuracaoAgendamentoService = configuracaoAgendamentoService;
        this.agendamentoService = agendamentoService;
    }

    private LocalTime calcularHorarioInicioPermitido(ConfiguracaoAgendamento config) {
        LocalTime inicio = config.getHorarioInicio();
        if (inicio == null) {
            return LocalTime.MIN;
        }

        int minutosInicio = inicio.getHour() * 60 + inicio.getMinute();
        int minutosComMargem = Math.max(0, minutosInicio - 30);
        return LocalTime.of(minutosComMargem / 60, minutosComMargem % 60);
    }

    private void validarHorarioDentroIntervalo(LocalTime hora) {
        ConfiguracaoAgendamento config = configuracaoAgendamentoService.buscarConfiguracao();
        LocalTime inicioPermitido = calcularHorarioInicioPermitido(config);
        if (hora.isBefore(inicioPermitido) || hora.isAfter(config.getHorarioFim())) {
            throw new IllegalArgumentException("Horário fora do intervalo permitido.");
        }
    }

    private void validarIncrementoMeiaHora(LocalTime hora) {
        if (hora.getMinute() % 30 != 0) {
            throw new IllegalArgumentException("Horário deve ser múltiplo de 30 minutos.");
        }
    }

    private boolean horarioDentroIntervalo(LocalTime hora, ConfiguracaoAgendamento config) {
        LocalTime inicioPermitido = calcularHorarioInicioPermitido(config);
        return !hora.isBefore(inicioPermitido) && !hora.isAfter(config.getHorarioFim());
    }

    private LocalDate calcularInicioSemana(LocalDate referencia) {
        DayOfWeek dia = referencia.getDayOfWeek();
        return switch (dia) {
            case SATURDAY -> referencia.plusDays(2);
            case SUNDAY -> referencia.plusDays(1);
            default -> referencia.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        };
    }

    private String chaveDiaCategoria(String dia, String categoria) {
        return dia + "|" + categoria;
    }

    private Map<String, Map<LocalTime, Agendamento>> agruparAgendamentosPorDiaCategoria(List<Agendamento> agendamentos) {
        Map<String, Map<LocalTime, Agendamento>> agrupados = new HashMap<>();
        for (Agendamento agendamento : agendamentos) {
            String chave = chaveDiaCategoria(agendamento.getDiaSemana(), agendamento.getCategoria());
            agrupados
                .computeIfAbsent(chave, k -> new HashMap<>())
                .merge(
                    agendamento.getHora(),
                    agendamento,
                    (existente, novo) -> existente.getData().isAfter(novo.getData()) ? novo : existente
                );
        }
        return agrupados;
    }

    private int ajustarStatusHorariosSemanaAtual(LocalDate inicioSemana,
                                                 LocalDate fimSemana,
                                                 Map<String, Map<LocalTime, Agendamento>> agendamentosAgrupados) {
        List<Horario> todosHorarios = horarioRepository.findAll();
        List<Horario> alterados = new ArrayList<>();

        for (Horario horario : todosHorarios) {
            if (horario.getStatus() == HorarioStatus.INDISPONIVEL) {
                continue;
            }

            String chave = chaveDiaCategoria(horario.getDia(), horario.getCategoria());
            Map<LocalTime, Agendamento> agendados = agendamentosAgrupados.get(chave);
            boolean possuiAgendamento = agendados != null && agendados.containsKey(horario.getHorario());

            HorarioStatus statusEsperado = possuiAgendamento ? HorarioStatus.AGENDADO : HorarioStatus.DISPONIVEL;
            if (horario.getStatus() != statusEsperado) {
                horario.setStatus(statusEsperado);
                alterados.add(horario);
            }
        }

        if (!alterados.isEmpty()) {
            horarioRepository.saveAll(alterados);
            logger.info(
                    "Status dos horários atualizados para a semana de {} a {}. {} registros ajustados.",
                    inicioSemana,
                    fimSemana,
                    alterados.size()
            );
        } else {
            logger.debug(
                    "Nenhuma atualização de status necessária para a semana de {} a {}.",
                    inicioSemana,
                    fimSemana
            );
        }

        return alterados.size();
    }

    @Transactional
    public int ajustarStatusHorariosSemanaAtual() {
        LocalDate hoje = LocalDate.now();
        LocalDate inicioSemana = calcularInicioSemana(hoje);
        LocalDate fimSemana = inicioSemana.plusDays(4);

        List<Agendamento> agendamentosSemana = agendamentoRepository.findAtivosNoPeriodo(inicioSemana, fimSemana);
        Map<String, Map<LocalTime, Agendamento>> agendamentosAgrupados = agruparAgendamentosPorDiaCategoria(agendamentosSemana);

        return ajustarStatusHorariosSemanaAtual(inicioSemana, fimSemana, agendamentosAgrupados);
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
        String[] categorias = {"GRADUADO", "OFICIAL"};

        for (DiaSemana ds : DiaSemana.values()) {
            final String dia = ds.getValor();
            Map<String, List<Horario>> porCategoria = new HashMap<>();
            for (String categoria : categorias) {
                List<Horario> horariosDiaCategoria = horarioRepository.findByDiaAndCategoria(dia, categoria)
                        .stream()
                        .filter(h -> horarioDentroIntervalo(h.getHorario(), config))
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
        String diaNorm = DiaSemana.from(dia).getValor();
        return horarioRepository.findByDiaAndCategoria(diaNorm, categoria).stream()
                .filter(h -> horarioDentroIntervalo(h.getHorario(), config))
                .collect(Collectors.toList());
    }

    public List<String> getHorariosUnicos() {
        ConfiguracaoAgendamento config = configuracaoAgendamentoService.buscarConfiguracao();

        // Horários gerados a partir da configuração (intervalos de 30 minutos)
        List<String> gerados = new ArrayList<>();
        LocalTime inicioPermitido = calcularHorarioInicioPermitido(config);

        for (LocalTime t = inicioPermitido; !t.isAfter(config.getHorarioFim()); t = t.plusMinutes(30)) {
            gerados.add(HoraUtil.format(t));
        }

        // Horários existentes no banco dentro do intervalo configurado
        List<String> existentes = horarioRepository.findAll().stream()
                .map(Horario::getHorario)
                .filter(h -> horarioDentroIntervalo(h, config))
                .map(HoraUtil::format)
                .toList();

        // Combina, remove duplicados e ordena
        return Stream.concat(gerados.stream(), existentes.stream())
                .distinct()
                .sorted()
                .collect(Collectors.toList());
    }
    
    

    private String normalizeStatus(String raw) {
        if (raw == null) {
            return "DISPONIVEL";
        }
        String status = raw.toUpperCase();
        return switch (status) {
            case "AGENDADO", "INDISPONIVEL" -> status;
            case "REALIZADO" -> "AGENDADO";
            default -> "DISPONIVEL";
        };
    }

    @Transactional
    public Map<String, List<HorarioDTO>> listarHorariosAgrupadosPorCategoria(String categoria) {
        ConfiguracaoAgendamento config = configuracaoAgendamentoService.buscarConfiguracao();

        LocalDate hoje = LocalDate.now();
        LocalDate inicioSemana = calcularInicioSemana(hoje);
        LocalDate fimSemana = inicioSemana.plusDays(4);

        List<Agendamento> agendamentosSemana = agendamentoRepository.findAtivosNoPeriodo(inicioSemana, fimSemana);
        Map<String, Map<LocalTime, Agendamento>> agendamentosAgrupados = agruparAgendamentosPorDiaCategoria(agendamentosSemana);
        ajustarStatusHorariosSemanaAtual(inicioSemana, fimSemana, agendamentosAgrupados);

        List<Horario> horarios = horarioRepository.findByCategoria(categoria).stream()
                .filter(h -> horarioDentroIntervalo(h.getHorario(), config))
                .collect(Collectors.toList());

        List<HorarioDTO> dtos = horarios.stream().map(h -> {
            HorarioDTO dto = new HorarioDTO(h);
            String status = h.getStatus().name();

            String chave = chaveDiaCategoria(h.getDia(), h.getCategoria());
            Map<LocalTime, Agendamento> agendados = agendamentosAgrupados.getOrDefault(
                    chave,
                    Collections.<LocalTime, Agendamento>emptyMap()
            );
            Agendamento agendamento = agendados.get(h.getHorario());
            if (agendamento != null) {
                dto.setUsuarioId(agendamento.getMilitar().getId());
                status = "AGENDADO";
            }

            dto.setStatus(normalizeStatus(status));

            return dto;
        }).toList();

        return dtos.stream().collect(Collectors.groupingBy(HorarioDTO::getDia));
    }

    @Transactional
    public HorarioDTO toggleHorario(String dia, String horario, String categoria) {
        String diaNorm = DiaSemana.from(dia).getValor();
        LocalTime horaNorm = LocalTime.parse(horario);

        Optional<Horario> opt = horarioRepository.findByDiaAndHorarioAndCategoria(diaNorm, horaNorm, categoria);
        if (opt.isEmpty()) {
            return null;
        }

        Horario h = opt.get();
        if (h.getStatus() != HorarioStatus.AGENDADO) {
            h.setStatus(h.getStatus() == HorarioStatus.DISPONIVEL
                    ? HorarioStatus.INDISPONIVEL
                    : HorarioStatus.DISPONIVEL);
            h = horarioRepository.save(h);
        }

        HorarioDTO dto = new HorarioDTO();
        dto.setId(h.getId());
        dto.setDia(diaNorm);
        dto.setHorario(HoraUtil.format(h.getHorario()));
        dto.setCategoria(h.getCategoria() != null ? h.getCategoria().toUpperCase() : null);
        dto.setStatus(normalizeStatus(h.getStatus().name()));
        return dto;
    }

    @Transactional
    public Map<String, List<HorarioDTO>> toggleDia(String dia, String categoria) {
        String diaNorm = DiaSemana.from(dia).getValor();

        List<Horario> horarios = horarioRepository.findByDiaAndCategoria(diaNorm, categoria);
        for (Horario h : horarios) {
            if (h.getStatus() != HorarioStatus.AGENDADO) {
                h.setStatus(h.getStatus() == HorarioStatus.DISPONIVEL
                        ? HorarioStatus.INDISPONIVEL
                        : HorarioStatus.DISPONIVEL);
            }
        }
        horarioRepository.saveAll(horarios);

        return listarHorariosAgrupadosPorCategoria(categoria);
    }
    

    @Transactional
    @CacheEvict(value = "horarios", key = "#id")
    public HorarioDTO alterarStatus(Long id, HorarioStatus status) {
        try {
            Horario h = horarioRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Horário não encontrado para o ID: " + id));

            boolean hasAgendamentoAtivo = agendamentoRepository.existsByHoraAndDiaSemanaAndCategoria(
                    h.getHorario(),
                    h.getDia(),
                    h.getCategoria()
            );

            if (hasAgendamentoAtivo) {
                throw new IllegalArgumentException("Já existe agendamento ativo para este horário.");
            }

            h.setStatus(status);
            return new HorarioDTO(horarioRepository.save(h));
        } catch (IllegalArgumentException e) {
            logger.error("Erro ao alterar status do horário: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            logger.error("Erro inesperado ao alterar status do horário", e);
            throw new RuntimeException("Erro ao alterar status do horário", e);
        }
    }

    public List<Horario> adicionarHorarioBaseParaTodos(String novoHorario) {
        LocalTime hora = LocalTime.parse(novoHorario);
        validarHorarioDentroIntervalo(hora);
        validarIncrementoMeiaHora(hora);

        List<String> dias = Arrays.stream(DiaSemana.values()).map(DiaSemana::getValor).toList();
        List<String> categorias = List.of("GRADUADO", "OFICIAL");

        List<Horario> adicionados = new ArrayList<>();
        for (final String dia : dias) {
            for (final String categoria : categorias) {
                if (!horarioRepository.existsByDiaAndHorarioAndCategoria(dia, hora, categoria)) {
                    Horario h = new Horario(dia, hora, categoria, HorarioStatus.DISPONIVEL);
                    adicionados.add(horarioRepository.save(h));
                }
            }
        }
        return adicionados;
    }
    

    @Transactional
    public Horario salvarHorario(Horario horario) {
        LocalTime hora = horario.getHorario();
        validarHorarioDentroIntervalo(hora);
        validarIncrementoMeiaHora(hora);
        return horarioRepository.save(horario);
    }

    @Transactional
    public HorarioDTO liberarHorario(Long horarioId) {
        Horario horario = horarioRepository.findById(horarioId)
                .orElseThrow(() -> new IllegalArgumentException("Horário não encontrado para o ID: " + horarioId));

        agendamentoRepository.findFirstByHoraAndDiaSemanaAndCategoriaAndDataGreaterThanEqualOrderByDataAsc(
                        horario.getHorario(),
                        horario.getDia(),
                        horario.getCategoria(),
                        LocalDate.now())
                .ifPresent(agendamento -> {
                    String status = agendamento.getStatus();
                    if (!"CANCELADO".equalsIgnoreCase(status) && !"ADMIN_CANCELADO".equalsIgnoreCase(status)) {
                        agendamentoService.cancelarAgendamento(agendamento.getId(), "ADMIN");
                    }
                });

        horario.setStatus(HorarioStatus.DISPONIVEL);
        return new HorarioDTO(horarioRepository.save(horario));
    }

    @Transactional
    public Horario disponibilizarHorario(String dia, LocalTime horario, String categoria) {
        final String diaNorm = DiaSemana.from(dia).getValor();
        Optional<Horario> horarioOpt = horarioRepository.findByDiaAndHorarioAndCategoria(diaNorm, horario, categoria);
        if (horarioOpt.isEmpty()) {
            return null;
        }
        Horario h = horarioOpt.get();

        validarHorarioDentroIntervalo(horario);
        validarIncrementoMeiaHora(horario);

        boolean hasAgendamentoAtivo = agendamentoRepository.existsByHoraAndDiaSemanaAndCategoria(
                horario,
                diaNorm,
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
    public boolean removerHorarioPersonalizado(String dia, LocalTime horario, String categoria) {
        String diaNorm = DiaSemana.from(dia).getValor();
        Optional<Horario> existente = horarioRepository.findByDiaAndHorarioAndCategoria(diaNorm, horario, categoria);
        if (existente.isEmpty()) {
            return false;
        }

        boolean possuiAgendamentoAtivo = agendamentoRepository.existsByHoraAndDiaSemanaAndCategoria(
                horario,
                diaNorm,
                categoria
        );

        if (possuiAgendamentoAtivo) {
            String mensagem = String.format(
                    "Não é possível remover o horário %s de %s (%s). Existe agendamento ativo. Cancele o agendamento antes de remover.",
                    HoraUtil.format(horario),
                    diaNorm,
                    categoria
            );
            throw new HorarioComAgendamentoAtivoException(mensagem);
        }

        horarioRepository.delete(existente.get());
        return true;
    }

    @Transactional
    public Horario indisponibilizarHorario(String dia, LocalTime horario, String categoria) {
        final String diaNorm = DiaSemana.from(dia).getValor();
        Optional<Horario> horarioOpt = horarioRepository.findByDiaAndHorarioAndCategoria(diaNorm, horario, categoria);
        if (horarioOpt.isEmpty()) {
            return null;
        }
        Horario h = horarioOpt.get();

        validarHorarioDentroIntervalo(horario);
        validarIncrementoMeiaHora(horario);
        boolean hasAgendamentoAtivo = agendamentoRepository.existsByHoraAndDiaSemanaAndCategoria(
                horario,
                diaNorm,
                categoria
        );

        if (hasAgendamentoAtivo) {
            throw new IllegalArgumentException("Já existe agendamento ativo para este horário.");
        }

        h.setStatus(HorarioStatus.INDISPONIVEL);
        return horarioRepository.save(h);
    }

    @Transactional
    public Map<String, Object> disponibilizarTodosHorarios(String dia, List<LocalTime> horarios, String categoria) {
        final String diaNorm = DiaSemana.from(dia).getValor();
        Map<String, Object> response = new HashMap<>();
        response.put("mensagem", "Horários processados para " + diaNorm + " (" + categoria + ")");

        List<Horario> afetados = new ArrayList<>();
        for (LocalTime h : horarios) {
            try {
                validarHorarioDentroIntervalo(h);
                validarIncrementoMeiaHora(h);

                boolean agendado = agendamentoRepository.existsByHoraAndDiaSemanaAndCategoria(
                        h,
                        diaNorm,
                        categoria);
                if (agendado) {
                    // Se já houver agendamento, ignoramos este horário
                    continue;
                }

                Horario horarioEntity = horarioRepository
                        .findByDiaAndHorarioAndCategoria(diaNorm, h, categoria)
                        .orElseGet(() -> new Horario(diaNorm, h, categoria, HorarioStatus.DISPONIVEL));
                horarioEntity.setStatus(HorarioStatus.DISPONIVEL);
                afetados.add(horarioRepository.save(horarioEntity));
            } catch (Exception e) {
                // Ignora erros de horários já processados ou inválidos
                logger.warn("Falha ao disponibilizar horário {} em {}: {}", h, diaNorm, e.getMessage());
            }
        }

        response.put("horariosAfetados", afetados);
        return response;
    }



    @Transactional
    public Map<String, Object> indisponibilizarTodosHorarios(String dia, List<LocalTime> horarios, String categoria) {
        final String diaNorm = DiaSemana.from(dia).getValor();
        Map<String, Object> response = new HashMap<>();
        response.put("mensagem", "Horários indisponibilizados para " + diaNorm + " (" + categoria + ")");

        List<Horario> afetados = new ArrayList<>();
        for (LocalTime h : horarios) {
            try {
                validarHorarioDentroIntervalo(h);
                validarIncrementoMeiaHora(h);

                boolean agendado = agendamentoRepository.existsByHoraAndDiaSemanaAndCategoria(
                        h,
                        diaNorm,
                        categoria);
                if (agendado) {
                    // Se já houver agendamento, ignoramos este horário
                    continue;
                }

                Optional<Horario> existente = horarioRepository.findByDiaAndHorarioAndCategoria(diaNorm, h, categoria);
                if (existente.isPresent()) {
                    Horario horarioEntity = existente.get();
                    if (horarioEntity.getStatus() != HorarioStatus.INDISPONIVEL) {
                        horarioEntity.setStatus(HorarioStatus.INDISPONIVEL);
                        afetados.add(horarioRepository.save(horarioEntity));
                    }
                } else {
                    Horario novoHorario = new Horario(diaNorm, h, categoria, HorarioStatus.INDISPONIVEL);
                    afetados.add(horarioRepository.save(novoHorario));
                }
            } catch (Exception e) {
                // Ignora erros de horários já processados ou inexistentes
                logger.warn("Falha ao indisponibilizar horário {} em {}: {}", h, diaNorm, e.getMessage());
            }
        }

        response.put("horariosAfetados", afetados);
        return response;
    }

    @Transactional
    public void sincronizarHorariosBaseComHorarios(String novoHorario) {
        LocalTime hora = LocalTime.parse(novoHorario);
        validarHorarioDentroIntervalo(hora);
        validarIncrementoMeiaHora(hora);
        List<String> diasDaSemana = Arrays.stream(DiaSemana.values()).map(DiaSemana::getValor).toList();
        List<String> categorias = Arrays.asList("GRADUADO", "OFICIAL");
        for (final String dia : diasDaSemana) {
            for (final String categoria : categorias) {
                if (!horarioRepository.existsByDiaAndHorarioAndCategoria(dia, hora, categoria)) {
                    Horario horario = new Horario(dia, hora, categoria,HorarioStatus.DISPONIVEL);
                    horarioRepository.save(horario);
                    logger.info("Sincronizado novo horário: dia={}, horario={}, categoria={}", dia, novoHorario, categoria);
                }
            }
        }
    }
}

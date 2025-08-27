package intraer.ccabr.barbearia_api.services;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import intraer.ccabr.barbearia_api.enums.HorarioStatus;
import intraer.ccabr.barbearia_api.enums.DiaSemana;
import intraer.ccabr.barbearia_api.models.Agendamento;
import intraer.ccabr.barbearia_api.models.Horario;
import intraer.ccabr.barbearia_api.models.Militar;
import intraer.ccabr.barbearia_api.models.ConfiguracaoAgendamento;
import intraer.ccabr.barbearia_api.repositories.AgendamentoRepository;
import intraer.ccabr.barbearia_api.repositories.HorarioRepository;
import intraer.ccabr.barbearia_api.services.ConfiguracaoAgendamentoService;

@Service
@Transactional
public class AgendamentoService {

    private static final Logger logger = LoggerFactory.getLogger(AgendamentoService.class);

    private final AgendamentoRepository agendamentoRepository;

    private final HorarioRepository horarioRepository;

    private final ConfiguracaoAgendamentoService configuracaoAgendamentoService;

    public AgendamentoService(AgendamentoRepository agendamentoRepository,
                              HorarioRepository horarioRepository,
                              ConfiguracaoAgendamentoService configuracaoAgendamentoService) {
        this.agendamentoRepository = agendamentoRepository;
        this.horarioRepository = horarioRepository;
        this.configuracaoAgendamentoService = configuracaoAgendamentoService;
    }

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");
    private static final ZoneId ZONE_ID_SAO_PAULO = ZoneId.of("America/Sao_Paulo");

    @Transactional
    public Agendamento saveAgendamento(Agendamento agendamento) {
        Militar militar = agendamento.getMilitar();
        if (militar != null) {
            agendamento.setMilitar(militar);
        }
        return agendamentoRepository.save(agendamento);
    }

    @Transactional
    public Agendamento criarAgendamentoTransactional(Agendamento agendamento) {
        String dia = DiaSemana.from(agendamento.getDiaSemana()).getValor();
        agendamento.setDiaSemana(dia);
        Optional<Horario> horarioOpt = horarioRepository.findByDiaAndHorarioAndCategoria(
            dia,
            agendamento.getHora(),
            agendamento.getCategoria()
        );

        if (horarioOpt.isEmpty() || horarioOpt.get().getStatus() != HorarioStatus.DISPONIVEL) {
            throw new IllegalStateException("Horário indisponível");
        }

        boolean ocupado = agendamentoRepository.existsByDataAndHoraAndDiaSemanaAndCategoriaAndStatusNot(
            agendamento.getData(),
            agendamento.getHora(),
            dia,
            agendamento.getCategoria(),
            "CANCELADO"
        );
        if (ocupado) {
            throw new IllegalStateException("Horário indisponível");
        }

        Agendamento saved = agendamentoRepository.save(agendamento);

        Horario horario = horarioOpt.get();
        horario.setStatus(HorarioStatus.AGENDADO);
        horarioRepository.save(horario);

        return saved;
    }

    public List<Agendamento> findAll() {
        return agendamentoRepository.findAllWithMilitar();
    }

    @Transactional(readOnly = true)
    public List<Agendamento> findByMilitarId(Long id) {
        return agendamentoRepository.findByMilitarId(id);
    }

    @Transactional(readOnly = true)
    public List<Agendamento> findByCategoriaAndPeriodo(String categoria, LocalDate dataInicio, LocalDate dataFim) {
        // dataInicio e dataFim podem ser nulos para buscar sem restrição de período
        return agendamentoRepository.findByCategoriaAndPeriodo(categoria, dataInicio, dataFim);
    }

    public Optional<Agendamento> findById(Long id) {
        return agendamentoRepository.findByIdWithMilitar(id);
    }

    @Transactional
    public void cancelarAgendamento(Long id, String canceladoPor) {
        agendamentoRepository.findById(id).ifPresent(agendamento -> {
            LocalDateTime agendamentoDateTime = LocalDateTime.of(agendamento.getData(), agendamento.getHora());
            boolean isAdmin = "ADMIN".equalsIgnoreCase(canceladoPor);

            if (!isAdmin) {
                LocalDateTime limiteCancelamento = ZonedDateTime.now(ZONE_ID_SAO_PAULO)
                    .plusMinutes(30)
                    .toLocalDateTime();
                if (agendamentoDateTime.isBefore(limiteCancelamento)) {
                    throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Desmarcação só permitida com 30 min de antecedência."
                    );
                }
            }

            agendamento.setStatus(isAdmin ? "ADMIN_CANCELADO" : "CANCELADO");
            agendamento.setCanceladoPor(isAdmin ? "ADMIN" : "USUARIO");
            agendamentoRepository.save(agendamento);
            marcarHorarioComoDisponivel(agendamento);
        });
    }

    public boolean isAgendamentoDisponivel(LocalDate data, LocalTime hora, String diaSemana, String categoria) {
        // Considera apenas agendamentos cujo status seja diferente de 'CANCELADO'
        String dia = DiaSemana.from(diaSemana).getValor();
        return !agendamentoRepository.existsByDataAndHoraAndDiaSemanaAndCategoriaAndStatusNot(
                data, hora, dia, categoria, "CANCELADO");
    }

    public Optional<Agendamento> findAgendamentoByDataHoraDiaCategoria(
        LocalDate data, LocalTime hora, String diaSemana, String categoria) {
        String dia = DiaSemana.from(diaSemana).getValor();
        return agendamentoRepository.findByDataAndHoraAndDiaSemanaAndCategoria(data, hora, dia, categoria);
    }

    public boolean podeAgendar15Dias(String saram, LocalDate dataNova) {
        return agendamentoRepository.findUltimoAgendamentoBySaram(saram)
                .map(ultimo -> ChronoUnit.DAYS.between(ultimo.getData(), dataNova) >= 15)
                .orElse(true);
    }

    public boolean podeAgendarDataHora(LocalDate data, LocalTime hora) {
        LocalDateTime agendamentoDateTime = LocalDateTime.of(data, hora);
        LocalDateTime agora = ZonedDateTime.now(ZONE_ID_SAO_PAULO)
            .withSecond(0)
            .withNano(0)
            .toLocalDateTime();
        logger.debug("🌍 Zone ID do backend: {}", ZONE_ID_SAO_PAULO);
        logger.debug("⏱️ [DEBUG] Data/Hora do agendamento: {}", agendamentoDateTime);
        logger.debug("⏱️ [DEBUG] Data/Hora atual (ajustada): {}", agora);
    
        // Permitir agendamentos com pelo menos 30 minutos de antecedência
        if (agendamentoDateTime.minusMinutes(30).isBefore(agora)) {
            return false;
        }

        // Permitir agendamentos no mesmo minuto ou posterior
        return !agendamentoDateTime.isBefore(agora);
    }

    public boolean isAgendamentoPassado(Agendamento agendamento) {
        ZonedDateTime agora = ZonedDateTime.now(ZONE_ID_SAO_PAULO);
        LocalDate dataAtual = agora.toLocalDate();
        LocalTime horaAtual = agora.toLocalTime();
    
        if (agendamento.getData().isBefore(dataAtual)) {
            return true;
        }
    
        return agendamento.getData().isEqual(dataAtual) && agendamento.getHora().isBefore(horaAtual);
    }

    public List<Agendamento> findAgendamentosByPeriodo(LocalDate dataInicio, LocalTime horaInicio, LocalDate dataFim, LocalTime horaFim) {
        List<Agendamento> todosAgendamentos = agendamentoRepository.findAll();
    
        return todosAgendamentos.stream()
                .filter(agendamento -> {
                    LocalDate agendamentoData = agendamento.getData();
                    LocalTime agendamentoHora = agendamento.getHora();
    
                    boolean sobrepoe = (agendamentoData.isEqual(dataInicio) && agendamentoHora.isAfter(horaInicio) && agendamentoHora.isBefore(horaFim)) ||
                            (agendamentoData.isEqual(dataFim) && agendamentoHora.isAfter(horaInicio) && agendamentoHora.isBefore(horaFim)) ||
                            (agendamentoData.isAfter(dataInicio) && agendamentoData.isBefore(dataFim)) ||
                            (agendamentoData.isEqual(dataInicio) && agendamentoData.isEqual(dataFim));
    
                    return sobrepoe;
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Map<String, Map<String, Agendamento>> verificarAgendamentosEmLote(
            LocalDate data,
            String categoria,
            List<Map<String, Object>> horariosPorDia) {
        Map<String, Map<String, Agendamento>> resultado = new HashMap<>();

        for (Map<String, Object> diaMap : horariosPorDia) {
            String diaRaw = (String) diaMap.get("dia");
            String dia = DiaSemana.from(diaRaw).getValor();
            @SuppressWarnings("unchecked")
            List<String> horariosStr = (List<String>) diaMap.get("horarios");
            List<LocalTime> horarios = horariosStr.stream().map(LocalTime::parse).toList();

            List<Agendamento> agendamentos = agendamentoRepository.findByDataAndDiaSemanaAndHoraInAndCategoria(data, dia, horarios, categoria);

            Map<String, Agendamento> agendamentosPorHorario = new HashMap<>();
            for (Agendamento agendamento : agendamentos) {
                agendamentosPorHorario.put(agendamento.getHora().format(TIME_FORMATTER), agendamento);
            }
            for (String horario : horariosStr) {
                agendamentosPorHorario.putIfAbsent(horario, null);
            }
            resultado.put(dia, agendamentosPorHorario);
        }

        return resultado;
    }

    public void marcarHorarioComoIndisponivel(Agendamento agendamento) {
        String dia = DiaSemana.from(agendamento.getDiaSemana()).getValor();
        Optional<Horario> horarioOpt = horarioRepository.findByDiaAndHorarioAndCategoria(
            dia,
            agendamento.getHora(),
            agendamento.getCategoria()
        );
    
        if (horarioOpt.isPresent()) {
            Horario horario = horarioOpt.get();
            horario.setStatus(HorarioStatus.INDISPONIVEL);
            horarioRepository.save(horario);
            logger.info("✔️ Horário marcado como INDISPONIVEL: {}", horario);
        } else {
            logger.warn("⚠️ Horário não encontrado para marcar como indisponível.");
        }
    }
    
    public void marcarHorarioComoAgendado(Agendamento agendamento) {
        String dia = DiaSemana.from(agendamento.getDiaSemana()).getValor();
        Optional<Horario> horarioOpt = horarioRepository.findByDiaAndHorarioAndCategoria(
            dia,
            agendamento.getHora(),
            agendamento.getCategoria()
        );

        Horario horario = horarioOpt.orElseGet(() -> new Horario(
            dia,
            agendamento.getHora(),
            agendamento.getCategoria(),
            HorarioStatus.AGENDADO
        ));

        horario.setStatus(HorarioStatus.AGENDADO);
        horarioRepository.save(horario);
    }

    public void marcarHorarioComoDisponivel(Agendamento agendamento) {
        String dia = DiaSemana.from(agendamento.getDiaSemana()).getValor();
        Optional<Horario> horarioOpt = horarioRepository.findByDiaAndHorarioAndCategoria(
            dia,
            agendamento.getHora(),
            agendamento.getCategoria()
        );

        Horario horario = horarioOpt.orElseGet(() -> new Horario(
            dia,
            agendamento.getHora(),
            agendamento.getCategoria(),
            HorarioStatus.DISPONIVEL
        ));

        horario.setStatus(HorarioStatus.DISPONIVEL);
        horarioRepository.save(horario);
    }

    public Optional<Agendamento> atualizarAgendamento(Long id, LocalDate novaData, LocalTime novaHora, String novoDia) {
        Optional<Agendamento> agOpt = agendamentoRepository.findByIdWithMilitar(id);
        if (agOpt.isEmpty()) {
            return Optional.empty();
        }

        Agendamento agendamento = agOpt.get();
        String novoDiaNorm = DiaSemana.from(novoDia).getValor();
        String diaAtualNorm = DiaSemana.from(agendamento.getDiaSemana()).getValor();

        // Se nada mudou, apenas retorna
        if (agendamento.getData().equals(novaData)
                && agendamento.getHora().equals(novaHora)
                && diaAtualNorm.equals(novoDiaNorm)) {
            return Optional.of(agendamento);
        }

        // Verifica se novo horário já possui agendamento
        boolean ocupado = agendamentoRepository.existsForUpdate(id, novaData, novaHora, novoDiaNorm, agendamento.getCategoria());
        if (ocupado) {
            throw new IllegalArgumentException("Horário já agendado para a categoria.");
        }

        Optional<Horario> novoHorarioOpt = horarioRepository.findByDiaAndHorarioAndCategoria(
            novoDiaNorm,
            novaHora,
            agendamento.getCategoria()
        );

        if (novoHorarioOpt.isEmpty() || novoHorarioOpt.get().getStatus() != HorarioStatus.DISPONIVEL) {
            throw new IllegalArgumentException("Horário indisponível.");
        }

        // Libera horário antigo
        marcarHorarioComoDisponivel(agendamento);

        // Atualiza dados
        agendamento.setData(novaData);
        agendamento.setHora(novaHora);
        agendamento.setDiaSemana(novoDiaNorm);

        Agendamento atualizado = agendamentoRepository.save(agendamento);

        // Marca novo horário como agendado
        marcarHorarioComoAgendado(atualizado);

        return Optional.of(atualizado);
    }

    public void validarRegrasDeNegocio(Agendamento agendamento) {
        ConfiguracaoAgendamento config = configuracaoAgendamentoService.buscarConfiguracao();

        // 1. Agendamento só é permitido a partir de segunda às horárioInicio configurado
        LocalDate hoje = ZonedDateTime.now(ZONE_ID_SAO_PAULO).toLocalDate();
        LocalDate segundaDaSemana = hoje.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDateTime inicioDaSemana = LocalDateTime.of(segundaDaSemana, config.getHorarioInicio());

        if (ZonedDateTime.now(ZONE_ID_SAO_PAULO).toLocalDateTime().isBefore(inicioDaSemana)) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Agendamentos só são permitidos a partir de segunda às " +
                config.getHorarioInicio().format(TIME_FORMATTER) + "."
            );
        }

        // 2. Horários válidos somente de segunda a sexta entre horárioInicio e horárioFim configurados
        DayOfWeek dia = agendamento.getData().getDayOfWeek();
        LocalTime hora = agendamento.getHora();
        LocalTime inicio = config.getHorarioInicio();
        LocalTime fim = config.getHorarioFim();

        if (dia == DayOfWeek.SATURDAY || dia == DayOfWeek.SUNDAY) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Agendamentos são permitidos apenas de segunda a sexta das " +
                inicio.format(TIME_FORMATTER) + " às " + fim.format(TIME_FORMATTER) + "."
            );
        }

        LocalTime limiteInicial = inicio.plusMinutes(10);
        LocalTime limiteFinal = fim.minusMinutes(30);

        if (hora.isBefore(limiteInicial) || hora.isAfter(limiteFinal)) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "FORA_DA_JANELA_PERMITIDA");
        }

        // bloqueia agendamentos em datas/horas já passadas
        if (!podeAgendarDataHora(agendamento.getData(), agendamento.getHora())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Não é possível agendar horários passados.");
        }

        LocalDateTime agendamentoDateTime = LocalDateTime.of(agendamento.getData(), agendamento.getHora());
        if (agendamentoDateTime.isBefore(ZonedDateTime.now(ZONE_ID_SAO_PAULO).plusMinutes(30).toLocalDateTime())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "O agendamento deve ser feito com pelo menos 30 minutos de antecedência."
            );
        }
    
        
        
        if (!podeAgendar15Dias(agendamento.getMilitar().getSaram(), agendamento.getData())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Você só pode agendar novamente após 15 dias do último corte."
            );
        }
        
    
        String dia = DiaSemana.from(agendamento.getDiaSemana()).getValor();
        agendamento.setDiaSemana(dia);
        boolean jaExiste = agendamentoRepository.existsByDataAndHoraAndDiaSemanaAndCategoriaAndStatusNot(
            agendamento.getData(),
            agendamento.getHora(),
            dia,
            agendamento.getCategoria(),
            "CANCELADO");
    
        if (jaExiste) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Este horário já está agendado.");
        }
    }
    

}

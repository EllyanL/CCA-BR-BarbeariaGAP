package intraer.ccabr.barbearia_api.services;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import intraer.ccabr.barbearia_api.enums.HorarioStatus;
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

    @Transactional
    public Agendamento saveAgendamento(Agendamento agendamento) {
        Militar militar = agendamento.getMilitar();
        if (militar != null) {
            agendamento.setMilitar(militar);
        }
        return agendamentoRepository.save(agendamento);
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
            agendamento.setStatus("CANCELADO");
            agendamento.setCanceladoPor(canceladoPor);
            agendamentoRepository.save(agendamento);
            marcarHorarioComoDisponivel(agendamento);
        });
    }

    public boolean isAgendamentoDisponivel(LocalDate data, LocalTime hora, String diaSemana, String categoria) {
        // Considera apenas agendamentos cujo status seja diferente de 'CANCELADO'
        return !agendamentoRepository.existsByDataAndHoraAndDiaSemanaAndCategoriaAndStatusNot(
                data, hora, diaSemana, categoria, "CANCELADO");
    }

    public Optional<Agendamento> findAgendamentoByDataHoraDiaCategoria(
        LocalDate data, LocalTime hora, String diaSemana, String categoria) {
        return agendamentoRepository.findByDataAndHoraAndDiaSemanaAndCategoria(data, hora, diaSemana, categoria);
    }

    public boolean podeAgendar15Dias(String saram, LocalDate dataNova) {
        return agendamentoRepository.findUltimoAgendamentoBySaram(saram)
                .map(ultimo -> "CANCELADO".equals(ultimo.getStatus()) ||
                        ChronoUnit.DAYS.between(ultimo.getData(), dataNova) >= 15)
                .orElse(true);
    }

    public boolean podeAgendarDataHora(LocalDate data, LocalTime hora) {
        LocalDateTime agendamentoDateTime = LocalDateTime.of(data, hora);
        LocalDateTime agora = LocalDateTime.now().withSecond(0).withNano(0);
        logger.debug("🌍 Zone ID do backend: {}", ZoneId.systemDefault());
        logger.debug("⏱️ [DEBUG] Data/Hora do agendamento: {}", agendamentoDateTime);
        logger.debug("⏱️ [DEBUG] Data/Hora atual (ajustada): {}", agora);
    
        // Permitir agendamentos no mesmo minuto ou posterior
        return !agendamentoDateTime.isBefore(agora);
    }    

    public boolean isAgendamentoPassado(Agendamento agendamento) {
        LocalDate dataAtual = LocalDate.now();
        LocalTime horaAtual = LocalTime.now();  
    
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
            String dia = (String) diaMap.get("dia");
            @SuppressWarnings("unchecked")
            List<String> horarios = (List<String>) diaMap.get("horarios");

            List<Agendamento> agendamentos = agendamentoRepository.findByDataAndDiaSemanaAndHoraInAndCategoria(data, dia, horarios, categoria);

            Map<String, Agendamento> agendamentosPorHorario = new HashMap<>();
            for (Agendamento agendamento : agendamentos) {
                agendamentosPorHorario.put(agendamento.getHora().format(TIME_FORMATTER), agendamento);
            }
            for (String horario : horarios) {
                agendamentosPorHorario.putIfAbsent(horario, null);
            }
            resultado.put(dia, agendamentosPorHorario);
        }

        return resultado;
    }

    public void marcarHorarioComoIndisponivel(Agendamento agendamento) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm");
        String horaFormatada = agendamento.getHora().format(formatter);
    
        Optional<Horario> horarioOpt = horarioRepository.findByDiaAndHorarioAndCategoria(
            agendamento.getDiaSemana(),
            horaFormatada,
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
        String horaFormatada = agendamento.getHora().format(DateTimeFormatter.ofPattern("HH:mm"));
        Optional<Horario> horarioOpt = horarioRepository.findByDiaAndHorarioAndCategoria(
            agendamento.getDiaSemana(),
            horaFormatada,
            agendamento.getCategoria()
        );

        Horario horario = horarioOpt.orElseGet(() -> new Horario(
            agendamento.getDiaSemana(),
            horaFormatada,
            agendamento.getCategoria(),
            HorarioStatus.AGENDADO
        ));

        horario.setStatus(HorarioStatus.AGENDADO);
        horarioRepository.save(horario);
    }

    public void marcarHorarioComoDisponivel(Agendamento agendamento) {
        String horaFormatada = agendamento.getHora().format(DateTimeFormatter.ofPattern("HH:mm"));
        Optional<Horario> horarioOpt = horarioRepository.findByDiaAndHorarioAndCategoria(
            agendamento.getDiaSemana(),
            horaFormatada,
            agendamento.getCategoria()
        );

        Horario horario = horarioOpt.orElseGet(() -> new Horario(
            agendamento.getDiaSemana(),
            horaFormatada,
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

        // Se nada mudou, apenas retorna
        if (agendamento.getData().equals(novaData)
                && agendamento.getHora().equals(novaHora)
                && agendamento.getDiaSemana().equalsIgnoreCase(novoDia)) {
            return Optional.of(agendamento);
        }

        // Verifica se novo horário já possui agendamento
        boolean ocupado = agendamentoRepository.existsForUpdate(id, novaData, novaHora, novoDia, agendamento.getCategoria());
        if (ocupado) {
            throw new IllegalArgumentException("Horário já agendado para a categoria.");
        }

        String horaFormatada = novaHora.format(DateTimeFormatter.ofPattern("HH:mm"));
        Optional<Horario> novoHorarioOpt = horarioRepository.findByDiaAndHorarioAndCategoria(
            novoDia,
            horaFormatada,
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
        agendamento.setDiaSemana(novoDia);

        Agendamento atualizado = agendamentoRepository.save(agendamento);

        // Marca novo horário como agendado
        marcarHorarioComoAgendado(atualizado);

        return Optional.of(atualizado);
    }

    public void validarRegrasDeNegocio(Agendamento agendamento) {
        ConfiguracaoAgendamento config = configuracaoAgendamentoService.buscarConfiguracao();

        // 1. Agendamento só é permitido a partir de segunda às horárioInicio configurado
        LocalDate hoje = LocalDate.now();
        LocalDate segundaDaSemana = hoje.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDateTime inicioDaSemana = LocalDateTime.of(segundaDaSemana, config.getHorarioInicio());

        if (LocalDateTime.now().isBefore(inicioDaSemana)) {
            throw new IllegalArgumentException(
                "Agendamentos só são permitidos a partir de segunda às " +
                config.getHorarioInicio().format(TIME_FORMATTER) + ".");
        }

        // 2. Horários válidos somente de segunda a sexta entre horárioInicio e horárioFim configurados
        DayOfWeek dia = agendamento.getData().getDayOfWeek();
        LocalTime hora = agendamento.getHora();
        LocalTime inicio = config.getHorarioInicio();
        LocalTime fim = config.getHorarioFim();

        if (dia == DayOfWeek.SATURDAY || dia == DayOfWeek.SUNDAY || hora.isBefore(inicio) || hora.isAfter(fim)) {
            throw new IllegalArgumentException(
                "Agendamentos são permitidos apenas de segunda a sexta das " +
                inicio.format(TIME_FORMATTER) + " às " + fim.format(TIME_FORMATTER) + ".");
        }

        // bloqueia agendamentos em datas/horas já passadas
        if (!podeAgendarDataHora(agendamento.getData(), agendamento.getHora())) {
            throw new IllegalArgumentException("Não é possível agendar horários passados.");
        }

        LocalDateTime agendamentoDateTime = LocalDateTime.of(agendamento.getData(), agendamento.getHora());
        if (agendamentoDateTime.isBefore(LocalDateTime.now().plusMinutes(15))) {
            throw new IllegalArgumentException("O agendamento deve ser feito com pelo menos 15 minutos de antecedência.");
        }
    
        
        
        if (!podeAgendar15Dias(agendamento.getMilitar().getSaram(), agendamento.getData())) {
            throw new IllegalArgumentException("Você só pode agendar uma vez a cada 15 dias.");
        }
        
    
        boolean jaExiste = agendamentoRepository.existsByDataAndHoraAndDiaSemanaAndCategoriaAndStatusNot(
            agendamento.getData(),
            agendamento.getHora(),
            agendamento.getDiaSemana(),
            agendamento.getCategoria(),
            "CANCELADO");
    
        if (jaExiste) {
            throw new IllegalArgumentException("Este horário já está agendado.");
        }
    }
    

}

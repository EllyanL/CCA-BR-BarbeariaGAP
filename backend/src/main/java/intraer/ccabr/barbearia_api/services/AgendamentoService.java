package intraer.ccabr.barbearia_api.services;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
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
import intraer.ccabr.barbearia_api.repositories.AgendamentoRepository;
import intraer.ccabr.barbearia_api.repositories.HorarioRepository;

@Service
@Transactional
public class AgendamentoService {

    private static final Logger logger = LoggerFactory.getLogger(AgendamentoService.class);

    private final AgendamentoRepository agendamentoRepository;

    private final HorarioRepository horarioRepository;

    public AgendamentoService(AgendamentoRepository agendamentoRepository, HorarioRepository horarioRepository) {
        this.agendamentoRepository = agendamentoRepository;
        this.horarioRepository = horarioRepository;
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
        return agendamentoRepository.findAll();
    }

    public Optional<Agendamento> findById(Long id) {
        return agendamentoRepository.findById(id);
    }

    @Transactional
    public void delete(Long id) {
        agendamentoRepository.findById(id).ifPresent(agendamentoRepository::delete);
    }

    public boolean isAgendamentoDisponivel(LocalDate data, LocalTime hora, String diaSemana, String categoria) {
        return !agendamentoRepository.existsByDataAndHoraAndDiaSemanaAndCategoria(data, hora, diaSemana, categoria);
    }

    public Optional<Agendamento> findAgendamentoByDataHoraDiaCategoria(
        LocalDate data, LocalTime hora, String diaSemana, String categoria) {
        return agendamentoRepository.findByDataAndHoraAndDiaSemanaAndCategoria(data, hora, diaSemana, categoria);
    }

    public boolean podeAgendar15Dias(String saram) {
        LocalDate hoje = LocalDate.now();
        LocalDate quinzeDiasAtras = hoje.minusDays(15);
    
        Optional<Agendamento> ultimoAgendamentoOpt = agendamentoRepository.findUltimoAgendamentoBySaram(saram);
    
        if (ultimoAgendamentoOpt.isPresent()) {
            Agendamento ultimoAgendamento = ultimoAgendamentoOpt.get();
            return ultimoAgendamento.getData().isBefore(quinzeDiasAtras);
        }
        return true;
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

        if (horarioOpt.isPresent()) {
            Horario horario = horarioOpt.get();
            horario.setStatus(HorarioStatus.AGENDADO); // Enum corretamente usado
            horarioRepository.save(horario);
        } else {
            logger.warn("⚠️ Horário não encontrado para marcação como AGENDADO: {} {} {}",
                agendamento.getDiaSemana(), horaFormatada, agendamento.getCategoria());
        }
    }

    public void marcarHorarioComoDisponivel(Agendamento agendamento) {
        String horaFormatada = agendamento.getHora().format(DateTimeFormatter.ofPattern("HH:mm"));
        Optional<Horario> horarioOpt = horarioRepository.findByDiaAndHorarioAndCategoria(
            agendamento.getDiaSemana(),
            horaFormatada,
            agendamento.getCategoria()
        );

        if (horarioOpt.isPresent()) {
            Horario horario = horarioOpt.get();
            horario.setStatus(HorarioStatus.DISPONIVEL);
            horarioRepository.save(horario);
        } else {
            logger.warn("⚠️ Horário não encontrado para marcação como DISPONIVEL: {} {} {}",
                agendamento.getDiaSemana(), horaFormatada, agendamento.getCategoria());
        }
    }

    public Optional<Agendamento> atualizarAgendamento(Long id, LocalDate novaData, LocalTime novaHora, String novoDia) {
        Optional<Agendamento> agOpt = agendamentoRepository.findById(id);
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
        // 1. Agendamento só é permitido a partir de segunda às 09:10
        LocalDate hoje = LocalDate.now();
        LocalDate segundaDaSemana = hoje.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDateTime inicioDaSemana = LocalDateTime.of(segundaDaSemana, LocalTime.of(9, 10));

        if (LocalDateTime.now().isBefore(inicioDaSemana)) {
            throw new IllegalArgumentException("Agendamentos só são permitidos a partir de segunda às 09:10.");
        }

        // bloqueia agendamentos em datas/horas já passadas
        if (!podeAgendarDataHora(agendamento.getData(), agendamento.getHora())) {
            throw new IllegalArgumentException("Não é possível agendar horários passados.");
        }
    
        
        
        if (!podeAgendar15Dias(agendamento.getMilitar().getSaram())) {
            throw new IllegalArgumentException("Você só pode agendar uma vez a cada 15 dias.");
        }
        
    
        boolean jaExiste = agendamentoRepository.existsByDataAndHoraAndDiaSemanaAndCategoria(
            agendamento.getData(), agendamento.getHora(), agendamento.getDiaSemana(), agendamento.getCategoria());
    
        if (jaExiste) {
            throw new IllegalArgumentException("Este horário já está agendado.");
        }
    }
    

}

package intraer.ccabr.barbearia_api.services;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
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
import intraer.ccabr.barbearia_api.repositories.MilitarRepository;
import intraer.ccabr.barbearia_api.services.ConfiguracaoAgendamentoService;
import intraer.ccabr.barbearia_api.util.HoraUtil;

@Service
@Transactional
public class AgendamentoService {

    private static final Logger logger = LoggerFactory.getLogger(AgendamentoService.class);

    private final AgendamentoRepository agendamentoRepository;

    private final HorarioRepository horarioRepository;

    private final ConfiguracaoAgendamentoService configuracaoAgendamentoService;

    private final MilitarRepository militarRepository;

    public AgendamentoService(AgendamentoRepository agendamentoRepository,
                              HorarioRepository horarioRepository,
                              ConfiguracaoAgendamentoService configuracaoAgendamentoService,
                              MilitarRepository militarRepository) {
        this.agendamentoRepository = agendamentoRepository;
        this.horarioRepository = horarioRepository;
        this.configuracaoAgendamentoService = configuracaoAgendamentoService;
        this.militarRepository = militarRepository;
    }

    private static final ZoneId ZONE_ID_SAO_PAULO = ZoneId.of("America/Sao_Paulo");
    private static final long ANTECEDENCIA_PADRAO_MINUTOS = 30L;
    private static final long ANTECEDENCIA_PRIMEIRO_HORARIO_MINUTOS = 15L;
    private static final String MSG_ANTECEDENCIA_PADRAO =
        "O agendamento deve ser feito com pelo menos 30 minutos de antecedência.";
    private static final String MSG_ANTECEDENCIA_PRIMEIRO_HORARIO =
        "O primeiro horário do dia fica disponível 15 minutos antes do início configurado.";

    protected ZonedDateTime agora() {
        return ZonedDateTime.now(ZONE_ID_SAO_PAULO);
    }

    @Transactional
    public Agendamento saveAgendamento(Agendamento agendamento) {
        Militar militar = agendamento.getMilitar();
        if (militar != null) {
            agendamento.setMilitar(militar);
        }
        String dia = DiaSemana.from(agendamento.getDiaSemana()).getValor();
        agendamento.setDiaSemana(dia);
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
            LocalDateTime agendamentoDateTime = LocalDateTime.of(agendamento.getData(), agendamento.getHora());
            boolean isAdmin = "ADMIN".equalsIgnoreCase(canceladoPor);

            if (!isAdmin) {
                LocalDateTime limiteCancelamento = agora()
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

    public Militar buscarMilitarPorCpf(String cpf) {
        return militarRepository.findByCpf(cpf)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Militar não encontrado."));
    }

    public void verificarHorarioDisponivel(LocalDate data, String dia, LocalTime hora, String categoria) {
        Optional<Horario> horarioOpt = horarioRepository.findByDiaAndHorarioAndCategoria(dia, hora, categoria);
        if (horarioOpt.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "O horário selecionado não está disponível para a categoria informada.");
        }

        Horario horario = horarioOpt.get();
        if (horario.getStatus() != HorarioStatus.DISPONIVEL) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "O horário selecionado já está ocupado ou indisponível.");
        }

        boolean ocupado = agendamentoRepository.existsByDataAndHoraAndDiaSemanaAndCategoriaAndStatusNot(
            data,
            hora,
            dia,
            categoria,
            "CANCELADO"
        );
        if (ocupado) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "O horário selecionado já está ocupado para esta data.");
        }
    }

    public void checarDuplicidade(LocalDate data, LocalTime hora, String dia, String categoria) {
        boolean jaExiste = agendamentoRepository.existsByDataAndHoraAndDiaSemanaAndCategoriaAndStatusNot(
            data,
            hora,
            dia,
            categoria,
            "CANCELADO"
        );

        if (jaExiste) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe um agendamento para esse horário.");
        }
    }

    public List<Agendamento> findByMilitarCpfAndCategoriaAndDataAfter(String cpf, String categoria, LocalDate data) {
        return agendamentoRepository.findByMilitarCpfAndCategoriaAndDataAfter(cpf, categoria, data);
    }

    public boolean podeAgendar15Dias(String saram, LocalDate dataNova) {
        return agendamentoRepository.findUltimoAgendamentoBySaram(saram)
                .map(ultimo -> ChronoUnit.DAYS.between(ultimo.getData(), dataNova) >= 15)
                .orElse(true);
    }

    public boolean podeAgendarDataHora(LocalDate data, LocalTime hora, String categoria) {
        LocalDateTime agendamentoDateTime = LocalDateTime.of(data, hora);
        LocalDateTime agora = agora()
            .withSecond(0)
            .withNano(0)
            .toLocalDateTime();

        logger.debug("🌍 Zone ID do backend: {}", ZONE_ID_SAO_PAULO);
        logger.debug("⏱️ [DEBUG] Data/Hora do agendamento: {}", agendamentoDateTime);
        logger.debug("⏱️ [DEBUG] Data/Hora atual (ajustada): {}", agora);

        if (agendamentoDateTime.isBefore(agora)) {
            logger.debug("⛔ Horário de agendamento já passou: {}", agendamentoDateTime);
            return false;
        }

        ConfiguracaoAgendamento configuracao = configuracaoAgendamentoService.buscarConfiguracao();
        boolean diaAgendamentoEhSegunda = agendamentoDateTime.getDayOfWeek() == DayOfWeek.MONDAY;
        boolean excecaoPrimeiroHorarioDoDia = isPrimeiroHorarioDoDia(data, hora, configuracao, categoria);

        if (excecaoPrimeiroHorarioDoDia) {
            boolean mesmoDia = agendamentoDateTime.toLocalDate().isEqual(agora.toLocalDate());
            if (mesmoDia) {
                LocalDateTime aberturaPrimeiroHorario = agendamentoDateTime.minusMinutes(ANTECEDENCIA_PRIMEIRO_HORARIO_MINUTOS);
                if (agora.isBefore(aberturaPrimeiroHorario)) {
                    logger.debug(
                        "⏳ Primeiro horário ainda não liberado: abertura {} | agora {}",
                        aberturaPrimeiroHorario,
                        agora
                    );
                    return false;
                }
            }
            if (diaAgendamentoEhSegunda) {
                logger.debug(
                    "✅ Segunda-feira e primeiro horário: antecedência padrão desconsiderada para {}",
                    agendamentoDateTime
                );
            }
            return true;
        }

        LocalDateTime limiteAntecedencia = agendamentoDateTime.minusMinutes(ANTECEDENCIA_PADRAO_MINUTOS);
        if (agora.isAfter(limiteAntecedencia)) {
            logger.debug(
                "⏳ Antecedência mínima não respeitada: limite {} | agora {}",
                limiteAntecedencia,
                agora
            );
            return false;
        }

        return true;
    }

    private boolean isPrimeiroHorarioDoDia(
        LocalDate data,
        LocalTime hora,
        ConfiguracaoAgendamento configuracao,
        String categoria
    ) {
        if (data == null || hora == null) {
            return false;
        }

        LocalTime horarioReferencia = configuracao != null ? configuracao.getHorarioInicio() : null;

        if (categoria != null && !categoria.isBlank()) {
            DiaSemana diaSemana = DiaSemana.from(data.getDayOfWeek());
            horarioReferencia = horarioRepository
                .findByDiaAndCategoriaOrderByHorarioAsc(diaSemana.getValor(), categoria)
                .stream()
                .map(Horario::getHorario)
                .findFirst()
                .orElse(horarioReferencia);
        }

        if (horarioReferencia == null) {
            return false;
        }

        return hora.truncatedTo(ChronoUnit.MINUTES)
            .equals(horarioReferencia.truncatedTo(ChronoUnit.MINUTES));
    }

    public boolean isAgendamentoPassado(Agendamento agendamento) {
        ZonedDateTime agoraAtual = agora();
        LocalDate dataAtual = agoraAtual.toLocalDate();
        LocalTime horaAtual = agoraAtual.toLocalTime();

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
                agendamentosPorHorario.put(HoraUtil.format(agendamento.getHora()), agendamento);
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
        logger.debug("Horário {} às {} mantido como grade base para o agendamento {}.",
                agendamento.getDiaSemana(),
                agendamento.getHora(),
                agendamento.getId());
    }

    public void marcarHorarioComoDisponivel(Agendamento agendamento) {
        logger.debug("Horário {} às {} permanece disponível na grade base após atualização do agendamento {}.",
                agendamento.getDiaSemana(),
                agendamento.getHora(),
                agendamento.getId());
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

        ZonedDateTime agoraZoned = agora();
        LocalDate hoje = agoraZoned.toLocalDate();
        LocalDate segundaDaSemana = hoje.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDateTime inicioDaSemana = LocalDateTime.of(segundaDaSemana, config.getHorarioInicio());
        LocalDateTime agoraDateTime = agoraZoned.toLocalDateTime();

        boolean excecaoPrimeiroHorarioDoDia = isPrimeiroHorarioDoDia(
            agendamento.getData(),
            agendamento.getHora(),
            config,
            agendamento.getCategoria()
        );

        if (agoraDateTime.isBefore(inicioDaSemana)) {
            LocalDateTime limiteExcecao = inicioDaSemana.minusMinutes(ANTECEDENCIA_PRIMEIRO_HORARIO_MINUTOS);
            boolean dentroDaJanelaExcecao = excecaoPrimeiroHorarioDoDia && !agoraDateTime.isBefore(limiteExcecao);

            if (!dentroDaJanelaExcecao) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Agendamentos só são permitidos a partir de segunda às " +
                    HoraUtil.format(config.getHorarioInicio()) + "."
                );
            }
        }

        // 2. Horários válidos somente de segunda a sexta entre horárioInicio e horárioFim configurados
        DayOfWeek diaSemana = agendamento.getData().getDayOfWeek();
        LocalTime hora = agendamento.getHora();
        LocalTime inicio = config.getHorarioInicio();
        LocalTime fim = config.getHorarioFim();

        if (diaSemana == DayOfWeek.SATURDAY || diaSemana == DayOfWeek.SUNDAY) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Agendamentos são permitidos apenas de segunda a sexta das " +
                HoraUtil.format(inicio) + " às " + HoraUtil.format(fim) + "."
            );
        }

        LocalTime limiteInicial = inicio.plusMinutes(10);
        LocalTime limiteFinal = fim.minusMinutes(30);

        boolean antesDoInicio = hora.isBefore(limiteInicial);
        boolean depoisDoFim = hora.isAfter(limiteFinal);

        if ((antesDoInicio && !(excecaoPrimeiroHorarioDoDia && hora.equals(inicio))) || depoisDoFim) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "FORA_DA_JANELA_PERMITIDA");
        }

        // bloqueia agendamentos em datas/horas já passadas
        boolean podeAgendar = podeAgendarDataHora(
            agendamento.getData(),
            agendamento.getHora(),
            agendamento.getCategoria()
        );
        LocalDateTime agendamentoDateTime = LocalDateTime.of(agendamento.getData(), agendamento.getHora());

        if (!podeAgendar) {
            if (agendamentoDateTime.isBefore(agoraDateTime)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Não é possível agendar horários passados.");
            }

            if (excecaoPrimeiroHorarioDoDia) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, MSG_ANTECEDENCIA_PRIMEIRO_HORARIO);
            }

            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, MSG_ANTECEDENCIA_PADRAO);
        }

        if (!excecaoPrimeiroHorarioDoDia
            && agendamentoDateTime.isBefore(agoraDateTime.plusMinutes(ANTECEDENCIA_PADRAO_MINUTOS))) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                MSG_ANTECEDENCIA_PADRAO
            );
        }
    
        
        
        if (!podeAgendar15Dias(agendamento.getMilitar().getSaram(), agendamento.getData())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Você só pode agendar novamente após 15 dias do último corte."
            );
        }
        
    
        String diaString = DiaSemana.from(diaSemana).getValor();
        agendamento.setDiaSemana(diaString);
    }
    

}

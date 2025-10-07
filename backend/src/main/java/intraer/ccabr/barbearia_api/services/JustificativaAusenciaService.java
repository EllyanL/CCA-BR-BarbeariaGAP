package intraer.ccabr.barbearia_api.services;

import intraer.ccabr.barbearia_api.enums.JustificativaStatus;
import intraer.ccabr.barbearia_api.models.Agendamento;
import intraer.ccabr.barbearia_api.models.JustificativaAusencia;
import intraer.ccabr.barbearia_api.models.Militar;
import intraer.ccabr.barbearia_api.repositories.AgendamentoRepository;
import intraer.ccabr.barbearia_api.repositories.JustificativaAusenciaRepository;
import intraer.ccabr.barbearia_api.repositories.MilitarRepository;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class JustificativaAusenciaService {

    private final JustificativaAusenciaRepository repository;
    private final AgendamentoRepository agendamentoRepository;
    private final MilitarRepository militarRepository;
    private final AgendamentoService agendamentoService;

    public JustificativaAusenciaService(JustificativaAusenciaRepository repository,
                                        AgendamentoRepository agendamentoRepository,
                                        MilitarRepository militarRepository,
                                        AgendamentoService agendamentoService) {
        this.repository = repository;
        this.agendamentoRepository = agendamentoRepository;
        this.militarRepository = militarRepository;
        this.agendamentoService = agendamentoService;
    }

    @Transactional
    public JustificativaAusencia solicitarJustificativa(Militar solicitante, Long agendamentoId, String justificativaTexto) {
        Agendamento agendamento = agendamentoRepository.findByIdWithMilitar(agendamentoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agendamento não encontrado."));

        if (!agendamento.getMilitar().getId().equals(solicitante.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Você só pode justificar seus próprios agendamentos.");
        }

        String textoNormalizado = justificativaTexto != null ? justificativaTexto.trim() : "";
        if (textoNormalizado.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O motivo da ausência é obrigatório.");
        }

        LocalDateTime agora = LocalDateTime.now();
        LocalDate dataAgendamento = agendamento.getData();
        LocalDateTime dataHoraAgendamento = LocalDateTime.of(agendamento.getData(), agendamento.getHora());

        if (agora.isBefore(dataHoraAgendamento)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "A justificativa só pode ser enviada após o horário do agendamento.");
        }

        if (agora.toLocalDate().isAfter(dataAgendamento.plusDays(3))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "O prazo para justificar este agendamento expirou.");
        }

        if ("CANCELADO".equalsIgnoreCase(agendamento.getStatus()) ||
                "ADMIN_CANCELADO".equalsIgnoreCase(agendamento.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Agendamentos cancelados não podem receber justificativa de ausência.");
        }

        Optional<JustificativaAusencia> existenteOpt = repository.findByAgendamentoId(agendamentoId);
        if (existenteOpt.isPresent()) {
            JustificativaAusencia existente = existenteOpt.get();
            if (existente.getStatus() == JustificativaStatus.RECUSADO) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Já existe uma justificativa para este agendamento com status RECUSADO.");
            }
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Já existe uma justificativa registrada para este agendamento.");
        }

        JustificativaAusencia justificativa = JustificativaAusencia.builder()
                .agendamento(agendamento)
                .militar(solicitante)
                .status(JustificativaStatus.AGUARDANDO)
                .justificativa(textoNormalizado)
                .dataSolicitacao(agora)
                .build();

        return repository.save(justificativa);
    }

    @Transactional
    public JustificativaAusencia aprovar(Long justificativaId, Militar admin) {
        JustificativaAusencia justificativa = repository.findById(justificativaId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Justificativa não encontrada."));

        if (justificativa.getStatus() != JustificativaStatus.AGUARDANDO) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A solicitação já foi analisada.");
        }

        justificativa.setStatus(JustificativaStatus.APROVADO);
        justificativa.setDataResposta(LocalDateTime.now());
        justificativa.setAvaliadoPorPostoGrad(admin.getPostoGrad());
        justificativa.setAvaliadoPorNomeGuerra(admin.getNomeDeGuerra());

        Agendamento agendamento = justificativa.getAgendamento();
        if (agendamento != null) {
            agendamento.setStatus("REAGENDADO");
            agendamentoService.marcarHorarioComoIndisponivel(agendamento);
            agendamentoRepository.save(agendamento);
        }

        Militar militar = justificativa.getMilitar();
        militar.setUltimoAgendamento(LocalDate.now());
        militarRepository.save(militar);

        return repository.save(justificativa);
    }

    @Transactional
    public JustificativaAusencia recusar(Long justificativaId, Militar admin) {
        JustificativaAusencia justificativa = repository.findById(justificativaId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Justificativa não encontrada."));

        if (justificativa.getStatus() != JustificativaStatus.AGUARDANDO) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A solicitação já foi analisada.");
        }

        justificativa.setStatus(JustificativaStatus.RECUSADO);
        justificativa.setDataResposta(LocalDateTime.now());
        justificativa.setAvaliadoPorPostoGrad(admin.getPostoGrad());
        justificativa.setAvaliadoPorNomeGuerra(admin.getNomeDeGuerra());

        return repository.save(justificativa);
    }

    @Transactional
    public JustificativaAusencia detalhar(Long justificativaId) {
        return repository.findById(justificativaId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Justificativa não encontrada."));
    }

    @Transactional
    public List<JustificativaAusencia> listarTodas() {
        return repository.findAllByOrderByDataSolicitacaoDesc();
    }

    public Map<Long, JustificativaAusencia> mapearPorAgendamentos(Collection<Long> agendamentoIds) {
        if (agendamentoIds == null || agendamentoIds.isEmpty()) {
            return Map.of();
        }

        return repository.findByAgendamentoIdIn(agendamentoIds).stream()
                .collect(Collectors.toMap(j -> j.getAgendamento().getId(), j -> j));
    }
}

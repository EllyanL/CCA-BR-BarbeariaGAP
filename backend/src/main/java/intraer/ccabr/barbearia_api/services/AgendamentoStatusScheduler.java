package intraer.ccabr.barbearia_api.services;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import intraer.ccabr.barbearia_api.models.Agendamento;
import intraer.ccabr.barbearia_api.repositories.AgendamentoRepository;

/**
 * Serviço responsável por atualizar automaticamente o status dos
 * agendamentos. A cada 15 minutos todos os registros com status
 * {@code AGENDADO} são avaliados e, caso a data e a hora já tenham
 * passado, o status é alterado para {@code REALIZADO}. Agendamentos
 * cancelados não são modificados.
 */
@Service
public class AgendamentoStatusScheduler {

    private static final Logger logger = LoggerFactory.getLogger(AgendamentoStatusScheduler.class);

    private final AgendamentoRepository agendamentoRepository;

    public AgendamentoStatusScheduler(AgendamentoRepository agendamentoRepository) {
        this.agendamentoRepository = agendamentoRepository;
    }

    /**
     * Verifica periodicamente os agendamentos marcados como {@code AGENDADO}
     * e atualiza para {@code REALIZADO} quando:
     * <ul>
     *   <li>a data do agendamento for anterior à data atual; ou</li>
     *   <li>a data for hoje e a hora já tiver passado.</li>
     * </ul>
     * Agendamentos cancelados são ignorados e o campo
     * {@code canceladoPor} permanece inalterado.
     */
    @Scheduled(fixedRate = 900_000)
    @Transactional
    public void atualizarAgendamentosRealizados() {
        LocalDateTime agora = LocalDateTime.now();
        LocalDate hoje = agora.toLocalDate();
        LocalTime horaAtual = agora.toLocalTime();
        List<Agendamento> agendados = agendamentoRepository.findByStatus("AGENDADO");

        for (Agendamento ag : agendados) {
            LocalDate dataAgendamento = ag.getData();
            if (dataAgendamento.isBefore(hoje)
                    || (dataAgendamento.isEqual(hoje) && ag.getHora().isBefore(horaAtual))) {
                ag.setStatus("REALIZADO");
                agendamentoRepository.save(ag);
                logger.debug("Agendamento {} marcado como REALIZADO", ag.getId());
            }
        }
    }
}


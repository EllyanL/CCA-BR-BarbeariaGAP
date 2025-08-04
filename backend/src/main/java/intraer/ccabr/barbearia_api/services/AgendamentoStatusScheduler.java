package intraer.ccabr.barbearia_api.services;

import java.time.LocalDateTime;
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
     * Verifica periodicamente os agendamentos marcados como
     * {@code AGENDADO} e atualiza para {@code REALIZADO} quando a data e a
     * hora já estiverem no passado.
     */
    @Scheduled(fixedRate = 900_000)
    @Transactional
    public void atualizarAgendamentosRealizados() {
        LocalDateTime agora = LocalDateTime.now();
        List<Agendamento> agendados = agendamentoRepository.findByStatus("AGENDADO");

        for (Agendamento ag : agendados) {
            LocalDateTime dataHora = LocalDateTime.of(ag.getData(), ag.getHora());
            if (dataHora.isBefore(agora)) {
                ag.setStatus("REALIZADO");
                agendamentoRepository.save(ag);
                logger.debug("Agendamento {} marcado como REALIZADO", ag.getId());
            }
        }
    }
}


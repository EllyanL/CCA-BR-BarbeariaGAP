package intraer.ccabr.barbearia_api.services;

import intraer.ccabr.barbearia_api.enums.HorarioStatus;
import intraer.ccabr.barbearia_api.models.Horario;
import intraer.ccabr.barbearia_api.repositories.AgendamentoRepository;
import intraer.ccabr.barbearia_api.repositories.HorarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class HorarioDisponibilidadeScheduler {

    private static final Logger logger = LoggerFactory.getLogger(HorarioDisponibilidadeScheduler.class);

    private final HorarioRepository horarioRepository;
    private final AgendamentoRepository agendamentoRepository;

    public HorarioDisponibilidadeScheduler(HorarioRepository horarioRepository,
                                           AgendamentoRepository agendamentoRepository) {
        this.horarioRepository = horarioRepository;
        this.agendamentoRepository = agendamentoRepository;
    }

    @Scheduled(cron = "0 0 0 * * MON")
    @Transactional
    public void resetarDisponibilidadeSemanal() {
        List<Horario> horarios = horarioRepository.findAll();
        if (horarios.isEmpty()) {
            logger.info("Nenhum horário cadastrado para reset semanal de disponibilidade.");
            return;
        }

        int atualizados = 0;
        for (Horario horario : horarios) {
            boolean possuiAgendamentoAtivo = agendamentoRepository.existsByHoraAndDiaSemanaAndCategoria(
                    horario.getHorario(),
                    horario.getDia(),
                    horario.getCategoria()
            );

            HorarioStatus statusEsperado = possuiAgendamentoAtivo
                    ? HorarioStatus.AGENDADO
                    : HorarioStatus.DISPONIVEL;

            if (horario.getStatus() != statusEsperado) {
                horario.setStatus(statusEsperado);
                atualizados++;
            }
        }

        if (atualizados > 0) {
            horarioRepository.saveAll(horarios);
            logger.info("Reset semanal concluído. {} de {} horários tiveram a disponibilidade ajustada.", atualizados, horarios.size());
        } else {
            logger.info("Reset semanal executado. Nenhuma atualização necessária entre {} horários avaliados.", horarios.size());
        }
    }
}

package intraer.ccabr.barbearia_api.services;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class HorarioDisponibilidadeScheduler {

    private static final Logger logger = LoggerFactory.getLogger(HorarioDisponibilidadeScheduler.class);

    private final HorarioService horarioService;

    public HorarioDisponibilidadeScheduler(HorarioService horarioService) {
        this.horarioService = horarioService;
    }

    @Scheduled(cron = "0 0 0 * * MON")
    public void resetarDisponibilidadeSemanal() {
        int atualizados = horarioService.ajustarStatusHorariosSemanaAtual();
        if (atualizados > 0) {
            logger.info("Reset semanal concluído. {} horários tiveram a disponibilidade ajustada.", atualizados);
        } else {
            logger.info("Reset semanal executado. Nenhuma atualização necessária.");
        }
    }
}

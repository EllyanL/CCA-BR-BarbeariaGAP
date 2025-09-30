package intraer.ccabr.barbearia_api.services;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.event.EventListener;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.stereotype.Component;

@Component
public class WebserviceWarmup {

    private static final Logger logger = LoggerFactory.getLogger(WebserviceWarmup.class);

    private final WebserviceService webserviceService;
    private final boolean preloadToken;

    public WebserviceWarmup(WebserviceService webserviceService,
            @Value("${webservice.preload-token:true}") boolean preloadToken) {
        this.webserviceService = webserviceService;
        this.preloadToken = preloadToken;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void warmupTokenCache() {
        if (!preloadToken) {
            logger.info("Pré-carregamento do token do webservice desativado por configuração.");
            return;
        }

        try {
            webserviceService.prepareTokenCache();
            logger.info("Cache de token do webservice preparado com sucesso durante o startup.");
        } catch (Exception ex) {
            logger.warn("Falha ao preparar o cache de token do webservice durante o startup: {}", ex.getMessage(), ex);
        }
    }
}


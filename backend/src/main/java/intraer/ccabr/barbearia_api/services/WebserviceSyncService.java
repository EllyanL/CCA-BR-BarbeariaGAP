package intraer.ccabr.barbearia_api.services;

import java.time.LocalDateTime;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import intraer.ccabr.barbearia_api.dtos.CcabrUserDto;
import intraer.ccabr.barbearia_api.enums.UserRole;
import intraer.ccabr.barbearia_api.models.Militar;
import intraer.ccabr.barbearia_api.repositories.MilitarRepository;
import intraer.ccabr.barbearia_api.services.WebserviceService;

@Service
public class WebserviceSyncService {

    private static final Logger logger = LoggerFactory.getLogger(WebserviceSyncService.class);

    private final MilitarRepository militarRepository;
    private final WebserviceService webserviceService;

    public WebserviceSyncService(MilitarRepository militarRepository, WebserviceService webserviceService) {
        this.militarRepository = militarRepository;
        this.webserviceService = webserviceService;
    }

    @Async
    @Transactional
    public void refreshMilitarAsync(String cpf) {
        militarRepository.findByCpf(cpf).ifPresentOrElse(militar -> {
            CcabrUserDto dto = webserviceService.fetchMilitarByCpf(cpf);
            if (updateMilitarFromDto(militar, dto)) {
                logger.info("Sincronização assíncrona concluída para CPF {}", cpf);
            }
        }, () -> logger.warn("Militar com CPF {} não encontrado para sincronização assíncrona", cpf));
    }

    @Scheduled(cron = "0 0 0 */7 * *")
    @Transactional
    public void syncAllUsers() {
        List<Militar> militares = militarRepository.findAll();
        int total = militares.size();
        logger.info("Iniciando sincronização de {} militares via webservice", total);
        int updated = 0;
        for (Militar militar : militares) {
            CcabrUserDto dto = webserviceService.fetchMilitarByCpf(militar.getCpf());
            if (updateMilitarFromDto(militar, dto)) {
                updated++;
            }
        }
        logger.info("Sincronização concluída. {} de {} militares atualizados", updated, total);
    }

    private boolean updateMilitarFromDto(Militar militar, CcabrUserDto dto) {
        if (dto == null) {
            logger.warn("Webservice retornou dados nulos para CPF {}", militar.getCpf());
            return false;
        }

        militar.setSaram(dto.getSaram());
        militar.setNomeCompleto(dto.getNomeCompleto());
        militar.setPostoGrad(dto.getPostoGrad());
        militar.setNomeDeGuerra(dto.getNomeDeGuerra());
        militar.setEmail(dto.getEmail());
        militar.setOm(dto.getOm());
        militar.setCpf(dto.getCpf());
        militar.setQuadro(dto.getQuadro());
        militar.setSecao(dto.getSecao());
        militar.setRamal(dto.getRamal());
        if (dto.getCategoria() != null) {
            try {
                militar.setCategoria(UserRole.valueOf(dto.getCategoria().toUpperCase()));
            } catch (IllegalArgumentException e) {
                logger.warn("Categoria desconhecida '{}' para CPF {}", dto.getCategoria(), militar.getCpf());
            }
        }
        militar.setLastWebserviceSync(LocalDateTime.now());
        militarRepository.save(militar);
        return true;
    }
}


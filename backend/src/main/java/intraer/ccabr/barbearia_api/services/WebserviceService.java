package intraer.ccabr.barbearia_api.services;

import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import intraer.ccabr.barbearia_api.dtos.CcabrUserDto;
import intraer.ccabr.barbearia_api.dtos.UserDTO;

/**
 * Serviço que encapsula as chamadas ao webservice do CCA-BR para obtenção de
 * dados de militares.
 */
@Service
public class WebserviceService {

    private static final Logger logger = LoggerFactory.getLogger(WebserviceService.class);

    private final CcabrService ccabrService;

    public WebserviceService(CcabrService ccabrService) {
        this.ccabrService = ccabrService;
    }

    /**
     * Busca os dados de um militar no webservice CCABR utilizando o CPF.
     *
     * @param cpf CPF do militar
     * @return {@link CcabrUserDto} com os dados obtidos ou {@code null} caso não
     *         seja possível recuperar as informações
     */
    public CcabrUserDto fetchMilitarByCpf(String cpf) {
        String tokenWs = ccabrService.authenticateWebService()
                .blockOptional()
                .orElseThrow(() -> new RuntimeException("Falha ao obter token do WebService"));

        UserDTO data = ccabrService.buscarMilitar(cpf, tokenWs).block();
        logger.debug("📡 Dados do WebService recebidos: {}", data);
        if (data == null) {
            return null;
        }
        CcabrUserDto dto = new CcabrUserDto();
        dto.setId(data.getId());
        dto.setSaram(data.getSaram());
        dto.setNomeCompleto(data.getNomeCompleto());
        dto.setPostoGrad(data.getPostoGrad());
        dto.setNomeDeGuerra(data.getNomeDeGuerra());
        dto.setEmail(data.getEmail());
        dto.setOm(data.getOm());
        dto.setCpf(data.getCpf());
        dto.setQuadro(data.getQuadro());
        dto.setSecao(data.getSecao());
        dto.setRamal(data.getRamal());
        dto.setCategoria(data.getCategoria());
        return dto;
    }
}

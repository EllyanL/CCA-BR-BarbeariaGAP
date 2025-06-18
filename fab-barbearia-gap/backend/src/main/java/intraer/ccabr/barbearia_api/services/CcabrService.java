package intraer.ccabr.barbearia_api.services;

import intraer.ccabr.barbearia_api.dtos.OmsResponse;
import intraer.ccabr.barbearia_api.dtos.UserDTO;

import org.springframework.beans.factory.annotation.Value;

import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;


/**
 * Serviço responsável por realizar chamadas ao webservice CCABR para autenticação,
 * busca de ordens de missão (OMS) e dados de militares.
 */
@Service
public class CcabrService {

    private static final Logger logger = LoggerFactory.getLogger(CcabrService.class);

    private final WebClient webClient;

    @Value("${webservice.username}")
    private String username;

    @Value("${webservice.password}")
    private String password;

    public CcabrService(WebClient webClient) {
        this.webClient = webClient;
    }

    public Mono<List<OmsResponse>> buscarOms() {
        return webClient.get()
                .uri("/oms")
                .retrieve()
                .onStatus(status -> status.is4xxClientError(), response ->
                        Mono.error(new RuntimeException("Erro 4xx: " + response.statusCode())))
                .onStatus(status -> status.is5xxServerError(), response ->
                        Mono.error(new RuntimeException("Erro 5xx: " + response.statusCode())))
                .bodyToMono(new ParameterizedTypeReference<List<OmsResponse>>() {})
                .doOnSubscribe(sub -> logger.info("Iniciando chamada ao endpoint /api/oms"))
                .doOnSuccess(response -> logger.debug("Resposta recebida: {}", response))
                .doOnError(error -> logger.error("Erro na chamada ao webservice: {}", error.getMessage()));
    }

    /**
     * Realiza a autenticação no webservice e retorna o token Bearer.
     *
     * @return Mono<String> contendo o token Bearer ou erro em caso de falha.
     */
    public Mono<String> authenticateWebService() {
        Map<String, String> credentials = new HashMap<>();
        credentials.put("username", username);
        credentials.put("password", password);
    
        return webClient.post()
                .uri("/login")
                .bodyValue(credentials)
                .retrieve()
                .onStatus(status -> status.is4xxClientError(), response ->
                        Mono.error(new RuntimeException("Erro 4xx na autenticação: " + response.statusCode())))
                .onStatus(status -> status.is5xxServerError(), response ->
                        Mono.error(new RuntimeException("Erro 5xx na autenticação: " + response.statusCode())))
                .bodyToMono(new ParameterizedTypeReference<Map<String, String>>() {})
                .map(response -> {
                    String token = response.get("access_token");
                    if (token == null) {
                        logger.error("Token não encontrado na resposta: {}", response);
                        throw new RuntimeException("Token (access_token) não retornado pelo webservice");
                    }
                    return token;
                })
                .doOnSubscribe(sub -> logger.info("Iniciando autenticação no webservice"))
                .doOnSuccess(token -> logger.debug("Token Bearer recebido: {}", token))
                .doOnError(error -> logger.error("Erro na autenticação do webservice: {}", error.getMessage()));
    }

    /**
     * Busca os dados do militar no webservice usando o CPF e o token Bearer.
     *
     * @param cpf O CPF do militar.
     * @param bearerToken O token Bearer para autenticação.
     * @return Mono<UserDTO> contendo os dados do militar.
     */
    public Mono<UserDTO> buscarMilitar(String cpf, String bearerToken) {
        return webClient.get()
                .uri("/militares/{cpf}", cpf)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + bearerToken)
                .retrieve()
                .onStatus(status -> status.is4xxClientError(), response ->
                        Mono.error(new RuntimeException("Erro 4xx: " + response.statusCode())))
                .onStatus(status -> status.is5xxServerError(), response ->
                        Mono.error(new RuntimeException("Erro 5xx: " + response.statusCode())))
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                .map(response -> {
                    logger.debug("Resposta completa do webservice para CPF {}: {}", cpf, response);
                    UserDTO userDTO = new UserDTO();
                    userDTO.setSaram((String) response.get("saram"));
                    userDTO.setNomeCompleto((String) response.get("nome_completo"));
                    userDTO.setPostoGrad((String) response.get("posto"));
                    userDTO.setNomeDeGuerra((String) response.get("nome_guerra"));
                    userDTO.setEmail((String) response.get("email"));
                    String omBruta = (String) response.get("organizacao");
                    userDTO.setOm(omBruta != null ? omBruta.trim().replace(" ", "-") : "Não informado");
                    userDTO.setCpf((String) response.get("cpf"));
                    userDTO.setCategoria((String) response.get("quadro"));
                    String funcao = (String) response.get("funcao");
                    String telefone = (String) response.get("telefone");
                    logger.debug("Valores brutos do webservice - funcao: {}, telefone: {}", funcao, telefone);
                    userDTO.setSecao(extractSecao(funcao));
                    userDTO.setRamal(extractRamal(telefone));
                    userDTO.setRole(mapRole((String) response.get("posto"), (String) response.get("pessfis_type")));
                    logger.debug("Valores mapeados - secao: {}, ramal: {}", userDTO.getSecao(), userDTO.getRamal());
                    return userDTO;
                })
                .doOnSubscribe(sub -> logger.info("Iniciando busca de militar para CPF: {}", cpf))
                .doOnSuccess(militar -> logger.debug("Dados do militar recebidos: {}", militar))
                .doOnError(error -> logger.error("Erro na busca do militar: {}", error.getMessage()));
    }
    
    private String extractSecao(String funcao) {
        if (funcao != null && !funcao.trim().isEmpty()) {
            String[] parts = funcao.trim().split("\\s+");
            return parts.length > 0 ? parts[parts.length - 1] : "Não informado";
        }
        return "Não informado";
    }
    
    private String extractRamal(String telefone) {
        if (telefone != null && telefone.length() >= 4) {
            return telefone.substring(telefone.length() - 4);
        }
        return "Não informado";
    }
    
    private String mapRole(String posto, String pessfisType) {
        List<String> oficiais = List.of("AP", "2T", "1T", "CP", "MJ", "TC", "CL", "BG", "MB", "TB");
        if (oficiais.contains(posto)) return "OFICIAL";
        return "GRADUADO";
    }
       

}
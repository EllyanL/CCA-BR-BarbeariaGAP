package intraer.ccabr.barbearia_api.services;

import intraer.ccabr.barbearia_api.dtos.UserDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.ExchangeFunction;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.*;

class CcabrServiceTest {

    private CcabrService service;
    private Method mapRoleMethod;

    @BeforeEach
    void setup() throws Exception {
        service = new CcabrService(WebClient.builder().build());
        mapRoleMethod = CcabrService.class.getDeclaredMethod("mapRole", String.class, String.class);
        mapRoleMethod.setAccessible(true);
    }

    private String invokeMapRole(String posto, String pessfisType) throws Exception {
        return (String) mapRoleMethod.invoke(service, posto, pessfisType);
    }

    @Test
    void shouldMapUserForCivil() throws Exception {
        assertEquals("USER", invokeMapRole("1T", "CIVIL"));
    }

    @Test
    void shouldMapUserForServidorCivil() throws Exception {
        assertEquals("USER", invokeMapRole("1T", "SERVIDOR CIVIL"));
    }

    @Test
    void shouldMapOficialByPostoEvenWithGraduadoPessfisType() throws Exception {
        assertEquals("OFICIAL", invokeMapRole("CAP", "GRADUADO"));
    }

    @Test
    void shouldMapGraduadoByPostoEvenWithOficialPessfisType() throws Exception {
        assertEquals("GRADUADO", invokeMapRole("S2", "OFICIAL"));
    }

    @Test
    void shouldMapOficialByPostoWhenPessfisTypeMissing() throws Exception {
        assertEquals("OFICIAL", invokeMapRole("1T", null));
    }

    @Test
    void shouldMapGraduadoByPostoWhenPessfisTypeMissing() throws Exception {
        assertEquals("GRADUADO", invokeMapRole("3S", null));
    }

    @Test
    void shouldThrowExceptionForUnknownPosto() {
        Exception ex = assertThrows(Exception.class, () -> invokeMapRole("XX", null));
        assertTrue(ex.getCause() instanceof IllegalArgumentException);
    }

    @Test
    void shouldUseSetorListAndTelefoneObjectWhenPresent() {
        ExchangeFunction exchangeFunction = request -> {
            String body = """
                    {
                      "saram": "1",
                      "nome_completo": "Nome",
                      "posto": "1T",
                      "nome_guerra": "NG",
                      "email": "email",
                      "organizacao": "Org",
                      "cpf": "123",
                      "quadro": "Q",
                      "funcao": "Chefe SEC ANTIGO",
                      "Setor": [
                        { "Nome": "Secao Real" }
                      ],
                      "telefone": [
                        { "numero": "6133229876", "ramal": "5432" }
                      ],
                      "pessfis_type": "OFICIAL"
                    }
                    """;
            return Mono.just(
                    ClientResponse.create(HttpStatus.OK)
                            .header("Content-Type", "application/json")
                            .body(body)
                            .build());
        };

        WebClient webClient = WebClient.builder().exchangeFunction(exchangeFunction).build();
        CcabrService service = new CcabrService(webClient);

        UserDTO dto = service.buscarMilitar("123", "token").block();

        assertEquals("Secao Real", dto.getSecao());
        assertEquals("5432", dto.getRamal());
    }

    @Test
    void shouldFallbackToExtractSecaoAndDeriveRamalWhenDataMissing() {
        ExchangeFunction exchangeFunction = request -> {
            String body = """
                    {
                      "saram": "1",
                      "nome_completo": "Nome",
                      "posto": "1T",
                      "nome_guerra": "NG",
                      "email": "email",
                      "organizacao": "Org",
                      "cpf": "123",
                      "quadro": "Q",
                      "funcao": "Chefe SEC ANTIGO",
                      "setor": [],
                      "telefone": "6133125678",
                      "pessfis_type": "OFICIAL"
                    }
                    """;
            return Mono.just(
                    ClientResponse.create(HttpStatus.OK)
                            .header("Content-Type", "application/json")
                            .body(body)
                            .build());
        };

        WebClient webClient = WebClient.builder().exchangeFunction(exchangeFunction).build();
        CcabrService service = new CcabrService(webClient);

        UserDTO dto = service.buscarMilitar("123", "token").block();

        assertEquals("ANTIGO", dto.getSecao());
        assertEquals("5678", dto.getRamal());
    }
}


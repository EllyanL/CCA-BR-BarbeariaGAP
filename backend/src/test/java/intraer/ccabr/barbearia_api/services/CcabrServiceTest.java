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
    void shouldMapOficialByPessfisType() throws Exception {
        assertEquals("OFICIAL", invokeMapRole("1T", "OFICIAL"));
    }

    @Test
    void shouldMapGraduadoByPessfisType() throws Exception {
        assertEquals("GRADUADO", invokeMapRole("S1", "GRADUADO"));
    }

    @Test
    void shouldMapUserForCivil() throws Exception {
        assertEquals("USER", invokeMapRole(null, "CIVIL"));
    }

    @Test
    void shouldMapOficialByPostoWhenPessfisTypeMissing() throws Exception {
        assertEquals("OFICIAL", invokeMapRole("1T", null));
    }

    @Test
    void shouldThrowExceptionForUnknownType() {
        Exception ex = assertThrows(Exception.class, () -> invokeMapRole("XX", "ALIEN"));
        assertTrue(ex.getCause() instanceof IllegalArgumentException);
    }

    @Test
    void shouldUseSecaoAndRamalFromResponseWhenPresent() {
        ExchangeFunction exchangeFunction = request -> {
            String body =
                    "{\"saram\":\"1\",\"nome_completo\":\"Nome\",\"posto\":\"1T\",\"nome_guerra\":\"NG\",\"email\":\"email\",\"organizacao\":\"Org\",\"cpf\":\"123\",\"quadro\":\"Q\",\"funcao\":\"Chefe SEC ANTIGO\",\"telefone\":\"55556666\",\"secao\":\"Secao Real\",\"ramal\":\"1234\",\"pessfis_type\":\"OFICIAL\"}";
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
        assertEquals("1234", dto.getRamal());
    }
}


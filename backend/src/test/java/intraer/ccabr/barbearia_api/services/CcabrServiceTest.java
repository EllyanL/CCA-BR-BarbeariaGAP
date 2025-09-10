package intraer.ccabr.barbearia_api.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.reactive.function.client.WebClient;

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
}

package intraer.ccabr.barbearia_api.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:testdb;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.datasource.driverClassName=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false",
        "api.secret.token.secret=test-secret",
        "webservice.preload-token=false"
})
class SecurityConfigurationsIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private final PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();

    @Test
    @DisplayName("Deve retornar 401 para acesso não autenticado ao dashboard")
    void whenAccessDashboardWithoutAuthentication_thenReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/dashboard/stats"))
                .andExpect(this::assertUnauthorizedOrForbidden);
        mockMvc.perform(get("/api/dashboard/recent"))
                .andExpect(this::assertUnauthorizedOrForbidden);
    }

    @Test
    @DisplayName("Deve servir a página inicial e os assets públicos do Angular")
    void whenAccessAngularStaticResources_thenReturnOk() throws Exception {
        mockMvc.perform(get("/")).andExpect(status().isOk());
        mockMvc.perform(get("/assets/images/barbearia.ico")).andExpect(status().isOk());

        Resource[] bundles = resolver.getResources("classpath:/static/main*.js");
        assertThat(bundles).isNotEmpty();
        String mainBundleName = bundles[0].getFilename();
        mockMvc.perform(get("/" + mainBundleName)).andExpect(status().isOk());
    }

    private void assertUnauthorizedOrForbidden(MvcResult result) {
        int status = result.getResponse().getStatus();
        assertThat(status)
                .withFailMessage("Status esperado 401 ou 403, mas foi %s", status)
                .isIn(HttpStatus.UNAUTHORIZED.value(), HttpStatus.FORBIDDEN.value());
    }
}


package intraer.ccabr.barbearia_api.infra.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebRoutingConfig implements WebMvcConfigurer {

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        // Rota raiz
        registry.addViewController("/{path:^(?!api|index\\.html|.*\\..*).*$}")
                .setViewName("forward:/index.html");

        // Um nível de rota (ex: /dashboard, /login)
        registry.addViewController("/{path:^(?!api|index\\.html|.*\\..*).*$}/{subpath:^(?!.*\\..*).*$}")
                .setViewName("forward:/index.html");
    }
}

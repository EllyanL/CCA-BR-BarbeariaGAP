package intraer.ccabr.barbearia_api.config;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class SpaController {

    // Redireciona todas as rotas não-API para o index.html
    @RequestMapping("/{path:[^\\.]*}")
    public String redirect() {
        // Redireciona para o index.html na pasta static
        return "forward:/index.html";
    }
}
package intraer.ccabr.barbearia_api.controllers;

import intraer.ccabr.barbearia_api.services.CcabrService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/webservice")
public class WebserviceController {

    private final CcabrService ccabrService;

    public WebserviceController(CcabrService ccabrService) {
        this.ccabrService = ccabrService;
    }

    @GetMapping("/buscarOms")
    public Mono<List<String>> consultar() {
        return ccabrService.buscarOms()
                .map(lista -> lista.stream()
                        .map(oms -> "Organização: " + oms.getNmOrg() + " (Sigla: " + oms.getSgOrg() + ")")
                        .collect(Collectors.toList()));
    }
}

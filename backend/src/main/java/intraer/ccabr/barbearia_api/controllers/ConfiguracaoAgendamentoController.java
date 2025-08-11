package intraer.ccabr.barbearia_api.controllers;

import intraer.ccabr.barbearia_api.models.ConfiguracaoAgendamento;
import intraer.ccabr.barbearia_api.services.ConfiguracaoAgendamentoService;
import org.springframework.web.bind.annotation.*;

import java.time.LocalTime;
import java.util.Map;

@RestController
@RequestMapping("/api/configuracoes")
public class ConfiguracaoAgendamentoController {

    private final ConfiguracaoAgendamentoService service;

    public ConfiguracaoAgendamentoController(ConfiguracaoAgendamentoService service) {
        this.service = service;
    }

    @GetMapping({"", "/agendamento"})
    public ConfiguracaoAgendamento buscarConfiguracao() {
        return service.buscarConfiguracao();
    }

    @PutMapping({"", "/agendamento"})
    public ConfiguracaoAgendamento atualizar(@RequestBody Map<String, String> body) {
        LocalTime inicio = LocalTime.parse(body.get("horarioInicio"));
        LocalTime fim = LocalTime.parse(body.get("horarioFim"));
        return service.atualizar(inicio, fim);
    }
}

package intraer.ccabr.barbearia_api.controllers;

import intraer.ccabr.barbearia_api.models.ConfigHorario;
import intraer.ccabr.barbearia_api.services.ConfigHorarioService;
import org.springframework.web.bind.annotation.*;

import java.time.LocalTime;
import java.util.Map;

@RestController
@RequestMapping("/api/config-horario")
public class ConfigHorarioController {

    private final ConfigHorarioService service;

    public ConfigHorarioController(ConfigHorarioService service) {
        this.service = service;
    }

    @GetMapping
    public ConfigHorario buscarConfiguracao() {
        return service.buscarConfiguracao();
    }

    @PutMapping
    public ConfigHorario atualizar(@RequestBody Map<String, String> body) {
        LocalTime inicio = LocalTime.parse(body.get("inicio"));
        LocalTime fim = LocalTime.parse(body.get("fim"));
        return service.atualizar(inicio, fim);
    }
}

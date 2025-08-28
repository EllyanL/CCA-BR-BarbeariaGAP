package intraer.ccabr.barbearia_api.controllers;

import intraer.ccabr.barbearia_api.dtos.ConfiguracaoAgendamentoRequest;
import intraer.ccabr.barbearia_api.dtos.ConfiguracaoAgendamentoResponse;
import intraer.ccabr.barbearia_api.models.ConfiguracaoAgendamento;
import intraer.ccabr.barbearia_api.services.ConfiguracaoAgendamentoService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/configuracoes")
public class ConfiguracaoAgendamentoController {

    private final ConfiguracaoAgendamentoService service;

    public ConfiguracaoAgendamentoController(ConfiguracaoAgendamentoService service) {
        this.service = service;
    }

    @GetMapping({"", "/agendamento"})
    public ResponseEntity<ConfiguracaoAgendamentoResponse> buscarConfiguracao() {
        ConfiguracaoAgendamento configuracao = service.buscarConfiguracao();
        return ResponseEntity.ok(new ConfiguracaoAgendamentoResponse(configuracao));
    }

    @PutMapping({"", "/agendamento"})
    public ResponseEntity<ConfiguracaoAgendamentoResponse> atualizar(
            @Valid @RequestBody ConfiguracaoAgendamentoRequest request) {
        ConfiguracaoAgendamento configuracao =
                service.atualizar(request.getHorarioInicio(), request.getHorarioFim());
        return ResponseEntity.ok(new ConfiguracaoAgendamentoResponse(configuracao));
    }
}

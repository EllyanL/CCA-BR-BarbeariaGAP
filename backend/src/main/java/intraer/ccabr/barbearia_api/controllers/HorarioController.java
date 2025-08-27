package intraer.ccabr.barbearia_api.controllers;

import intraer.ccabr.barbearia_api.dtos.HorarioDTO;
import intraer.ccabr.barbearia_api.enums.HorarioStatus;
import intraer.ccabr.barbearia_api.models.Horario;

import intraer.ccabr.barbearia_api.repositories.HorarioRepository;
import intraer.ccabr.barbearia_api.services.HorarioService;
import intraer.ccabr.barbearia_api.services.HorarioUpdateService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/horarios")
public class HorarioController {
    private final HorarioService horarioService;
    private final HorarioRepository horarioRepository;
    private final HorarioUpdateService horarioUpdateService;
    private static final Logger logger = LoggerFactory.getLogger(HorarioController.class);

    public HorarioController(HorarioService horarioService, HorarioRepository horarioRepository, HorarioUpdateService horarioUpdateService) {
        this.horarioService = horarioService;
        this.horarioRepository = horarioRepository;
        this.horarioUpdateService = horarioUpdateService;
    }
    @GetMapping
    public Map<String, Map<String, List<Horario>>> getTodosHorarios() {
        return horarioService.getTodosHorarios();
    }

    @GetMapping("/stream")
    public SseEmitter streamHorarios() {
        return horarioUpdateService.subscribe();
    }

    @GetMapping(params = "categoria")
    public ResponseEntity<Map<String, List<HorarioDTO>>> getHorariosSemanaPorCategoria(@RequestParam String categoria) {
        return ResponseEntity.ok(horarioService.listarHorariosAgrupadosPorCategoria(categoria));
    }
    @GetMapping("/base")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<String>> getHorariosBase() {
        return ResponseEntity.ok(horarioService.getHorariosUnicos());
    }
    @PostMapping("/adicionar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> adicionarHorarioPersonalizado(@RequestBody Map<String, String> request) {
        String horarioStr = request.get("horario");
        String dia = request.get("dia");
        String categoria = request.get("categoria");

        if (horarioStr == null || dia == null || categoria == null ||
            horarioStr.isBlank() || dia.isBlank() || categoria.isBlank()) {
            return ResponseEntity.badRequest().body("Campos obrigatórios: horario, dia, categoria.");
        }

        LocalTime hora = LocalTime.parse(horarioStr);

        if (horarioRepository.existsByDiaAndHorarioAndCategoria(dia, hora, categoria)) {
            return ResponseEntity.ok("Horário já existente, nenhuma ação realizada.");
        }

        Horario novo = new Horario(dia, hora, categoria, HorarioStatus.DISPONIVEL);
        horarioRepository.save(novo);
        HorarioDTO dto = new HorarioDTO(novo);
        horarioUpdateService.sendUpdate(dto);
        return ResponseEntity.ok(dto);
    }
    @DeleteMapping("/remover")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> removerHorarioPersonalizado(@RequestBody Map<String, String> request) {
        String horarioStr = request.get("horario");
        String dia = request.get("dia");
        String categoria = request.get("categoria");

        LocalTime hora = LocalTime.parse(horarioStr);

        boolean removido = horarioService.removerHorarioPersonalizado(dia, hora, categoria);
        horarioUpdateService.sendUpdate("refresh");
        String mensagem = removido ? "Horário removido com sucesso." : "Horário inexistente, nenhuma ação realizada.";
        return ResponseEntity.ok(mensagem);
    }
    @GetMapping("/{dia}")
    public List<Horario> getHorariosPorDiaECategoria(@PathVariable String dia, @RequestParam String categoria) {
        return horarioService.getHorariosPorDiaECategoria(dia, categoria);
    }
    @PostMapping
    public Horario salvarHorario(@RequestBody Horario horario) {
        return horarioService.salvarHorario(horario);
    }
    @PostMapping("/indisponibilizar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<HorarioDTO> indisponibilizarHorario(@RequestBody @Valid HorarioDTO horarioDTO) {
        if (horarioDTO.getDia() == null || horarioDTO.getDia().trim().isEmpty() ||
            horarioDTO.getHorario() == null || horarioDTO.getHorario().trim().isEmpty() ||
            horarioDTO.getCategoria() == null || horarioDTO.getCategoria().trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
        LocalTime hora = LocalTime.parse(horarioDTO.getHorario());
        Horario horarioIndisponibilizado = horarioService.indisponibilizarHorario(
                horarioDTO.getDia(), hora, horarioDTO.getCategoria());
        if (horarioIndisponibilizado == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        HorarioDTO dto = new HorarioDTO(horarioIndisponibilizado);
        horarioUpdateService.sendUpdate(dto);
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/disponibilizar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<HorarioDTO> disponibilizarHorario(@RequestBody @Valid HorarioDTO horarioDTO) {
        if (horarioDTO.getDia() == null || horarioDTO.getDia().trim().isEmpty() ||
            horarioDTO.getHorario() == null || horarioDTO.getHorario().trim().isEmpty() ||
            horarioDTO.getCategoria() == null || horarioDTO.getCategoria().trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
        LocalTime hora = LocalTime.parse(horarioDTO.getHorario());
        Horario horarioDisponibilizado = horarioService.disponibilizarHorario(
                horarioDTO.getDia(), hora, horarioDTO.getCategoria());
        if (horarioDisponibilizado == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        HorarioDTO dto = new HorarioDTO(horarioDisponibilizado);
        horarioUpdateService.sendUpdate(dto);
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/indisponibilizar/tudo/{dia}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> indisponibilizarTodosHorarios(@PathVariable String dia, @RequestBody List<String> horarios, @RequestParam String categoria) {
        List<LocalTime> horas = horarios.stream().map(LocalTime::parse).toList();
        Map<String, Object> response = horarioService.indisponibilizarTodosHorarios(dia, horas, categoria);
        horarioUpdateService.sendUpdate("refresh");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/disponibilizar/tudo/{dia}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> disponibilizarTodosHorarios(@PathVariable String dia, @RequestBody List<String> horarios, @RequestParam String categoria) {
        List<LocalTime> horas = horarios.stream().map(LocalTime::parse).toList();
        Map<String, Object> response = horarioService.disponibilizarTodosHorarios(dia, horas, categoria);
        horarioUpdateService.sendUpdate("refresh");
        return ResponseEntity.ok(response);
    }

    @PutMapping("/toggle")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<HorarioDTO> toggleHorario(@RequestBody Map<String, String> payload) {
        String dia = payload.get("dia");
        String horario = payload.get("horario");
        String categoria = payload.get("categoria");
        if (dia == null || horario == null || categoria == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
        HorarioDTO atualizado = horarioService.toggleHorario(dia, horario, categoria);
        if (atualizado == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        horarioUpdateService.sendUpdate(atualizado);
        return ResponseEntity.ok(atualizado);
    }

    @PutMapping("/toggle-dia")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, List<HorarioDTO>>> toggleDia(@RequestBody Map<String, String> payload) {
        String dia = payload.get("dia");
        String categoria = payload.get("categoria");
        if (dia == null || categoria == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
        Map<String, List<HorarioDTO>> atualizados = horarioService.toggleDia(dia, categoria);
        horarioUpdateService.sendUpdate("refresh");
        return ResponseEntity.ok(atualizados);
    }
    
    @GetMapping("/categoria/{categoria}")
    public ResponseEntity<Map<String, List<HorarioDTO>>> listarPorCategoria(@PathVariable String categoria) {
        return ResponseEntity.ok(horarioService.listarHorariosAgrupadosPorCategoria(categoria));
    }

    @PutMapping("/{id}")
    public ResponseEntity<HorarioDTO> alterarStatus(@PathVariable Long id,
                                                    @RequestBody HorarioDTO horarioDTO) {
        HorarioStatus status;
        try {
            status = HorarioStatus.valueOf(horarioDTO.getStatus().toUpperCase());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
        HorarioDTO atualizado = horarioService.alterarStatus(id, status);
        horarioUpdateService.sendUpdate(atualizado);
        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate")
                .body(atualizado);
    }
}

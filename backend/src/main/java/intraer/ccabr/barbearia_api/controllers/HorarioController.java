package intraer.ccabr.barbearia_api.controllers;

import intraer.ccabr.barbearia_api.dtos.HorarioDTO;
import intraer.ccabr.barbearia_api.enums.HorarioStatus;
import intraer.ccabr.barbearia_api.models.Horario;

import intraer.ccabr.barbearia_api.repositories.HorarioRepository;
import intraer.ccabr.barbearia_api.services.HorarioService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/horarios")
public class HorarioController {
    private final HorarioService horarioService;
    private final HorarioRepository horarioRepository;
    private static final Logger logger = LoggerFactory.getLogger(HorarioController.class);

    public HorarioController(HorarioService horarioService, HorarioRepository horarioRepository) {
        this.horarioService = horarioService;
        this.horarioRepository = horarioRepository;
    }
    @GetMapping
    public Map<String, Map<String, List<Horario>>> getTodosHorarios() {
        return horarioService.getTodosHorarios();
    }
    @GetMapping("/base")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<String>> getHorariosBase() {
        return ResponseEntity.ok(horarioService.getHorariosUnicos());
    }
    @PostMapping("/adicionar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> adicionarHorarioPersonalizado(@RequestBody Map<String, String> request) {
        String horario = request.get("horario");
        String dia = request.get("dia");
        String categoria = request.get("categoria");

        if (horario == null || dia == null || categoria == null ||
            horario.isBlank() || dia.isBlank() || categoria.isBlank()) {
            return ResponseEntity.badRequest().body("Campos obrigatórios: horario, dia, categoria.");
        }

        if (horarioRepository.existsByDiaAndHorarioAndCategoria(dia, horario, categoria)) {
            return ResponseEntity.ok("Horário já existente, nenhuma ação realizada.");
        }

        Horario novo = new Horario(dia, horario, categoria, HorarioStatus.DISPONIVEL);
        horarioRepository.save(novo);
        return ResponseEntity.ok(new HorarioDTO(novo));
    }
    @DeleteMapping("/remover")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> removerHorarioPersonalizado(@RequestBody Map<String, String> request) {
        String horario = request.get("horario");
        String dia = request.get("dia");
        String categoria = request.get("categoria");

        boolean removido = horarioService.removerHorarioPersonalizado(dia, horario, categoria);
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
        Horario horarioIndisponibilizado = horarioService.indisponibilizarHorario(
                horarioDTO.getDia(), horarioDTO.getHorario(), horarioDTO.getCategoria());
        if (horarioIndisponibilizado == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        return ResponseEntity.ok(new HorarioDTO(horarioIndisponibilizado));
    }

    @PostMapping("/disponibilizar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<HorarioDTO> disponibilizarHorario(@RequestBody @Valid HorarioDTO horarioDTO) {
        if (horarioDTO.getDia() == null || horarioDTO.getDia().trim().isEmpty() ||
            horarioDTO.getHorario() == null || horarioDTO.getHorario().trim().isEmpty() ||
            horarioDTO.getCategoria() == null || horarioDTO.getCategoria().trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
        Horario horarioDisponibilizado = horarioService.disponibilizarHorario(
                horarioDTO.getDia(), horarioDTO.getHorario(), horarioDTO.getCategoria());
        if (horarioDisponibilizado == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        return ResponseEntity.ok(new HorarioDTO(horarioDisponibilizado));
    }

    @PostMapping("/indisponibilizar/tudo/{dia}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> indisponibilizarTodosHorarios(@PathVariable String dia, @RequestBody List<String> horarios, @RequestParam String categoria) {
        Map<String, Object> response = horarioService.indisponibilizarTodosHorarios(dia, horarios, categoria);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/disponibilizar/tudo/{dia}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> disponibilizarTodosHorarios(@PathVariable String dia, @RequestBody List<String> horarios, @RequestParam String categoria) {
        Map<String, Object> response = horarioService.disponibilizarTodosHorarios(dia, horarios, categoria);
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/categoria/{categoria}")
    public ResponseEntity<Map<String, List<HorarioDTO>>> listarPorCategoria(@PathVariable String categoria) {
        return ResponseEntity.ok(horarioService.listarHorariosAgrupadosPorCategoria(categoria));
    }

    @PutMapping("/status")
    public ResponseEntity<HorarioDTO> alterarStatus(@RequestParam String dia,
                                                    @RequestParam String horario,
                                                    @RequestParam String categoria,
                                                    @RequestParam HorarioStatus status) {
        return ResponseEntity.ok(horarioService.alterarStatus(dia, horario, categoria, status));
    }
}

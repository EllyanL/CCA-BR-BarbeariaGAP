package intraer.ccabr.barbearia_api.controllers;

import java.util.List;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import intraer.ccabr.barbearia_api.models.Militar;
import intraer.ccabr.barbearia_api.services.MilitarService;

@RestController
@RequestMapping("/api/militares")
public class MilitarController {
    private final MilitarService militarService;

    public MilitarController(MilitarService militarService) {
        this.militarService = militarService;
    }

    // Método CREATE - Salva um militar.
    @PostMapping
    public ResponseEntity<Militar> save(@RequestBody Militar militar) {
        try {
            Militar savedMilitar = militarService.save(militar);
            return ResponseEntity.status(HttpStatus.CREATED).body(savedMilitar);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Método READ - Lista todos os militares.
    @GetMapping
    public ResponseEntity<List<Militar>> findAll() {
        List<Militar> militares = militarService.findAll();
        if (militares.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
        }
        return ResponseEntity.ok(militares);
    }

    // Método READ - Busca um militar pelo ID.
    @GetMapping("/{id}")
    public ResponseEntity<Militar> findById(@PathVariable Long id) {
        Optional<Militar> militar = militarService.findById(id);
        return militar.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    // Método DELETE - Deleta um militar pelo ID.
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteById(@PathVariable Long id) {
        Optional<Militar> militar = militarService.findById(id);
        if (militar.isPresent()) {
            militarService.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    }

    // Lista os militares de acordo com a categoria (oficial ou graduado)
    @GetMapping("/categoria/{categoria}")
    public List<Militar> getMilitaresByCategoria(@PathVariable String categoria) {
        return militarService.findByCategoria(categoria);
    }
}

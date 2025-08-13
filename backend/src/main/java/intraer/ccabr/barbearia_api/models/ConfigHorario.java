package intraer.ccabr.barbearia_api.models;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "config_horario")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ConfigHorario {

    @Id
    private Long id;

    @Column(nullable = false)
    private LocalTime inicio;

    @Column(nullable = false)
    private LocalTime fim;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PreUpdate
    @PrePersist
    public void updateTimestamp() {
        this.updatedAt = LocalDateTime.now();
    }
}

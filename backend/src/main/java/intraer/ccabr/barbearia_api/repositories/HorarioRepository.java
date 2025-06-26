package intraer.ccabr.barbearia_api.repositories;

import intraer.ccabr.barbearia_api.models.Horario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface HorarioRepository extends JpaRepository<Horario, Long> {

    List<Horario> findByDiaAndCategoria(String dia, String categoria);

    List<Horario> findByDiaAndCategoriaOrderByHorarioAsc(String dia, String categoria);

    Optional<Horario> findByDiaAndHorarioAndCategoria(String dia, String horario, String categoria);

    boolean existsByDiaAndHorarioAndCategoria(String dia, String horario, String categoria);

    List<Horario> findByCategoria(String categoria);

    long countByDia(String dia);

    @Transactional
    @Modifying
    @Query("DELETE FROM Horario h WHERE h.dia = :dia AND h.horario IN :horarios AND h.categoria = :categoria")
    void deleteByDiaAndHorarioInAndCategoria(String dia, List<String> horarios, String categoria);
}

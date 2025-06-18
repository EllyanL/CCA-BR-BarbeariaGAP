package intraer.ccabr.barbearia_api.repositories;

import intraer.ccabr.barbearia_api.models.Agendamento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

public interface AgendamentoRepository extends JpaRepository<Agendamento, Long> {

    @Query("SELECT a FROM Agendamento a WHERE a.data = :data AND a.diaSemana = :diaSemana AND a.hora IN :horas AND a.categoria = :categoria")
    List<Agendamento> findByDataAndDiaSemanaAndHoraInAndCategoria(
            @Param("data") LocalDate data,
            @Param("diaSemana") String diaSemana,
            @Param("horas") List<String> horas,
            @Param("categoria") String categoria
    );

    @Query("SELECT COUNT(a) > 0 FROM Agendamento a WHERE a.data = :data AND a.hora = :hora AND a.diaSemana = :diaSemana AND a.categoria = :categoria")
        boolean existsByDataAndHoraAndDiaSemanaAndCategoria(
        @Param("data") LocalDate data,
        @Param("hora") LocalTime hora,    
        @Param("diaSemana") String diaSemana,
        @Param("categoria") String categoria
        );

    @Query("SELECT a FROM Agendamento a WHERE a.data = :data AND a.hora = :hora AND a.diaSemana = :diaSemana AND a.categoria = :categoria")
        Optional<Agendamento> findByDataAndHoraAndDiaSemanaAndCategoria(
                @Param("data") LocalDate data,
                @Param("hora") LocalTime hora, 
                @Param("diaSemana") String diaSemana,
                @Param("categoria") String categoria
        );
        

    @Query("SELECT a FROM Agendamento a WHERE a.militar.saram = :saram ORDER BY a.data DESC")
    Optional<Agendamento> findUltimoAgendamentoBySaram(@Param("saram") String saram);

    @Query("SELECT a FROM Agendamento a WHERE a.militar.cpf = :cpf AND a.categoria = :categoria")
    List<Agendamento> findByMilitarCpfAndCategoria(@Param("cpf") String cpf, @Param("categoria") String categoria);

    @Query("SELECT a FROM Agendamento a WHERE a.militar.cpf = :cpf AND a.categoria = :categoria AND a.data >= :data ORDER BY a.data")
    List<Agendamento> findByMilitarCpfAndCategoriaAndDataAfter(
            @Param("cpf") String cpf,
            @Param("categoria") String categoria,
            @Param("data") LocalDate data
    );

    @Modifying
    @Query("DELETE FROM Agendamento a WHERE a.hora = :hora")
    void deleteByHora(@Param("hora") LocalTime hora);

    @Query("SELECT COUNT(a) > 0 FROM Agendamento a WHERE a.hora = :hora AND a.diaSemana = :diaSemana AND a.categoria = :categoria")
    boolean existsByHoraAndDiaSemanaAndCategoria(
            @Param("hora") LocalTime hora,
            @Param("diaSemana") String diaSemana,
            @Param("categoria") String categoria
    );

    Optional<Agendamento> findFirstByHoraAndDiaSemanaAndCategoriaAndDataGreaterThanEqualOrderByDataAsc(
            LocalTime hora,
            String diaSemana,
            String categoria,
            LocalDate data
    );

    @Query("SELECT COUNT(a) > 0 FROM Agendamento a WHERE a.data = :data AND a.hora = :hora AND a.diaSemana = :diaSemana AND a.categoria = :categoria AND a.id <> :id")
    boolean existsForUpdate(@Param("id") Long id,
                            @Param("data") LocalDate data,
                            @Param("hora") LocalTime hora,
                            @Param("diaSemana") String diaSemana,
                            @Param("categoria") String categoria);
}
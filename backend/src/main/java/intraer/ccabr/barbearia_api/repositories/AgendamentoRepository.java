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

    @Query("SELECT a FROM Agendamento a JOIN FETCH a.militar WHERE a.data = :data AND a.diaSemana = :diaSemana AND a.hora IN :horas AND a.categoria = :categoria")
    List<Agendamento> findByDataAndDiaSemanaAndHoraInAndCategoria(
            @Param("data") LocalDate data,
            @Param("diaSemana") String diaSemana,
            @Param("horas") List<String> horas,
            @Param("categoria") String categoria
    );

    @Query("SELECT COUNT(a) > 0 FROM Agendamento a WHERE a.data = :data AND a.hora = :hora AND a.diaSemana = :diaSemana AND a.categoria = :categoria AND a.status <> :status")
    boolean existsByDataAndHoraAndDiaSemanaAndCategoriaAndStatusNot(
            @Param("data") LocalDate data,
            @Param("hora") LocalTime hora,
            @Param("diaSemana") String diaSemana,
            @Param("categoria") String categoria,
            @Param("status") String status
    );

    @Query("SELECT a FROM Agendamento a JOIN FETCH a.militar WHERE a.data = :data AND a.hora = :hora AND a.diaSemana = :diaSemana AND a.categoria = :categoria")
    Optional<Agendamento> findByDataAndHoraAndDiaSemanaAndCategoria(
            @Param("data") LocalDate data,
            @Param("hora") LocalTime hora,
            @Param("diaSemana") String diaSemana,
            @Param("categoria") String categoria
    );

    List<Agendamento> findByStatus(String status);
        

    @Query("SELECT a FROM Agendamento a WHERE a.militar.saram = :saram AND a.status IN ('AGENDADO', 'REALIZADO') ORDER BY a.data DESC")
    Optional<Agendamento> findUltimoAgendamentoBySaram(@Param("saram") String saram);

    boolean existsByMilitarSaramAndDataGreaterThanEqual(String saram, LocalDate data);

    @Query("SELECT a FROM Agendamento a JOIN FETCH a.militar WHERE a.militar.cpf = :cpf AND a.categoria = :categoria")
    List<Agendamento> findByMilitarCpfAndCategoria(@Param("cpf") String cpf, @Param("categoria") String categoria);

    @Query("SELECT a FROM Agendamento a JOIN FETCH a.militar WHERE a.militar.cpf = :cpf AND a.categoria = :categoria AND a.data >= :data AND a.status = 'AGENDADO' ORDER BY a.data")
    List<Agendamento> findByMilitarCpfAndCategoriaAndDataAfter(
            @Param("cpf") String cpf,
            @Param("categoria") String categoria,
            @Param("data") LocalDate data
    );

    @Query("SELECT a FROM Agendamento a JOIN FETCH a.militar ORDER BY a.data DESC, a.hora DESC")
    List<Agendamento> findAllWithMilitar();

    @Modifying
    @Query("DELETE FROM Agendamento a WHERE a.hora = :hora")
    void deleteByHora(@Param("hora") LocalTime hora);

    @Query("SELECT COUNT(a) > 0 FROM Agendamento a WHERE a.hora = :hora AND a.diaSemana = :diaSemana AND a.categoria = :categoria AND a.status = 'AGENDADO'")
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

    @Query("SELECT a FROM Agendamento a JOIN FETCH a.militar WHERE a.id = :id")
    Optional<Agendamento> findByIdWithMilitar(@Param("id") Long id);

    @Query("SELECT COUNT(a) > 0 FROM Agendamento a WHERE a.data = :data AND a.hora = :hora AND a.diaSemana = :diaSemana AND a.categoria = :categoria AND a.id <> :id")
    boolean existsForUpdate(@Param("id") Long id,
                            @Param("data") LocalDate data,
                            @Param("hora") LocalTime hora,
                            @Param("diaSemana") String diaSemana,
                            @Param("categoria") String categoria);

    @Query("SELECT COUNT(a) FROM Agendamento a WHERE a.data = :data AND a.status IN ('AGENDADO', 'REALIZADO')")
    long countByData(@Param("data") LocalDate data);

    @Query("SELECT a.categoria, COUNT(a) FROM Agendamento a WHERE a.data = :data AND a.status IN ('AGENDADO', 'REALIZADO') GROUP BY a.categoria")
    List<Object[]> countByCategoria(@Param("data") LocalDate data);

    @Query("SELECT a.data, COUNT(a) FROM Agendamento a WHERE a.data >= :startDate AND a.status IN ('AGENDADO', 'REALIZADO') GROUP BY a.data ORDER BY a.data")
    List<Object[]> countByDataSince(@Param("startDate") LocalDate startDate);

    List<Agendamento> findTop5ByStatusOrderByDataDescHoraDesc(String status);

    @Query("""
            SELECT a FROM Agendamento a JOIN FETCH a.militar
            WHERE (:categoria IS NULL OR a.categoria = :categoria)
              AND (:dataInicio IS NULL OR a.data >= :dataInicio)
              AND (:dataFim IS NULL OR a.data <= :dataFim)
            ORDER BY a.data DESC, a.hora DESC
            """)
    // Sem filtro por status para incluir agendados e cancelados
    List<Agendamento> findByCategoriaAndPeriodo(
            @Param("categoria") String categoria,
            @Param("dataInicio") LocalDate dataInicio,
            @Param("dataFim") LocalDate dataFim
    );

    @Query("SELECT a FROM Agendamento a JOIN FETCH a.militar WHERE a.militar.id = :id ORDER BY a.data DESC, a.hora DESC")
    List<Agendamento> findByMilitarId(@Param("id") Long id);
}

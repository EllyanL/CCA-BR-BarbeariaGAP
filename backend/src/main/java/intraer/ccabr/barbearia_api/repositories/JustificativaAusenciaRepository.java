package intraer.ccabr.barbearia_api.repositories;

import intraer.ccabr.barbearia_api.models.JustificativaAusencia;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface JustificativaAusenciaRepository extends JpaRepository<JustificativaAusencia, Long> {

    Optional<JustificativaAusencia> findByAgendamentoId(Long agendamentoId);

    @EntityGraph(attributePaths = {"agendamento", "agendamento.militar", "militar"})
    List<JustificativaAusencia> findByAgendamentoIdIn(Collection<Long> agendamentoIds);

    @EntityGraph(attributePaths = {"agendamento", "agendamento.militar", "militar"})
    List<JustificativaAusencia> findAllByOrderByDataSolicitacaoDesc();
}

package intraer.ccabr.barbearia_api.repositories;

import intraer.ccabr.barbearia_api.models.Militar;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Repositório JPA para operações de CRUD na entidade Militar.
 * Fornece métodos personalizados para busca por SARAM, CPF e quadro.
 */
public interface MilitarRepository extends JpaRepository<Militar, Long> {

    /**
     * Busca um militar pelo número SARAM.
     *
     * @param saram O número SARAM do militar.
     * @return Optional contendo o militar encontrado ou vazio se não encontrado.
     */
    Optional<Militar> findBySaram(String saram);
    

    /**
     * Busca os detalhes do usuário (UserDetails) pelo CPF.
     *
     * @param cpf O CPF do militar.
     * @return UserDetails correspondente ao militar ou null se não encontrado.
     */
    Optional<Militar> findByCpf(String cpf);

    /**
     * Busca uma lista de militares pelo quadro (ignorando maiúsculas/minúsculas).
     *
     * @param quadro O quadro dos militares (ex.: "QSS").
     * @return Lista de militares encontrados.
     */
    @Query("SELECT m FROM Militar m WHERE LOWER(m.quadro) = LOWER(:quadro)")
    List<Militar> findByQuadro(String quadro);

    List<Militar> findByUltimoAgendamentoAfter(LocalDate limite);
}

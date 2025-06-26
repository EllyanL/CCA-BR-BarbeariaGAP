package intraer.ccabr.barbearia_api.infra.security;

import java.util.Collection;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import intraer.ccabr.barbearia_api.models.Militar;
import intraer.ccabr.barbearia_api.services.AuthorizationService;

import java.io.IOException;

@Component
public class SecurityFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(SecurityFilter.class);

    @Autowired
    private TokenService tokenService;

    @Autowired
    private AuthorizationService authorizationService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        // Ignorar validação de token para endpoints públicos
        String requestURI = request.getRequestURI();
        if (requestURI.equals("/api/auth/login") || requestURI.equals("/api/auth/register")) {
            filterChain.doFilter(request, response);
            return;
        }

        // Extrair e validar o token
        String token = getTokenFromRequest(request);
        if (token != null && !token.trim().isEmpty()) {
            try {
                String cpf = tokenService.validateToken(token);
                logger.debug("🔍 Validando token com CPF: {}", cpf);

                UserDetails userDetails = authorizationService.loadUserByUsername(cpf);

                if (userDetails instanceof Militar militar) {
                    Collection<? extends GrantedAuthority> authorities = militar.getAuthorities();

                    logger.debug("🔐 Authorities injetadas: {}", authorities);

                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(userDetails, null, authorities);
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                    logger.debug("🔒 Authentication set no contexto de segurança!");
                }
            } catch (Exception e) {
                logger.error("❌ Erro ao validar token: {}", e.getMessage());
            }
        }

        filterChain.doFilter(request, response);
    }

    private String getTokenFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}

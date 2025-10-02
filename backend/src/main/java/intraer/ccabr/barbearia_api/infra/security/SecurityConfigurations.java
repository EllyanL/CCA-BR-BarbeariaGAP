package intraer.ccabr.barbearia_api.infra.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfigurations {

    @Autowired
    SecurityFilter securityFilter;

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity httpSecurity) throws Exception {
        return httpSecurity
                .cors(Customizer.withDefaults()) // Ativa o CORS com o CorsConfig
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll() // ← LIBERAÇÃO IMPORTANTE
                    .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                    .requestMatchers(HttpMethod.POST, "/api/agendamentos").hasAnyRole("ADMIN", "GRADUADO", "OFICIAL")
                    .requestMatchers(HttpMethod.POST, "/api/auth/ldap-data").permitAll()
                    .requestMatchers(HttpMethod.POST, "/api/auth/user-data").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/auth/me").authenticated()
                    .requestMatchers(HttpMethod.PUT, "/api/configuracoes/**").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.POST, "/api/horarios/**").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.GET, "/api/horarios/**").hasAnyRole("ADMIN", "GRADUADO", "OFICIAL", "USER")
                    .requestMatchers("/api/militares/**").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.GET, "/api/agendamentos").hasAnyRole("ADMIN", "GRADUADO", "OFICIAL")
                    .requestMatchers(
                            HttpMethod.GET,
                            "/",
                            "/index.html",
                            "/favicon.ico",
                            "/manifest.webmanifest",
                            "/assets/**",
                            "/main*.js",
                            "/runtime*.js",
                            "/polyfills*.js",
                            "/scripts*.js",
                            "/styles*.css",
                            "/3rdpartylicenses.txt",
                            "/barber*.png",
                            "/456*.js",
                            "/665*.js",
                            "/896*.js")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/**").authenticated()
                    .requestMatchers(HttpMethod.DELETE, "/api/horarios/**").hasRole("ADMIN")
                    .anyRequest().authenticated()
                )
                .addFilterBefore(securityFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }



    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration) throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder(@Value("${security.bcrypt.strength:10}") int strength) {
        return new BCryptPasswordEncoder(strength);
    }
}

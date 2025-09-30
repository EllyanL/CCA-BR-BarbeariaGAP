package intraer.ccabr.barbearia_api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableAsync
public class BarbeariaApiApplication {
	public static void main(String[] args) {
		SpringApplication.run(BarbeariaApiApplication.class, args);
	}
}

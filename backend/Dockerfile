# Etapa 1: Compilação com Maven
FROM maven:3.9.10-eclipse-temurin-11-alpine AS builder

ENV http_proxy=http://71128049490:IaMoC_1323@proxy-brasilia.intraer:8080
ENV https_proxy=http://71128049490:IaMoC_1323@proxy-brasilia.intraer:8080
ENV no_proxy=localhost,127.0.0.1,.intraer

# Define diretório de trabalho na imagem
WORKDIR /app

# Copia o projeto inteiro (incluindo pom.xml, src/, etc.)
COPY . .

# Executa o build com Maven
RUN mvn clean package -DskipTests

# Etapa 2: Imagem final leve com apenas o JAR
FROM openjdk:18-alpine

ENV http_proxy=http://71128049490:IaMoC_1323@proxy-brasilia.intraer:8080
ENV https_proxy=http://71128049490:IaMoC_1323@proxy-brasilia.intraer:8080
ENV no_proxy=localhost,127.0.0.1,.intraer

# Diretório de trabalho
WORKDIR /app

VOLUME /tmp

# Copia o .jar gerado no build
COPY --from=builder /app/target/barbearia-api-0.0.1-SNAPSHOT.jar app.jar

ENTRYPOINT ["java", "-jar", "/app/app.jar"]

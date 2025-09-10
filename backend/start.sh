#!/usr/bin/env bash
set -e
APP_JAR="barbearia-api-0.0.1-SNAPSHOT.jar"
JAVA="./jdk-21.0.4+7/bin/java"
PORT=8081
LOG_FILE="log.txt"
PID_FILE="app.pid"

if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
  echo "Já está rodando com PID $(cat $PID_FILE)"; exit 0
fi

nohup "$JAVA" -jar "$APP_JAR" --server.port=$PORT > "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"
echo "Iniciado na porta $PORT (PID $(cat $PID_FILE)). Logs: tail -f $LOG_FILE"

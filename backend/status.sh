#!/usr/bin/env bash
PID_FILE="app.pid"
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID"
    sleep 1
    kill -0 "$PID" 2>/dev/null && kill -9 "$PID"
    echo "Parado PID $PID"
  else
    echo "Processo $PID não está rodando."
  fi
  rm -f "$PID_FILE"
else
  echo "Sem PID file. Nada para parar."
fi

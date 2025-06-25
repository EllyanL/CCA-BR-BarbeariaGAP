#!/usr/bin/env bash
# Start backend and frontend in development mode
set -e

# Start backend
(
  cd backend
  SPRING_PROFILES_ACTIVE=dev ./mvnw spring-boot:run
) &
backend_pid=$!

# Start frontend
(
  cd frontend
  npm install
  npx ng serve
) &
frontend_pid=$!

trap "kill $backend_pid $frontend_pid" INT TERM

wait $backend_pid $frontend_pid

#!/usr/bin/env bash
# Build frontend for production, copy artifacts, and start backend
set -e

# Build frontend
cd frontend
npm install
npx ng build --configuration production
cd ..

# Copy build artifacts to backend static directory
static_dir="backend/src/main/resources/static"
rm -rf "$static_dir"/*
cp -r frontend/dist/barbearia-front/* "$static_dir"/

# Start backend
cd backend
./mvnw spring-boot:run

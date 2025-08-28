#!/bin/bash
set -e
cd "$(dirname "$0")/backend"
./mvnw spotless:apply

#!/bin/bash

echo "🚀 Iniciando servidor proxy..."

# Start the Node.js server in the background
cd "/Users/melque/Projetos/api-pdf"
node server.js &
SERVER_PID=$!

# Wait a moment for the server to start
sleep 3

echo "✅ Servidor iniciado com PID: $SERVER_PID"
echo "🌐 Abrindo interface web..."

# Open the web interface
open "http://localhost:3000"

echo "📝 Para parar o servidor, execute: kill $SERVER_PID"
echo "🔗 Interface disponível em: http://localhost:3000"

# Keep the script running
wait $SERVER_PID
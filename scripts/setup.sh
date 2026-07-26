#!/bin/bash
# Setup inicial do ambiente de desenvolvimento MicroLaudo

set -e

echo "📦 Instalando dependências..."
npm install

echo "⚙️  Alinhando versões Expo..."
npx expo install --fix

echo "🔧 Configurando .env..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ .env criado — edite com suas chaves do Supabase antes de rodar."
else
  echo "ℹ️  .env já existe, ignorado."
fi

echo ""
echo "✅ Setup concluído!"
echo ""
echo "Próximos passos:"
echo "  1. Edite .env com suas chaves do Supabase"
echo "  2. npm run dev:web   → app no browser"
echo "  3. npm run dev       → app no celular via Expo Go"

#!/bin/bash
# Reset completo do banco local — APENAS para desenvolvimento!

set -e

echo "⚠️  Isso vai dropar e recriar todo o banco local."
read -p "Confirmar? (s/N): " confirm

if [ "$confirm" != "s" ]; then
  echo "Cancelado."
  exit 0
fi

echo "🗑️  Resetando banco..."
npx supabase db reset

echo "🌱 Populando com seed data..."
npm run db:seed

echo "✅ Banco resetado e populado."

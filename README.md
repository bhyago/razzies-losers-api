# Razzies Losers API

API em NestJS que lê o CSV do Golden Raspberry Awards e expõe endpoints para listar filmes indicados/vencedores e calcular os produtores com menor/maior intervalo entre vitórias.

## Stack

- Node.js + NestJS 11
- Validação e Swagger via `nestjs-zod`
- Vitest para testes e cobertura

## Pré-requisitos

- Node 20+
- pnpm (ou npm/yarn equivalente)

## Configuração

1. Instalar dependências

```bash
pnpm install
```

2. Variáveis de ambiente (opcional)

- `PORT`: porta da API (padrão `3333`).
- Crie um `.env` na raiz se quiser alterar.

## Rodar a API

```bash
pnpm start:dev
```

- Prefixo global: `/razzies-losers-api`
- Swagger: `http://localhost:3333/razzies-losers-api/doc`

## Endpoints principais

- `GET /movies` — lista filmes com filtros opcionais `year`, `winner`, `page`, `perPage`.
- `GET /movies/producers/intervals` — produtores com menor e maior intervalo entre vitórias consecutivas.

## Testes e cobertura

- Testes unitários/integrados: `pnpm test`
- Cobertura: `pnpm test:cov`
  - Relatório HTML em `coverage/index.html`

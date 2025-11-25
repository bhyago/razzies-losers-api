# Razzies Losers API

API em NestJS que lê o CSV do Golden Raspberry Awards e expõe endpoints para listar filmes indicados/vencedores e calcular os produtores com menor/maior intervalo entre vitórias.

## Índice

- [Stack](#stack)
- [Pré-requisitos](#pré-requisitos)
- [Configuração](#configuração)
- [Rodar a API](#rodar-a-api)
- [Endpoints principais](#endpoints-principais)
- [Notas de implementação](#notas-de-implementação)
- [Testes e cobertura](#testes-e-cobertura)

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

## Notas de implementação

- Desempenho: o cálculo de intervalos de produtores foi reescrito para uma passada linear com `Map` (hashmap), reduzindo a complexidade para O(N) e medido em teste de desempenho com 10k registros.
- Banco em memória: deixamos de usar `sql.js` sem ORM e adotamos `sqlite3` em memória via TypeORM, atendendo ao requisito de SGDB embarcado que sobe e desce junto com a aplicação (sem arquivo físico ou dependência externa como Docker).

## Testes e cobertura

- Testes unitários/integrados: `pnpm test`
- Cobertura: `pnpm test:cov`
  - Relatório HTML em `coverage/index.html`

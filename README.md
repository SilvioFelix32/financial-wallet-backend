# Financial Wallet - Backend

Sistema completo de carteira financeira com backend em NestJS seguindo Clean Architecture.

## Tecnologias

- **NestJS** 11.1.9
- **TypeScript** 5.9.3
- **Prisma** 7.0.0 (com adapter PostgreSQL)
- **PostgreSQL** (via `@prisma/adapter-pg` e `pg`)
- **AWS Cognito** para autenticação
- **Swagger** para documentação
- **Redis** para cache (opcional)

## Estrutura do Projeto

O projeto segue Clean Architecture com as seguintes camadas:

```
src/
├── application/          # Camada de aplicação
│   ├── dtos/           # Data Transfer Objects
│   └── exceptions/     # Exception filters
├── domain/             # Camada de domínio
│   ├── entities/       # Entidades de domínio
│   └── services/       # Serviços de domínio e repositórios
├── infrastructure/     # Camada de infraestrutura
│   ├── http/          # Controllers HTTP
│   └── security/      # Guards, strategies, decorators
├── modules/            # Módulos NestJS
└── shared/             # Código compartilhado
    ├── config/        # Configurações
    └── interceptors/  # Interceptors globais
```

## Como Executar

### Pré-requisitos

- Node.js 22.x
- PostgreSQL 14+
- npm ou yarn

### Instalação

1. Instale as dependências:
```bash
npm install
```

2. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/wallet?schema=public"
AWS_COGNITO_REGION="us-east-1"
AWS_COGNITO_USER_POOL_ID="us-east-1_XXXXXXXXX"
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

3. Configure o banco de dados:
```bash
# Gerar Prisma Client
npx prisma generate

# Executar migrações
npx prisma migrate deploy
# ou em desenvolvimento:
npx prisma migrate dev
```

4. Inicie o servidor:
```bash
# Desenvolvimento
npm run start:dev

# Produção
npm run build
npm run start:prod
```

O servidor estará disponível em `http://localhost:3001`

## Docker

### Pré-requisitos

- Docker e Docker Compose instalados
- Arquivo `.env` configurado com todas as variáveis necessárias
- PostgreSQL e Redis acessíveis (conforme configurado no `.env`)

### Testar Localmente

1. **Configure o arquivo `.env`** com as variáveis de ambiente:
```bash
APP_PORT=3003
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=your-secret
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_USER=your-redis-user
REDIS_URL=redis://user:password@host:6379
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=your-pool-id
```

2. **Construir a imagem Docker:**
```bash
docker build -t financial-wallet-backend .
```

3. **Executar com Docker Compose:**
```bash
docker-compose up -d
```

4. **Executar migrações do banco de dados:**
```bash
docker exec -it financial-wallet-backend npx prisma migrate deploy
```

5. **Verificar se está funcionando:**
```bash
# Ver logs
docker logs -f financial-wallet-backend

# Testar endpoint de saúde (se disponível)
curl http://localhost:3000/api

# Acessar Swagger
# http://localhost:3000/api
```

## Documentação da API

### Documentação Completa

Para documentação detalhada de todos os endpoints, incluindo exemplos de requisições e respostas, consulte:

📖 **[Documentação Completa da API](./docs/API.md)**

### Swagger UI

Para uma documentação interativa e testes em tempo real:

- **Swagger UI**: `http://localhost:3001/api`
- **Swagger JSON**: `http://localhost:3001/api-json`

A API utiliza versionamento por URI. Todas as rotas estão na versão **v1**.

## Autenticação

O sistema usa **AWS Cognito** para autenticação. Os usuários devem se autenticar no Cognito e enviar o token de acesso no header:

```
Authorization: Bearer <token>
```

O sistema sincroniza automaticamente os usuários do Cognito no banco de dados local quando eles fazem requisições autenticadas.

**Nota**: Todos os endpoints requerem autenticação via AWS Cognito, exceto `POST /v1/users` que é público para permitir a sincronização inicial de usuários.

## Endpoints da API

### Resumo dos Endpoints

#### Usuários (`/v1/users`)
- `POST /v1/users` - Criar ou sincronizar usuário (público)
- `GET /v1/users` - Listar usuários (paginado)
- `GET /v1/users/email/:email` - Buscar usuário por email
- `GET /v1/users/:user_id` - Buscar usuário por ID

#### Carteira (`/v1/wallet`)
- `POST /v1/wallet/deposit` - Depositar dinheiro
- `POST /v1/wallet/transfer` - Transferir dinheiro
- `POST /v1/wallet/revert` - Reverter transação
- `GET /v1/wallet/balance` - Consultar saldo
- `GET /v1/wallet/transactions` - Listar transações (paginado)

📖 **Para documentação completa com exemplos detalhados, consulte [docs/API.md](./docs/API.md)**

## Regras de Negócio

### Depósito
- Se o saldo estiver negativo, o depósito primeiro corrige o valor negativo e depois aumenta o restante
- Exemplo: Saldo -50, Depósito 100 → Corrige -50, depois adiciona 50

### Transferência
- Valida saldo antes de transferir
- Não permite transferência para si mesmo
- Cria transações para remetente (negativa) e destinatário (positiva)
- Rastreia informações do destinatário na transação do remetente (`recipientId` e `recipientName`)
- Rastreia informações do remetente na transação do destinatário (`senderId` e `senderName`)

### Reversão
- Todas as operações são reversíveis
- Transfers geram transações reversas espelhadas
- Deposits geram depósitos negativos compensatórios
- Não permite reverter uma reversão

### Saldo
- Calculado a partir da soma de todas as transações
- Suporta saldo negativo (que será corrigido no próximo depósito)

## Testes

```bash
# Executar testes
npm run test

# Testes com cobertura
npm run test:cov

# Testes em modo watch
npm run test:watch
```

## Migrações do Banco de Dados

```bash
# Criar nova migração (desenvolvimento)
npx prisma migrate dev

# Aplicar migrações (produção)
npx prisma migrate deploy

# Visualizar banco no Prisma Studio
npx prisma studio

# Gerar Prisma Client após mudanças no schema
npx prisma generate
```

## Observabilidade

O sistema inclui:
- **Logging**: Interceptor que registra todas as requisições HTTP
- **Métricas**: Interceptor que coleta métricas básicas (total de requisições, tempo médio de resposta)
- **Exception Filter**: Filtro global que padroniza respostas de erro

## Arquitetura

### Clean Architecture

O projeto segue os princípios de Clean Architecture:

1. **Domain Layer**: Contém as entidades e regras de negócio puras
2. **Application Layer**: DTOs e exceções de aplicação
3. **Infrastructure Layer**: Implementações concretas (HTTP, segurança)

### SOLID

- **Single Responsibility**: Cada classe tem uma única responsabilidade
- **Dependency Inversion**: Dependências através de interfaces
- **Open/Closed**: Extensível sem modificar código existente

### Padrões Utilizados

- **Repository Pattern**: Abstração de acesso a dados
- **Strategy Pattern**: Estratégias de autenticação JWT
- **Guard Pattern**: Proteção de rotas
- **Interceptor Pattern**: Cross-cutting concerns (logging, métricas)

## Segurança

- Autenticação via AWS Cognito (JWT tokens validados com JWKS)
- Validação de tokens Cognito (issuer, token_use, assinatura)
- Validação de inputs com class-validator
- Proteção de rotas com Guards
- CORS configurável
- Sincronização automática de usuários do Cognito

## Code Review

Ao revisar o código, verifique:

1. **Arquitetura**: Separação de camadas respeitada?
2. **SOLID**: Princípios aplicados corretamente?
3. **Testes**: Cobertura adequada para lógica crítica?
4. **Segurança**: Validações e proteções implementadas?
5. **Performance**: Queries otimizadas? Uso de transações?
6. **Documentação**: Código auto-explicativo? Swagger atualizado?


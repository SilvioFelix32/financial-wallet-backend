# Financial Wallet - Backend

Sistema completo de carteira financeira com backend em NestJS seguindo Clean Architecture.

## Tecnologias

- **NestJS** 11.1.9
- **TypeScript** 5.9.3
- **Prisma** 7.0.0
- **PostgreSQL**
- **AWS Cognito** para autenticação
- **Swagger** para documentação

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
npm run prisma:generate

# Executar migrações
npm run prisma:migrate
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
APP_PORT=3000
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

### Executar o container manualmente

```bash
docker run -d \
  --name financial-wallet-backend \
  -p 3000:3000 \
  --env-file .env \
  financial-wallet-backend
```

### Comandos úteis

```bash
# Ver logs
docker logs -f financial-wallet-backend

# Parar o container
docker stop financial-wallet-backend

# Remover o container
docker rm financial-wallet-backend

# Reconstruir e reiniciar
docker-compose down
docker-compose up -d --build

# Executar migrações
docker exec -it financial-wallet-backend npx prisma migrate deploy

```

## Documentação da API

A documentação Swagger está disponível em:
- `http://localhost:3001/api`

## Autenticação

O sistema usa **AWS Cognito** para autenticação. Os usuários devem se autenticar no Cognito e enviar o token de acesso no header `Authorization: Bearer <token>`.

O sistema sincroniza automaticamente os usuários do Cognito no banco de dados local quando eles fazem requisições autenticadas.

### Wallet

- `POST /wallet/deposit` - Depositar dinheiro
- `POST /wallet/transfer` - Transferir para outro usuário
- `POST /wallet/revert` - Reverter uma transação
- `GET /wallet/balance` - Obter saldo atual
- `GET /wallet/transactions` - Listar transações (paginado)

**Nota**: Todos os endpoints de wallet requerem autenticação via AWS Cognito (token no header Authorization).

## Regras de Negócio

### Depósito
- Se o saldo estiver negativo, o depósito primeiro corrige o valor negativo e depois aumenta o restante
- Exemplo: Saldo -50, Depósito 100 → Corrige -50, depois adiciona 50

### Transferência
- Valida saldo antes de transferir
- Não permite transferência para si mesmo
- Cria transações para remetente (negativa) e destinatário (positiva)

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
# Criar nova migração
npm run prisma:migrate

# Visualizar banco no Prisma Studio
npm run prisma:studio
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


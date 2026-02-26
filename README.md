# 🎬 BitMovie — Recomendador de Filmes por IA

> Sistema inteligente de recomendação de filmes com redes neurais no frontend e banco de dados vetorial no backend.

---

## 📋 Visão Geral

O **BitMovie** é uma aplicação full-stack que combina Machine Learning no navegador com recuperação semântica via banco vetorial para entregar recomendações personalizadas de filmes com base no histórico e preferências de cada usuário.

A arquitetura foi pensada para ser leve e eficiente: o modelo de rede neural roda diretamente no browser via **TensorFlow.js** em um Web Worker (sem travar a UI), enquanto o backend gerencia usuários, catálogo e similaridade vetorial.

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                        FRONTEND                         │
│                                                         │
│  ┌──────────────┐   Events   ┌──────────────────────┐  │
│  │ Controllers  │ ─────────► │       Views           │  │
│  │  Movie       │            │  MovieView            │  │
│  │  User        │            │  UserView             │  │
│  │  ModelTraining│           │  ModelTrainingView    │  │
│  │  Worker      │            └──────────────────────┘  │
│  │  AppUI       │                                       │
│  └──────┬───────┘                                       │
│         │ postMessage                                    │
│  ┌──────▼───────────────────────────────────────────┐  │
│  │          Web Worker (modelTrainingWorker.js)      │  │
│  │   TensorFlow.js  │  Treino  │  Recomendação       │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │ HTTP / REST
┌─────────────────────────▼───────────────────────────────┐
│                        BACKEND                          │
│                                                         │
│   REST API (Node.js)  ──►  Banco de Dados Vetorial      │
│   /api/movies              (embeddings de filmes)       │
│   /api/users                                            │
│   /api/recommend/:userId                                │
└─────────────────────────────────────────────────────────┘
```

---

## ✨ Funcionalidades

- **Perfil de usuário** — cadastro/login por nome com carregamento automático de histórico
- **Catálogo de filmes** — busca por título, filtro por gênero e ordenação (recomendados, populares, recentes, aleatório)
- **Avaliação por estrelas** — 1 a 5 estrelas, votação imediata ao clicar
- **Histórico pessoal** — visualização de filmes assistidos, curtidos e não curtidos
- **Treino de modelo** — rede neural treinada com os dados de todos os usuários via TF.js Web Worker
- **Recomendação personalizada** — ranking re-ordenado pelo score do modelo para o usuário logado
- **Feedback visual** — overlay de progresso durante o treino, toast notifications e badge de status do modelo

---

## 🛠️ Tecnologias

### Frontend

| Tecnologia              | Uso                       |
| ----------------------- | ------------------------- |
| JavaScript (ES Modules) | Linguagem principal       |
| TensorFlow.js 4.x       | Rede neural no browser    |
| Web Workers             | Treino sem travar a UI    |
| Bootstrap 5.3           | Interface responsiva      |
| Bootstrap Icons         | Ícones                    |
| Custom Events API       | Comunicação entre módulos |

### Backend

| Tecnologia     | Uso                                 |
| -------------- | ----------------------------------- |
| Node.js        | Runtime do servidor                 |
| REST API       | Comunicação com o frontend          |
| Banco Vetorial | Embeddings e busca por similaridade |

---

## 📂 Estrutura de Arquivos

```
├── index.html                    # Ponto de entrada HTML
├── style.css                     # Estilos globais
├── package.json                  # Dependências (browser-sync para dev)
│
├── src/
│   ├── index.js                  # Bootstrap da aplicação
│   │
│   ├── controllers/
│   │   ├── AppUIController.js    # Overlay de treino, toasts, status badge
│   │   ├── MovieController.js    # Catálogo, busca, filtros, ordenação
│   │   ├── UserController.js     # Login, histórico, filtros de histórico
│   │   ├── ModelTrainingController.js  # Dispara treino e recomendação
│   │   └── WorkerController.js   # Ponte entre Events e Web Worker
│   │
│   ├── services/
│   │   ├── MovieService.js       # Chamadas HTTP para /api/movies
│   │   └── UserService.js        # Chamadas HTTP para /api/users
│   │
│   ├── view/
│   │   ├── View.js               # Classe base (loadTemplate, replaceTemplate)
│   │   ├── MovieView.js          # Renderização de cards, estrelas, delegação de eventos
│   │   ├── UserView.js           # Formulário de perfil e histórico
│   │   ├── ModelTrainingView.js  # Botões treinar/recomendar
│   │   └── templates/
│   │       ├── movie-card.html   # Template de card de filme
│   │       └── past-purchase.html# Template de item do histórico
│   │
│   └── events/
│       ├── constants.js          # Nomes dos eventos (frontend e worker)
│       └── events.js             # Classe estática de pub/sub via CustomEvent
│
└── workers/
    └── modelTrainingWorker.js    # TF.js: treino da rede neural e ranking
```

---

## 🧠 Como o Modelo Funciona

### Representação dos Dados

Cada filme é codificado como um **vetor binário de gêneros** (one-hot). Cada usuário é representado pela **média dos vetores** dos filmes que assistiu, criando um perfil de preferências.

### Entrada da Rede Neural

```
[ vetor do usuário (N gêneros) | vetor do filme (N gêneros) ]
           └───────────── inputDimension = N * 2 ────────────┘
```

### Arquitetura da Rede

```
Input (N*2)  →  Dense(64, ReLU)  →  Dense(32, ReLU)  →  Dense(1, Sigmoid)
```

- **Saída:** score entre 0 e 1 (probabilidade de o usuário gostar do filme)
- **Loss:** Binary Cross-Entropy
- **Otimizador:** Adam (lr = 0.01)
- **Épocas:** 5 | **Batch:** 128

### Dados de Treino

- Pares positivos: filmes assistidos com rating normalizado (rating / 5)
- Pares negativos: filmes não assistidos com label 0
- Limite: 200 usuários × 50 positivos × 200 negativos por ciclo

### Persistência

O modelo treinado é salvo no **IndexedDB** do browser (`indexeddb://movie-recommendation-model`) e carregado automaticamente ao abrir a aplicação.

---

## 🎓 Dataset — MovieLens

Para fins de estudo, o projeto utiliza o dataset público **[MovieLens (Small)](https://grouplens.org/datasets/movielens/)**, mantido pelo GroupLens Research. Ele contém avaliações reais de filmes feitas por usuários anônimos e é amplamente usado em pesquisas de sistemas de recomendação.

Os arquivos CSV devem ser extraídos na pasta `ml-latest/` na raiz do backend:

```
backend/
└── ml-latest/
    ├── movies.csv       # movieId, title, genres
    ├── ratings.csv      # userId, movieId, rating, timestamp
    ├── tags.csv
    └── links.csv
```

> 📥 **Download:** https://grouplens.org/datasets/movielens/latest/ — use a versão `ml-latest-small.zip`

### Scripts de Importação

Após baixar e extrair os arquivos, rode os scripts na ordem abaixo para popular o banco:

#### 1. `seed-movielens.js` — Importa filmes com embeddings

Lê `movies.csv` e `ratings.csv`, calcula a média de avaliações de cada filme e gera um **embedding vetorial** com 7 dimensões para cada um:

```
[ avg_rating_norm, year_norm, is_Action, is_Comedy, is_Drama, is_Sci-Fi, is_Romance ]
```

Em seguida insere os filmes na tabela `movies` em batches de 500, usando `ON CONFLICT DO NOTHING` para ser idempotente.

```bash
node seed-movielens.js
```

#### 2. `seedImportRatings.js` — Importa usuários e avaliações

Lê `ratings.csv`, cria os usuários (com nome genérico `User {id}` e idade aleatória entre 18–60) e insere todas as avaliações na tabela `user_movies` em batches de 5.000 registros.

```bash
node seedImportRatings.js
```

> ⚠️ Rode `seed-movielens.js` **antes** de `seedImportRatings.js`, pois as avaliações referenciam os filmes via chave estrangeira.

### Configuração do Banco (seed-movielens.js)

O script conecta ao PostgreSQL com as seguintes configurações padrão — ajuste conforme seu ambiente:

```js
user: "postgres",
host: "localhost",
database: "bitmovie",
password: "postgres",
port: 5433
```

O `seedImportRatings.js` utiliza a conexão exportada pelo seu `db.js`.

---

## 🚀 Como Rodar

### Pré-requisitos

- Node.js 18+
- PostgreSQL rodando com o banco `bitmovie` criado
- Dataset MovieLens extraído em `backend/ml-latest/`
- Backend rodando em `http://localhost:3000`

### 1. Popular o banco

```bash
# Na pasta do backend
node seed-movielens.js
node seedImportRatings.js
```

### 2. Frontend

```bash
# Instalar dependências de dev
npm install

# Iniciar servidor de desenvolvimento com hot-reload
npm start
# Acesse: http://localhost:3000
```

> O `browser-sync` serve os arquivos e recarrega o browser automaticamente ao salvar.

### 3. Backend

Consulte o README do backend para instruções de setup do servidor e do banco vetorial.

---

## 🔌 Endpoints Utilizados

| Método | Endpoint                  | Descrição                            |
| ------ | ------------------------- | ------------------------------------ |
| GET    | `/api/movies`             | Lista filmes do catálogo             |
| GET    | `/api/movies/all`         | Lista todos os filmes (para treino)  |
| GET    | `/api/users?limit=N`      | Lista usuários                       |
| GET    | `/api/users/:id`          | Dados de um usuário                  |
| GET    | `/api/users/:id/history`  | Histórico de avaliações              |
| GET    | `/api/users/with-history` | Usuários com histórico (para treino) |
| POST   | `/api/users`              | Cria novo usuário                    |
| POST   | `/api/users/:id/watch`    | Registra avaliação de filme          |
| GET    | `/api/recommend/user/:id` | Candidatos para recomendação         |

---

## 🗂️ Fluxo de Uso

```
1. Usuário digita nome e idade  →  login/cadastro automático
2. Avalia filmes do catálogo    →  estrelas 1-5
3. Clica em "Treinar"           →  worker treina a rede neural
4. Clica em "Recomendar"        →  worker re-rankeia filmes por score
5. Seção "Recomendados" atualiza com os melhores matches do usuário
```

---

## 🧩 Padrão de Eventos

A comunicação entre módulos usa **CustomEvents** no `document`, evitando acoplamento direto:

```
UserController  ──dispatchUserSelected──►  MovieController
                                       ──►  ModelTrainingController

ModelTrainingController ──dispatchTrainModel──►  WorkerController
WorkerController        ──dispatchTrainingComplete──►  AppUIController
WorkerController        ──dispatchRecommendationsReady──►  MovieController
```

---

## 📌 Observações

- O treino roda em um **Web Worker** para não bloquear a thread principal
- Dados do modelo são persistidos localmente via **IndexedDB** — sem necessidade de re-treinar a cada sessão
- O sistema suporta múltiplos usuários; cada login carrega o histórico individual
- O painel de debug (avaliações de todos os usuários) pode ser exibido clicando em "Dados (debug)" na interface

---

## 📄 Licença

ISC

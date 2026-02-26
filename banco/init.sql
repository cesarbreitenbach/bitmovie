-- Habilita a extensão pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabela de filmes com embedding vetorial
CREATE TABLE IF NOT EXISTS movies (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  overview    TEXT DEFAULT '',
  genres      TEXT DEFAULT '',
  embedding   vector(7)
);

-- Índice vetorial para busca por similaridade (cosine)
CREATE INDEX IF NOT EXISTS movies_embedding_idx
  ON movies USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id    SERIAL PRIMARY KEY,
  name  TEXT NOT NULL,
  age   INT
);

-- Tabela de avaliações
CREATE TABLE IF NOT EXISTS user_movies (
  user_id     INT  REFERENCES users(id)  ON DELETE CASCADE,
  movie_id    TEXT REFERENCES movies(id) ON DELETE CASCADE,
  rating      NUMERIC(3,1),
  watched_at  TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, movie_id)
);
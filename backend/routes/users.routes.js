import express from "express";
import { pool } from "../db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const limit = Number(req.query.limit) || 100;

  const result = await pool.query("SELECT id, name, age FROM users LIMIT $1", [
    limit,
  ]);

  res.json(result.rows);
});

router.get("/with-history", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id,
        u.name,
        u.age,
        m.id AS movie_id,
        m.genres,
        um.rating
      FROM users u
      JOIN user_movies um ON u.id = um.user_id
      JOIN movies m ON m.id = um.movie_id
      ORDER BY u.id
    `);

    const usersMap = {};

    result.rows.forEach((row) => {
      if (!usersMap[row.id]) {
        usersMap[row.id] = {
          id: row.id,
          name: row.name,
          age: row.age,
          watched: [],
        };
      }

      usersMap[row.id].watched.push({
        id: row.movie_id,
        genres: row.genres,
        rating: row.rating,
      });
    });

    res.json(Object.values(usersMap));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar usuários com histórico" });
  }
});

router.get("/:id/history", async (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isFinite(userId)) {
    return res.status(400).json({ error: "userId inválido" });
  }

  try {
    const result = await pool.query(
      `
      SELECT 
        m.id,
        m.title,
        m.genres,
        m.overview,
        um.rating,
        um.watched_at
      FROM user_movies um
      JOIN movies m ON m.id = um.movie_id
      WHERE um.user_id = $1
      ORDER BY um.watched_at DESC NULLS LAST, m.id DESC
      `,
      [userId],
    );

    const watched = result.rows;
    const liked = watched.filter((x) => Number(x.rating) >= 4);
    const disliked = watched.filter((x) => Number(x.rating) <= 2);

    res.json({
      userId,
      counts: {
        watched: watched.length,
        liked: liked.length,
        disliked: disliked.length,
      },
      watched,
      liked,
      disliked,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar histórico do usuário" });
  }
});

router.get("/:id", async (req, res) => {
  const userId = req.params.id;

  const result = await pool.query(
    "SELECT id, name, age FROM users WHERE id = $1",
    [userId],
  );

  res.json(result.rows[0]);
});

router.post("/:id/watch", async (req, res) => {
  const userId = req.params.id;
  const { movieId, rating } = req.body;

  try {
    await pool.query(
      `
      INSERT INTO user_movies (user_id, movie_id, rating, watched_at)
      VALUES ($1, $2, $3, now())
      ON CONFLICT (user_id, movie_id)
      DO UPDATE SET rating = $3, watched_at = now()
    `,
      [userId, movieId, rating],
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao salvar avaliação" });
  }
});

router.post("/", async (req, res) => {
  const { name, age } = req.body ?? {};

  const cleanName = String(name ?? "").trim();
  const cleanAge = Number(age);

  if (!cleanName) return res.status(400).json({ error: "name é obrigatório" });
  if (!Number.isFinite(cleanAge) || cleanAge <= 0 || cleanAge > 120) {
    return res.status(400).json({ error: "age inválida" });
  }

  try {
    const existing = await pool.query(
      "SELECT id, name, age FROM users WHERE LOWER(name) = LOWER($1) LIMIT 1",
      [cleanName],
    );

    if (existing.rows[0]) {
      const updated = await pool.query(
        "UPDATE users SET age = $2 WHERE id = $1 RETURNING id, name, age",
        [existing.rows[0].id, cleanAge],
      );
      return res.json(updated.rows[0]);
    }

    const created = await pool.query(
      "INSERT INTO users (name, age) VALUES ($1, $2) RETURNING id, name, age",
      [cleanName, cleanAge],
    );

    return res.status(201).json(created.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao criar usuário" });
  }
});

export default router;

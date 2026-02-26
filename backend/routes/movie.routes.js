import express from "express";
import { pool } from "../db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, title, overview, genres FROM movies LIMIT 20",
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar filmes" });
  }
});
router.get("/all", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, title, genres FROM movies");

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar todos os filmes" });
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

export default router;

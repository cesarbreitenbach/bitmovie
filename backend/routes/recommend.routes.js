import express from "express";
import { pool } from "../db.js";
import { averageVectors } from "../services/recommendation.service.js";

const router = express.Router();

router.get("/user/:id", async (req, res) => {
  const userId = req.params.id;

  try {
    const result = await pool.query(
      `
      SELECT embedding
      FROM movies m
      JOIN user_movies um ON m.id = um.movie_id
      WHERE um.user_id = $1
    `,
      [userId],
    );

    const embeddings = result.rows
      .map((r) => {
        const e = r.embedding;

        if (Array.isArray(e)) return e;

        if (typeof e === "string") {
          return e
            .replace(/[\[\]\{\}]/g, "")
            .split(",")
            .map(Number);
        }

        return null;
      })
      .filter(Boolean);

    if (embeddings.length === 0) {
      return res.json([]);
    }

    const userVector = averageVectors(embeddings);

    const recommendations = await pool.query(
      `
      SELECT id, title, overview, genres,
             embedding <=> $1 as distance
      FROM movies
      WHERE id NOT IN (
        SELECT movie_id FROM user_movies WHERE user_id = $2
      )
      ORDER BY distance ASC
      LIMIT 200
      `,
      [JSON.stringify(userVector), userId],
    );

    res.json(recommendations.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao recomendar filmes" });
  }
});

export default router;

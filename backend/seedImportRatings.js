import fs from "fs";
import csv from "csv-parser";
import { pool } from "./db.js";

const BATCH_SIZE = 5000;

async function importRatings() {
  console.log("🚀 Iniciando importação do ratings.csv");

  const usersSet = new Set();
  const ratings = [];

  const stream = fs.createReadStream("./ml-latest/ratings.csv").pipe(csv());

  for await (const row of stream) {
    const userId = Number(row.userId);
    const movieId = Number(row.movieId);
    const rating = Number(row.rating);

    usersSet.add(userId);

    ratings.push({ userId, movieId, rating });
  }

  console.log("👥 Inserindo usuários...");
  await insertUsers([...usersSet]);

  console.log("🎬 Inserindo avaliações...");
  await insertRatingsInBatches(ratings);

  console.log("✅ Importação finalizada");
  process.exit();
}

async function insertUsers(userIds) {
  const values = userIds
    .map((id) => `(${id}, 'User ${id}', ${randomAge()})`)
    .join(",");

  await pool.query(`
    INSERT INTO users (id, name, age)
    VALUES ${values}
    ON CONFLICT (id) DO NOTHING
  `);
}

async function insertRatingsInBatches(ratings) {
  for (let i = 0; i < ratings.length; i += BATCH_SIZE) {
    const batch = ratings.slice(i, i + BATCH_SIZE);

    const values = batch
      .map((r) => `(${r.userId}, ${r.movieId}, ${r.rating}, NOW())`)
      .join(",");

    await pool.query(`
      INSERT INTO user_movies (user_id, movie_id, rating, watched_at)
      VALUES ${values}
      ON CONFLICT (user_id, movie_id)
      DO UPDATE SET rating = EXCLUDED.rating
    `);

    console.log(`📦 Batch ${i / BATCH_SIZE + 1} inserido`);
  }
}

function randomAge() {
  return Math.floor(Math.random() * (60 - 18 + 1)) + 18;
}

importRatings();

import fs from "fs";
import csv from "csv-parser";
import pg from "pg";

const pool = new pg.Pool({
  user: "postgres",
  host: "localhost",
  database: "bitmovie",
  password: "postgres",
  port: 5433,
});

const ratingsMap = new Map();

function normalize(value, min, max) {
  return (value - min) / (max - min || 1);
}

console.log("📊 Processando ratings...");

// ===== 1. PROCESSAR RATINGS =====
await new Promise((resolve) => {
  fs.createReadStream("./ml-latest/ratings.csv")
    .pipe(csv())
    .on("data", (row) => {
      const movieId = row.movieId;
      const rating = parseFloat(row.rating);

      if (!ratingsMap.has(movieId)) {
        ratingsMap.set(movieId, { sum: 0, count: 0 });
      }

      const data = ratingsMap.get(movieId);
      data.sum += rating;
      data.count += 1;
    })
    .on("end", () => {
      console.log("✅ Ratings processados");
      resolve();
    });
});

console.log("🎬 Processando filmes...");

// ===== 2. PROCESSAR MOVIES COM BATCH =====
const batchSize = 500;
let batch = [];

const insertBatch = async () => {
  if (batch.length === 0) return;

  const values = [];
  const placeholders = batch
    .map((_, i) => {
      const base = i * 5;
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
    })
    .join(",");

  batch.forEach((movie) => {
    values.push(
      movie.id,
      movie.title,
      "",
      movie.genres,
      JSON.stringify(movie.embedding),
    );
  });

  await pool.query(
    `
    INSERT INTO movies (id, title, overview, genres, embedding)
    VALUES ${placeholders}
    ON CONFLICT (id) DO NOTHING
  `,
    values,
  );

  console.log(`Inseridos: ${batch.length}`);
  batch = [];
};

await new Promise((resolve) => {
  fs.createReadStream("./ml-latest/movies.csv")
    .pipe(csv())
    .on("data", async (row) => {
      const movieId = row.movieId;
      const title = row.title;
      const genres = row.genres;

      const ratingData = ratingsMap.get(movieId);
      const avgRating = ratingData ? ratingData.sum / ratingData.count : 0;

      const yearMatch = title.match(/\((\d{4})\)/);
      const year = yearMatch ? parseInt(yearMatch[1]) : 2000;

      const embedding = [
        normalize(avgRating, 0, 5),
        normalize(year, 1900, 2024),
        genres.includes("Action") ? 1 : 0,
        genres.includes("Comedy") ? 1 : 0,
        genres.includes("Drama") ? 1 : 0,
        genres.includes("Sci-Fi") ? 1 : 0,
        genres.includes("Romance") ? 1 : 0,
      ];

      batch.push({
        id: movieId,
        title,
        genres,
        embedding,
      });

      if (batch.length >= batchSize) {
        fs.createReadStream.pause;
        insertBatch();
      }
    })
    .on("end", async () => {
      await insertBatch();
      console.log("🎉 Seed finalizado");
      resolve();
    });
});

await pool.end();
console.log("🚀 Banco populado com sucesso!");

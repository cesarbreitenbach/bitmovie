import pg from "pg";

export const pool = new pg.Pool({
  user: "postgres",
  host: "localhost",
  database: "bitmovie",
  password: "postgres",
  port: 5433,
});

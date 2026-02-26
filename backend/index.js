import express from "express";
import cors from "cors";
import recommendRoutes from "./routes/recommend.routes.js";
import movieRoutes from "./routes/movie.routes.js";
import userRoutes from "./routes/users.routes.js";

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.use("/api/movies", movieRoutes);
app.use("/api/users", userRoutes);
app.use("/api/recommend", recommendRoutes);

app.listen(port, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${port}`);
});

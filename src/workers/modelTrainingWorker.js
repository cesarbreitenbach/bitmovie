import "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js";
import { workerEvents } from "../events/constants.js";

let _globalCtx = {};
let _model = null;

async function loadModelIfExists() {
  try {
    _model = await tf.loadLayersModel("indexeddb://movie-recommendation-model");
    console.log("📦 Modelo carregado do IndexedDB");

    postMessage({
      type: workerEvents.trainingComplete,
    });
  } catch (err) {
    console.log("ℹ️ Nenhum modelo salvo encontrado");
  }
}

function makeContext(movies, users) {
  const genresSet = new Set();

  movies.forEach((movie) => {
    if (!movie.genres) return;
    movie.genres.split("|").forEach((g) => genresSet.add(g.trim()));
  });

  const genres = [...genresSet];

  const genresIndex = Object.fromEntries(genres.map((g, i) => [g, i]));

  return {
    movies,
    users,
    genresIndex,
    numGenres: genres.length,
    inputDimension: genres.length * 2,
  };
}

function encodeMovie(movie, context) {
  const vector = new Array(context.numGenres).fill(0);

  if (movie.genres) {
    movie.genres.split("|").forEach((g) => {
      const index = context.genresIndex[g.trim()];
      if (index !== undefined) vector[index] = 1;
    });
  }

  return tf.tensor1d(vector);
}

function encodeUser(user, context) {
  if (!user.watched?.length) {
    return tf.zeros([context.numGenres]).reshape([1, context.numGenres]);
  }

  const vectors = user.watched.map((movie) => encodeMovie(movie, context));

  return tf.stack(vectors).mean(0).reshape([1, context.numGenres]);
}

function createTrainingData(context) {
  const inputs = [];
  const labels = [];

  const MAX_USERS = 200; // treina só com 200 usuários por vez
  const MAX_POS_PER_USER = 50; // no máximo 50 positivos por usuário
  const NEG_PER_USER = 200; // 200 negativos por usuário

  // embaralha usuários para não pegar sempre os mesmos
  const usersShuffled = [...context.users]
    .sort(() => Math.random() - 0.5)
    .slice(0, MAX_USERS);

  usersShuffled.forEach((user) => {
    if (!user.watched?.length) return;

    const userVector = encodeUser(user, context).dataSync();

    // embaralha positivos e limita
    const positives = [...user.watched]
      .filter((m) => typeof m.rating === "number")
      .sort(() => Math.random() - 0.5)
      .slice(0, MAX_POS_PER_USER);

    const watchedIds = new Set(positives.map((m) => m.id));

    // ✅ positivos
    positives.forEach((movie) => {
      const movieVector = encodeMovie(movie, context).dataSync();
      const label = movie.rating / 5;

      inputs.push([...userVector, ...movieVector]);
      labels.push(label);
    });

    // ✅ negativos (embaralha para não pegar sempre os mesmos)
    const negatives = context.movies
      .filter((m) => !watchedIds.has(m.id))
      .sort(() => Math.random() - 0.5)
      .slice(0, NEG_PER_USER);

    negatives.forEach((movie) => {
      const movieVector = encodeMovie(movie, context).dataSync();
      inputs.push([...userVector, ...movieVector]);
      labels.push(0);
    });
  });

  return {
    xs: tf.tensor2d(inputs),
    ys: tf.tensor2d(labels, [labels.length, 1]),
    inputDimension: context.inputDimension,
  };
}

async function configureNeuralNetAndTrain(trainData) {
  const model = tf.sequential();

  model.add(
    tf.layers.dense({
      inputShape: [trainData.inputDimension],
      units: 64,
      activation: "relu",
    }),
  );

  model.add(
    tf.layers.dense({
      units: 32,
      activation: "relu",
    }),
  );

  model.add(
    tf.layers.dense({
      units: 1,
      activation: "sigmoid",
    }),
  );

  model.compile({
    optimizer: tf.train.adam(0.01),
    loss: "binaryCrossentropy",
    metrics: ["mae"],
  });

  await model.fit(trainData.xs, trainData.ys, {
    epochs: 5,
    batchSize: 128,
    shuffle: true,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        postMessage({
          type: workerEvents.trainingLog,
          epoch,
          loss: logs.loss,
          accuracy: logs.mae,
        });
      },
      onTrainBegin: () => {
        postMessage({
          type: workerEvents.progressUpdate,
          progress: { progress: 1 },
        });
      },
      onTrainEnd: () => {
        postMessage({
          type: workerEvents.progressUpdate,
          progress: { progress: 100 },
        });
      },
    },
  });

  return model;
}

// async function trainModel({ movies, users }) {
//   console.log("🚀 trainModel começou");
//   console.log("Movies:", movies?.length);
//   console.log("Users:", users?.length);
//   console.log("treinando modelo...");
//   const context = makeContext(movies, users);

//   _globalCtx = context;

//   // try {
//   //   _model = await tf.loadLayersModel("indexeddb://movie-recommendation-model");
//   //   loadModelIfExists();
//   //   console.log("📦 Modelo carregado do IndexedDB");
//   // } catch {
//   //   console.log("ℹ️ Nenhum modelo salvo, treinando novo modelo");
//   // }

//   const trainData = createTrainingData(context);

//   _model = await configureNeuralNetAndTrain(trainData);

//   await _model.save("indexeddb://movie-recommendation-model");

//   console.log("💾 Modelo salvo no IndexedDB");

//   postMessage({
//     type: workerEvents.trainingComplete,
//     loaded: true,
//   });
//   console.log("training completed");
// }

async function trainModel({ movies, users }) {
  console.log("🚀 trainModel começou");
  console.log("Movies:", movies?.length);
  console.log("Users:", users?.length);

  postMessage({
    type: workerEvents.progressUpdate,
    progress: { progress: 1, step: "start" },
  });

  const context = makeContext(movies, users);
  _globalCtx = context;

  console.log("✅ Context criado");

  postMessage({
    type: workerEvents.progressUpdate,
    progress: { progress: 10, step: "context-ready" },
  });

  console.log("⏳ Criando training data...");
  const t0 = performance.now();

  const trainData = createTrainingData(context);

  const t1 = performance.now();
  console.log(`✅ Training data criado em ${Math.round(t1 - t0)}ms`);
  console.log("xs shape:", trainData.xs.shape, "ys shape:", trainData.ys.shape);

  postMessage({
    type: workerEvents.progressUpdate,
    progress: { progress: 40, step: "data-ready" },
  });

  console.log("⏳ Iniciando fit...");
  _model = await configureNeuralNetAndTrain(trainData);

  postMessage({
    type: workerEvents.progressUpdate,
    progress: { progress: 90, step: "fit-done" },
  });

  await _model.save("indexeddb://movie-recommendation-model");
  console.log("💾 Modelo salvo no IndexedDB");

  postMessage({
    type: workerEvents.trainingComplete,
  });

  postMessage({
    type: workerEvents.progressUpdate,
    progress: { progress: 100, step: "done" },
  });

  console.log("✅ training completed");
}

function recommend({ user, candidates }) {
  if (!_model || !candidates?.length) return;

  const context = _globalCtx;

  const userVector = encodeUser(user, context).dataSync();

  const inputs = candidates.map((movie) => {
    const movieVector = encodeMovie(movie, context).dataSync();

    return [...userVector, ...movieVector];
  });

  const inputTensor = tf.tensor2d(inputs);

  const predictions = _model.predict(inputTensor);

  const scores = predictions.dataSync();

  const ranked = candidates
    .map((movie, i) => ({
      ...movie,
      score: scores[i],
    }))
    .sort((a, b) => b.score - a.score);

  postMessage({
    type: workerEvents.recommend,
    recommendations: ranked,
  });
}

const handlers = {
  [workerEvents.trainModel]: trainModel,
  [workerEvents.recommend]: recommend,
};

self.onmessage = (e) => {
  console.log("🧠 Worker recebeu mensagem:", e.data);
  const { action, ...data } = e.data;
  console.log("Action recebida:", action);
  console.log("Handlers disponíveis:", Object.keys(handlers));
  if (handlers[action]) handlers[action](data);
};

loadModelIfExists();

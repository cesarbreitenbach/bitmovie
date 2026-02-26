import { workerEvents } from "../events/constants.js";

export class WorkerController {
  #worker;
  #events;
  #alreadyTrained = false;

  constructor({ worker, events }) {
    this.#worker = worker;
    this.#events = events;
    this.init();
  }

  static init(deps) {
    return new WorkerController(deps);
  }

  init() {
    this.setupCallbacks();
  }

  setupCallbacks() {
    this.#events.onTrainModel((data) => {
      this.#alreadyTrained = false;
      this.triggerTrain(data);
    });

    this.#events.onTrainingComplete(() => {
      this.#alreadyTrained = true;
    });

    this.#events.onRecommend((data) => {
      if (!this.#alreadyTrained) return;
      this.triggerRecommend(data);
    });

    this.#worker.onmessage = (event) => {
      console.log("🛰️ onmessage raw:", event.data);

      const t = event.data?.type;

      if (!t) {
        console.warn("⚠️ Mensagem sem type", event.data);
        return;
      }

      console.log("📩 type recebido:", t);

      if (t === workerEvents.trainingComplete) {
        console.log("✅ trainingComplete recebido");
        this.#events.dispatchTrainingComplete(event.data);
        return;
      }

      if (t === workerEvents.trainingLog) {
        console.log("📈 trainingLog recebido:", {
          epoch: event.data.epoch,
          loss: event.data.loss,
          accuracy: event.data.accuracy,
        });
        this.#events.dispatchTFVisLogs(event.data);
        return;
      }

      if (t === workerEvents.progressUpdate) {
        console.log("⏳ progressUpdate recebido:", event.data.progress);
        this.#events.dispatchProgressUpdate(event.data.progress);
        return;
      }

      if (t === workerEvents.recommend) {
        console.log(
          "🎬 recommend recebido. qtd:",
          event.data.recommendations?.length,
        );
        this.#events.dispatchRecommendationsReady(event.data);
        return;
      }

      console.log("ℹ️ type ignorado:", t, event.data);
    };
  }

  triggerTrain(data) {
    console.log("📨 Enviando para worker");
    this.#worker.postMessage({
      action: workerEvents.trainModel,
      movies: data.movies,
      users: data.users,
    });
  }

  triggerRecommend(data) {
    this.#worker.postMessage({
      action: workerEvents.recommend,
      user: data.user,
      candidates: data.candidates,
    });
  }
}

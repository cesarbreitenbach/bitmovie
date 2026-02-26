import { UserController } from "./controller/UserController.js";
import { MovieController } from "./controller/MovieController.js";
import { ModelController } from "./controller/ModelTrainingController.js";
import { UserService } from "./service/UserService.js";
import { MovieService } from "./service/MovieService.js";
import { UserView } from "./view/UserView.js";
import { MovieView } from "./view/MovieView.js";
import { ModelView } from "./view/ModelTrainingView.js";
import Events from "./events/events.js";
import { WorkerController } from "./controller/WorkerController.js";
import { AppUIController } from "./controller/AppUIController.js";

// 🔥 Services
const userService = new UserService();
const movieService = new MovieService();

// 🔥 Views
const userView = new UserView();
const movieView = new MovieView();
const modelView = new ModelView();

// 🔥 Worker
const mlWorker = new Worker("/src/workers/modelTrainingWorker.js", {
  type: "module",
});

WorkerController.init({
  worker: mlWorker,
  events: Events,
});

// ✅ UI overlay/toast/status
AppUIController.init({ events: Events });

// 🔥 Controllers
ModelController.init({
  modelView,
  userService,
  movieService,
  events: Events,
});

MovieController.init({
  movieView,
  movieService,
  events: Events,
});

UserController.init({
  userView,
  userService,
  movieService,
  events: Events,
});

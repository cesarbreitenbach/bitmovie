export class ModelController {
  #modelView;
  #userService;
  #movieService;
  #events;
  #currentUser = null;
  #alreadyTrained = false;

  constructor({ modelView, userService, movieService, events }) {
    this.#modelView = modelView;
    this.#userService = userService;
    this.#movieService = movieService;
    this.#events = events;
    this.init();
  }

  static init(deps) {
    return new ModelController(deps);
  }

  async init() {
    this.setupCallbacks();
  }

  setupCallbacks() {
    this.#modelView.registerTrainModelCallback(
      this.handleTrainModel.bind(this),
    );

    this.#modelView.registerRunRecommendationCallback(
      this.handleRunRecommendation.bind(this),
    );

    this.#events.onUserSelected((user) => {
      this.#currentUser = user;
      if (this.#alreadyTrained) this.#modelView.enableRecommendButton();
    });

    this.#events.onTrainingComplete(() => {
      this.#alreadyTrained = true;
      if (this.#currentUser) this.#modelView.enableRecommendButton();
    });
  }

  async handleTrainModel() {
    const movies = await this.#movieService.getAllMovies();

    const users = await this.#userService.getUsersWithHistory();

    this.#events.dispatchTrainModel({
      movies,
      users,
    });
  }

  async handleRunRecommendation() {
    if (!this.#currentUser) return;

    const candidates = await this.#movieService.recommendForUser(
      this.#currentUser.id,
    );

    this.#events.dispatchRecommend({
      user: this.#currentUser,
      candidates,
    });
  }
}

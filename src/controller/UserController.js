export class UserController {
  #userService;
  #userView;
  #events;

  #usersCache = [];
  #history = { watched: [], liked: [], disliked: [] };
  #activeFilter = "all";

  constructor({ userView, userService, movieService, events }) {
    this.#userService = userService;
    this.#userView = userView;
    this.#events = events;
  }

  static init(deps) {
    const c = new UserController(deps);
    c.init();
    return c;
  }

  async init() {
    await this.refreshUsersCache();

    this.#userView.registerSaveCallback(this.handleSaveOrLogin.bind(this));
    this.#userView.registerFilterCallback(this.handleFilterChange.bind(this));

    // estado inicial
    this.#userView.renderHistory([]);
  }

  async refreshUsersCache() {
    this.#usersCache = await this.#userService.getUsers(1000);
  }

  findUserByName(name) {
    const needle = name.trim().toLowerCase();
    return (
      this.#usersCache.find(
        (u) => (u.name ?? "").trim().toLowerCase() === needle,
      ) ?? null
    );
  }

  async handleSaveOrLogin({ name, age }) {
    let user = this.findUserByName(name);

    if (user) {
      user = await this.#userService.getUserById(user.id);
    } else {
      user = await this.#userService.createUser({ name, age });
      await this.refreshUsersCache();
      user = await this.#userService.getUserById(user.id);
    }

    this.#events.dispatchUserSelected(user);
    this.#userView.renderUserDetails(user);

    // ✅ carregar histórico do user logado
    await this.loadHistoryForUser(user.id);

    // filtro padrão
    this.#activeFilter = "all";
    this.applyHistoryFilter();
  }

  async loadHistoryForUser(userId) {
    const data = await this.#userService.getUserHistory(userId);

    // se seu endpoint retorna só watched, montamos liked/disliked no front
    const watched = data.watched ?? [];
    const liked = data.liked ?? watched.filter((x) => Number(x.rating) >= 4);
    const disliked =
      data.disliked ?? watched.filter((x) => Number(x.rating) <= 2);

    this.#history = { watched, liked, disliked };
  }

  handleFilterChange(filterKey) {
    this.#activeFilter = filterKey;
    this.applyHistoryFilter();
  }

  applyHistoryFilter() {
    this.#userView.setActiveFilter?.(this.#activeFilter);

    if (this.#activeFilter === "liked")
      return this.#userView.renderHistory(this.#history.liked);
    if (this.#activeFilter === "disliked")
      return this.#userView.renderHistory(this.#history.disliked);
    if (this.#activeFilter === "watched")
      return this.#userView.renderHistory(this.#history.watched);
    return this.#userView.renderHistory(this.#history.watched); // all = watched
  }
}

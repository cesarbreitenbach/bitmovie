export class MovieController {
  #movieView;
  #currentUser = null;
  #events;
  #movieService;

  // ✅ novas variáveis
  #allMovies = [];
  #recommendedMovies = [];
  #showingRecommendations = false;

  #searchEl;
  #sortEl;
  #debounceTimer = null;

  constructor({ movieView, events, movieService }) {
    this.#movieView = movieView;
    this.#movieService = movieService;
    this.#events = events;
    this.init();
  }

  static init(deps) {
    return new MovieController(deps);
  }

  async init() {
    this.setupCallbacks();
    this.setupEventListeners();
    this.setupUIListeners();

    // 🔥 Buscar filmes do backend
    this.#allMovies = await this.#movieService.getMovies();

    // Render inicial (explorar)
    this.#showingRecommendations = false;
    this.applySearchAndSort(); // render com filtro/ordem atuais
  }

  setupEventListeners() {
    this.#events.onUserSelected((user) => {
      this.#currentUser = user;
      this.#movieView.onUserSelected(user);

      // ao logar, re-renderiza mantendo filtro/ordem (pra habilitar botões)
      this.applySearchAndSort();
    });

    // Quando worker terminar re-ranking
    this.#events.onRecommendationsReady(({ recommendations }) => {
      this.#recommendedMovies = recommendations ?? [];
      this.#showingRecommendations = true;

      // se quiser: setar sort para "recommended" automaticamente
      if (this.#sortEl) this.#sortEl.value = "recommended";

      this.applySearchAndSort();
    });
  }

  setupCallbacks() {
    this.#movieView.registerWatchMovieCallback(
      this.handleWatchMovie.bind(this),
    );
  }

  setupUIListeners() {
    this.#searchEl = document.getElementById("searchInput");
    this.#sortEl = document.getElementById("sortSelect");

    if (this.#searchEl) {
      this.#searchEl.addEventListener("input", () => {
        clearTimeout(this.#debounceTimer);
        this.#debounceTimer = setTimeout(() => this.applySearchAndSort(), 150);
      });
    }

    if (this.#sortEl) {
      this.#sortEl.addEventListener("change", () => this.applySearchAndSort());
    }
  }

  getActiveList() {
    // Se está mostrando recomendações e tem lista, usa ela; senão, catálogo.
    if (this.#showingRecommendations && this.#recommendedMovies.length) {
      return this.#recommendedMovies;
    }
    return this.#allMovies;
  }

  normalizeTitle(movie) {
    // seus filmes têm movie.title
    const t = movie?.title ?? movie?.name ?? "";
    return String(t).toLowerCase().trim();
  }

  getPopularityScore(movie) {
    // tenta alguns campos comuns (TMDB etc.)
    const p =
      movie?.popularity ??
      movie?.vote_count ??
      movie?.voteCount ??
      movie?.vote_average ??
      movie?.voteAverage ??
      movie?.score; // (se existir)
    return Number(p) || 0;
  }

  getYearScore(movie) {
    // tenta release_date (YYYY-MM-DD) / year / data
    const rd = movie?.release_date ?? movie?.releaseDate ?? movie?.year;
    if (!rd) return 0;

    const str = String(rd);
    const year = Number(str.slice(0, 4));
    return Number.isFinite(year) ? year : 0;
  }

  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  applySearchAndSort() {
    const list = this.getActiveList();
    let out = [...list];

    // 1) filtro por nome
    const q = (this.#searchEl?.value ?? "").toLowerCase().trim();
    if (q) {
      out = out.filter((m) => this.normalizeTitle(m).includes(q));
    }

    // 2) ordenação
    const sort = this.#sortEl?.value ?? "recommended";

    if (sort === "popular") {
      out.sort(
        (a, b) => this.getPopularityScore(b) - this.getPopularityScore(a),
      );
    } else if (sort === "recent") {
      out.sort((a, b) => this.getYearScore(b) - this.getYearScore(a));
    } else if (sort === "random") {
      out = this.shuffle(out);
    } else {
      // "recommended"
      // Se vier do worker, já está ordenado por score. Se for catálogo, mantém ordem atual.
    }

    // 3) render (habilita botões se tiver usuário)
    const disableButtons = !this.#currentUser?.id;
    this.#movieView.render(out, disableButtons);
  }

  async handleWatchMovie(movie, rating) {
    if (!this.#currentUser?.id) {
      alert("Faça login (nome e idade) antes de avaliar filmes.");
      return;
    }

    await this.#movieService.markAsWatched(
      this.#currentUser.id,
      movie.id,
      rating,
    );

    const candidates = await this.#movieService.recommendForUser(
      this.#currentUser.id,
    );

    this.#events.dispatchRecommend({
      user: this.#currentUser,
      candidates,
    });
  }
}

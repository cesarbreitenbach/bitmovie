import { View } from "./View.js";

export class MovieView extends View {
  #movieList = document.querySelector("#productList");

  #movieTemplate;
  #onWatchMovie;

  constructor() {
    super();
    this.init();
  }

  async init() {
    this.#movieTemplate = await this.loadTemplate(
      "./src/view/templates/movie-card.html",
    );

    this.attachDelegatedListeners();
  }

  onUserSelected(user) {
    this.setAllWatchButtonsDisabled(!user?.id);
  }

  registerWatchMovieCallback(callback) {
    this.#onWatchMovie = callback;
  }

  render(movies, disableButtons = true) {
    if (!this.#movieTemplate) return;

    const html = movies
      .map((movie) =>
        this.replaceTemplate(this.#movieTemplate, {
          id: movie.id,
          name: movie.title,
          category: movie.genres,
          overview: movie.overview ?? "",
          product: JSON.stringify(movie),
        }),
      )
      .join("");

    this.#movieList.innerHTML = html;

    // 🔒 regra: se disableButtons=true, botão começa desabilitado (mas vamos habilitar quando clicar estrelas)
    this.setAllWatchButtonsDisabled(disableButtons);
  }

  setAllWatchButtonsDisabled(disabled) {
    const buttons = document.querySelectorAll(".watch-btn");
    buttons.forEach((btn) => (btn.disabled = disabled));
  }

  // ✅ pinta as estrelas e salva rating no card
  setStars(cardEl, rating) {
    cardEl.dataset.rating = String(rating);

    const stars = [...cardEl.querySelectorAll(".star")];
    stars.forEach((btn) => {
      const v = Number(btn.dataset.value);
      const icon = btn.querySelector("i");
      if (!icon) return;

      if (v <= rating) {
        icon.classList.remove("bi-star");
        icon.classList.add("bi-star-fill");
      } else {
        icon.classList.remove("bi-star-fill");
        icon.classList.add("bi-star");
      }
    });

    const label = cardEl.querySelector(".rating-label");
    if (label) label.textContent = `${rating}/5`;

    // habilita o botão desse card
    const watchBtn = cardEl.querySelector(".watch-btn");
    if (watchBtn) watchBtn.disabled = rating <= 0;
  }

  flashButton(button, text) {
    const originalText = button.innerHTML;

    button.innerHTML = `<i class="bi bi-check-circle-fill"></i> ${text}`;
    button.classList.remove("btn-primary");
    button.classList.add("btn-success");

    setTimeout(() => {
      button.innerHTML = originalText;
      button.classList.remove("btn-success");
      button.classList.add("btn-primary");
    }, 800);
  }

  attachDelegatedListeners() {
    if (!this.#movieList) return;

    this.#movieList.addEventListener("click", (e) => {
      // ⭐ clique na estrela
      const starBtn = e.target.closest(".star");
      if (starBtn) {
        const card = e.target.closest(".movie-card");
        if (!card) return;

        const rating = Number(starBtn.dataset.value);
        if (!rating) return;

        this.setStars(card, rating);

        // pega o movie via data-product (como você já fazia)
        const watchBtn = card.querySelector(".watch-btn");
        const movie = watchBtn?.dataset.product
          ? JSON.parse(watchBtn.dataset.product)
          : null;

        // ✅ votar imediatamente ao clicar na estrela
        if (movie && this.#onWatchMovie) {
          this.#onWatchMovie(movie, rating);
        }
        return;
      }

      // ✅ clique no botão Assistido (usa rating do card)
      const watchBtn = e.target.closest(".watch-btn");
      if (watchBtn) {
        const card = e.target.closest(".movie-card");
        if (!card) return;

        const movie = JSON.parse(watchBtn.dataset.product);

        const rating = Number(card.dataset.rating || 0);
        if (!rating) {
          alert(
            "Escolha uma avaliação (1 a 5 estrelas) antes de marcar como assistido.",
          );
          return;
        }

        this.flashButton(watchBtn, "Avaliado");

        if (this.#onWatchMovie) {
          this.#onWatchMovie(movie, rating);
        }
      }
    });
  }
}

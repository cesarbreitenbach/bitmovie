import { View } from "./View.js";

export class UserView extends View {
  #userName = document.querySelector("#userName");
  #userAge = document.querySelector("#userAge");
  #saveBtn = document.querySelector("#saveUserBtn");

  #historyList = document.querySelector("#pastPurchasesList");
  #ratedBadge = document.querySelector("#ratedCountBadge");

  #filterAllBtn = document.querySelector("#filterAllBtn");
  #filterLikedBtn = document.querySelector("#filterLikedBtn");
  #filterDislikedBtn = document.querySelector("#filterDislikedBtn");
  #filterWatchedBtn = document.querySelector("#filterWatchedBtn");

  #onSave;
  #onFilterChange;

  constructor() {
    super();
    this.attachListeners();
  }

  registerSaveCallback(cb) {
    this.#onSave = cb;
  }

  registerFilterCallback(cb) {
    this.#onFilterChange = cb;
  }

  renderUserDetails(user) {
    if (this.#userName) this.#userName.value = user?.name ?? "";
    if (this.#userAge) this.#userAge.value = user?.age ?? "";
  }

  getFormData() {
    const name = (this.#userName?.value ?? "").trim();
    const age = Number(this.#userAge?.value ?? "");
    return { name, age };
  }

  attachListeners() {
    if (this.#saveBtn) {
      this.#saveBtn.addEventListener("click", () => {
        if (!this.#onSave) return;
        const { name, age } = this.getFormData();
        if (!name) return alert("Digite seu nome.");
        if (!Number.isFinite(age) || age <= 0)
          return alert("Digite sua idade.");
        this.#onSave({ name, age });
      });
    }

    const bind = (btn, key) => {
      if (!btn) return;
      btn.addEventListener("click", () => this.#onFilterChange?.(key));
    };

    bind(this.#filterAllBtn, "all");
    bind(this.#filterLikedBtn, "liked");
    bind(this.#filterDislikedBtn, "disliked");
    bind(this.#filterWatchedBtn, "watched");
  }

  renderHistory(items = []) {
    if (this.#ratedBadge)
      this.#ratedBadge.textContent = `${items.length} avaliações`;

    if (!this.#historyList) return;

    if (!items.length) {
      this.#historyList.innerHTML = `<div class="text-muted small">Nenhuma avaliação ainda.</div>`;
      return;
    }

    const html = items
      .map((m) => {
        const rating = Number(m.rating || 0);
        const stars = "★★★★★".slice(0, rating) + "☆☆☆☆☆".slice(0, 5 - rating);

        return `
          <div class="col-12">
            <div class="border rounded p-2 bg-white">
              <div class="fw-semibold small">${m.title ?? "Filme"}</div>
              <div class="text-muted small">${stars} <span class="ms-1">${rating}/5</span></div>
            </div>
          </div>
        `;
      })
      .join("");

    this.#historyList.innerHTML = html;
  }

  setActiveFilter(key) {
    const all = [
      this.#filterAllBtn,
      this.#filterLikedBtn,
      this.#filterDislikedBtn,
      this.#filterWatchedBtn,
    ].filter(Boolean);
    all.forEach((b) => b.classList.remove("active"));

    const map = {
      all: this.#filterAllBtn,
      liked: this.#filterLikedBtn,
      disliked: this.#filterDislikedBtn,
      watched: this.#filterWatchedBtn,
    };
    map[key]?.classList.add("active");
  }
}

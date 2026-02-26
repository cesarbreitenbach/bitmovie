export class AppUIController {
  static init({ events }) {
    const ui = new AppUIController(events);
    ui.bind();
    return ui;
  }

  constructor(events) {
    this.events = events;

    this.overlay = document.getElementById("trainingOverlay");
    this.progressBar = document.getElementById("trainingProgressBar");
    this.subtext = document.getElementById("trainingSubtext");

    this.statusBadge = document.getElementById("modelStatusBadge");
    this.statusText = document.getElementById("modelStatusText");

    this.toastEl = document.getElementById("appToast");
    this.toastText = document.getElementById("toastText");
    this.toast = null;

    this.lastTrainedAt = null;
  }

  bind() {
    if (this.toastEl && window.bootstrap?.Toast) {
      this.toast = new window.bootstrap.Toast(this.toastEl, { delay: 2500 });
    }

    this.events.onTrainModel(() => {
      this.setStatus("training", "Treinando…");
      this.showOverlay("Treinando recomendações…");
      this.toastMsg("Treinando o modelo…");
    });

    this.events.onProgressUpdate((p) => {
      // aceita: { pct }, { progress }, { epoch,totalEpochs }, { message }
      let pct = null;

      if (typeof p?.pct === "number") {
        pct = p.pct;
      } else if (typeof p?.progress === "number") {
        // se vier 0..1, converte; se vier 0..100, usa direto
        pct = p.progress <= 1 ? p.progress * 100 : p.progress;
      } else if (
        typeof p?.epoch === "number" &&
        typeof p?.totalEpochs === "number"
      ) {
        pct = ((p.epoch + 1) / p.totalEpochs) * 100;
      }

      if (typeof pct === "number") this.setProgress(pct);

      if (p?.message) this.setOverlayText(p.message);
    });

    this.events.onTrainingComplete((detail) => {
      this.hideOverlay();
      this.lastTrainedAt = new Date();

      this.setStatus("ready", "Modelo pronto");
      this.setLastTrained(this.lastTrainedAt);

      if (detail?.message) this.toastMsg(detail.message);
      else this.toastMsg("Modelo atualizado ✅");
    });

    this.events.onRecommendationsReady(() => {
      this.toastMsg("Recomendações prontas 🎬");
    });
  }

  showOverlay(text) {
    if (!this.overlay) return;
    this.overlay.classList.remove("d-none");
    this.setOverlayText(text || "Aguarde…");
    this.setProgress(null);
  }

  hideOverlay() {
    if (!this.overlay) return;
    this.overlay.classList.add("d-none");
  }

  setOverlayText(text) {
    if (this.subtext) this.subtext.textContent = text;
  }

  setProgress(pct) {
    if (!this.progressBar) return;
    if (typeof pct !== "number") {
      this.progressBar.style.width = "100%";
      return;
    }
    const clamped = Math.max(0, Math.min(100, pct));
    this.progressBar.style.width = `${clamped}%`;
  }

  setLastTrained(dateObj) {
    if (!this.statusText) return;
    const hh = String(dateObj.getHours()).padStart(2, "0");
    const mm = String(dateObj.getMinutes()).padStart(2, "0");
    this.statusText.textContent = `Último treino: ${hh}:${mm}`;
  }

  setStatus(mode, label) {
    const b = this.statusBadge;
    if (!b) return;

    b.classList.remove(
      "text-bg-success",
      "text-bg-warning",
      "text-bg-danger",
      "text-bg-primary",
    );

    if (mode === "ready") {
      b.classList.add("text-bg-success");
      b.innerHTML = `<i class="bi bi-check2-circle me-1"></i> ${label}`;
      return;
    }
    if (mode === "training") {
      b.classList.add("text-bg-primary");
      b.innerHTML = `<i class="bi bi-cpu me-1"></i> ${label}`;
      return;
    }

    b.classList.add("text-bg-warning");
    b.innerHTML = `<i class="bi bi-exclamation-triangle me-1"></i> ${label}`;
  }

  toastMsg(text) {
    if (!this.toastText) return;
    this.toastText.textContent = text;
    this.toast?.show();
  }
}

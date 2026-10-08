"use strict";

const state = {
  meta: null,
  items: [],
  selected: new Map(),
  activeProductId: null,
  searchTimer: null,
};

const elements = {
  summary: document.querySelector("#catalog-summary"),
  search: document.querySelector("#search-input"),
  statuses: document.querySelector("#status-filters"),
  brands: document.querySelector("#brand-filters"),
  indication: document.querySelector("#indication-filter"),
  lensType: document.querySelector("#lens-type-filter"),
  material: document.querySelector("#material-filter"),
  parameter: document.querySelector("#parameter-filter"),
  reset: document.querySelector("#reset-filters"),
  emptyReset: document.querySelector("#empty-reset"),
  loading: document.querySelector("#loading-state"),
  empty: document.querySelector("#empty-state"),
  grid: document.querySelector("#product-grid"),
  resultCount: document.querySelector("#result-count"),
  filterSummary: document.querySelector("#active-filter-summary"),
  detailPanel: document.querySelector("#detail-panel"),
  detailPlaceholder: document.querySelector("#detail-placeholder"),
  detailContent: document.querySelector("#detail-content"),
  compareTray: document.querySelector("#compare-tray"),
  compareCount: document.querySelector("#compare-count"),
  compareNames: document.querySelector("#compare-names"),
  clearComparison: document.querySelector("#clear-comparison"),
  openComparison: document.querySelector("#open-comparison"),
  comparisonDialog: document.querySelector("#comparison-dialog"),
  closeComparison: document.querySelector("#close-comparison"),
  comparisonContent: document.querySelector("#comparison-content"),
  themeToggle: document.querySelector("#theme-toggle"),
  themeIcon: document.querySelector("#theme-icon"),
  themeLabel: document.querySelector("#theme-label"),
  toast: document.querySelector("#toast"),
};

const THEME_STORAGE_KEY = "drmate-lenses-theme";

const STATUS_LABELS = {
  source_verified: "Проверено по источнику",
  clinician_reviewed: "Проверено врачом",
  active: "Активно",
  draft: "Черновик",
  deprecated: "Устарело",
};

const PARAMETER_LABELS = {
  base_curve_mm: "BC",
  diameter_mm: "DIA",
  power_d: "Сфера",
  cylinder_d: "Цилиндр",
  axis_deg: "Ось",
  add_power_d: "Аддидация",
  add_zone_mm: "Зона ADD",
  add_zone_design: "Дизайн ADD",
  prism_d: "Призма",
  center_thickness_mm: "Центр. толщина",
};

const LENS_TYPE_LABELS = {
  custom_soft_aphakic: "Афакическая мягкая",
  custom_soft_bifocal: "Бифокальная мягкая",
  custom_soft_bifocal_toric: "Бифокальная торическая",
  custom_soft_irregular_cornea: "Для нерегулярной роговицы",
  custom_soft_irregular_cornea_toric_capable:
    "Для нерегулярной роговицы · toric capable",
  custom_soft_large_diameter: "Мягкая большого диаметра",
  custom_soft_piggyback_carrier: "Piggyback carrier",
  custom_soft_progressive: "Прогрессивная мягкая",
  custom_soft_progressive_toric: "Прогрессивная торическая",
  custom_soft_reverse_geometry: "Мягкая обратной геометрии",
  custom_soft_spherical: "Сферическая мягкая",
  custom_soft_toric: "Торическая мягкая",
  soft_toric_extended_range: "Торическая расширенного диапазона",
};

function applyTheme(theme, persist = false) {
  const activeTheme = theme === "light" ? "light" : "dark";
  const nextTheme = activeTheme === "light" ? "dark" : "light";
  document.documentElement.dataset.theme = activeTheme;
  document.documentElement.style.colorScheme = activeTheme;
  elements.themeIcon.textContent = activeTheme === "light" ? "☾" : "☀";
  elements.themeLabel.textContent =
    activeTheme === "light" ? "Тёмная" : "Светлая";
  elements.themeToggle.dataset.nextTheme = nextTheme;
  elements.themeToggle.setAttribute(
    "aria-pressed",
    String(activeTheme === "light"),
  );
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", activeTheme === "light" ? "#e7e0d4" : "#101112");

  if (persist) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, activeTheme);
    } catch {
      // The theme still applies for this session when storage is unavailable.
    }
  }
}

function initializeTheme() {
  let storedTheme = null;
  try {
    storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    storedTheme = null;
  }
  const preferredTheme = window.matchMedia("(prefers-color-scheme: light)")
    .matches
    ? "light"
    : "dark";
  applyTheme(storedTheme || preferredTheme);
}

function toggleTheme() {
  applyTheme(elements.themeToggle.dataset.nextTheme, true);
}

async function api(path) {
  const response = await fetch(path, {
    headers: { Accept: "application/json" },
  });
  const payload = await response.json();
  if (!response.ok || payload.error) {
    throw new Error(payload.error || `HTTP ${response.status}`);
  }
  return payload;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") {
      return escapeHtml(url.href);
    }
  } catch {
    return "#";
  }
  return "#";
}

function labelParameter(name) {
  return PARAMETER_LABELS[name] || name.replaceAll("_", " ");
}

function labelLensType(value) {
  return LENS_TYPE_LABELS[value] || value.replaceAll("_", " ");
}

function formatRange(range) {
  const unit = range.unit === "degree" ? "°" : ` ${range.unit}`;
  if (range.minimum !== null && range.maximum !== null) {
    return `${range.minimum} — ${range.maximum}${unit}`;
  }
  if (range.maximum !== null) {
    return `до ${range.maximum}${unit}`;
  }
  return `от ${range.minimum}${unit}`;
}

function formatParameter(parameter) {
  if (parameter.availability) {
    const range = formatRange(parameter.availability);
    return parameter.availability.step
      ? `${range} · шаг ${parameter.availability.step}`
      : range;
  }
  if (parameter.allowed_values) {
    const unit =
      parameter.allowed_values.unit === "degree"
        ? "°"
        : ` ${parameter.allowed_values.unit}`;
    return `${parameter.allowed_values.values.join(", ")}${unit}`;
  }
  return "Не указано";
}

function badgeHtml(item) {
  const product = item.product;
  const status =
    product.status === "draft"
      ? '<span class="badge draft">Черновик</span>'
      : '<span class="badge verified">Проверено</span>';
  const rules = item.has_active_ruleset
    ? '<span class="badge rules">Есть ruleset</span>'
    : '<span class="badge reference">Только справочник</span>';
  const conflict = item.unresolved_parameter_conflicts.length
    ? '<span class="badge conflict">Есть конфликт</span>'
    : "";
  return `${status}${rules}${conflict}`;
}

function renderProductCard(item) {
  const product = item.product;
  const parameterPreview = product.parameters
    .slice(0, 4)
    .map(
      (parameter) =>
        `<span class="parameter-chip">${escapeHtml(
          labelParameter(parameter.parameter),
        )}</span>`,
    )
    .join("");
  const selected = state.selected.has(product.product_id);
  const active = state.activeProductId === product.product_id;
  const cardClasses = [
    "product-card",
    product.status === "draft" ? "is-draft" : "",
    active ? "is-active" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return `
    <article class="${cardClasses}" data-product-id="${escapeHtml(
      product.product_id,
    )}">
      <button
        class="card-main"
        type="button"
        data-action="detail"
        data-product-id="${escapeHtml(product.product_id)}"
        aria-label="Открыть карточку ${escapeHtml(
          `${product.brand} ${product.model}`,
        )}"
      >
        <div class="card-topline">
          <span class="brand-label">${escapeHtml(product.brand)}</span>
          <span class="record-label">v${escapeHtml(
            product.record_version,
          )} · ${escapeHtml(product.catalog_version)}</span>
        </div>
        <h3>${escapeHtml(product.model)}</h3>
        <p class="lens-type">${escapeHtml(
          labelLensType(product.lens_type),
        )}</p>
        <div class="card-statuses">${badgeHtml(item)}</div>
        <div class="parameter-preview">
          ${
            parameterPreview ||
            '<span class="parameter-chip">Параметры не подтверждены</span>'
          }
        </div>
      </button>
      <div class="card-footer">
        <span class="details-hint">Открыть сведения →</span>
        <label class="compare-toggle">
          <input
            type="checkbox"
            data-action="compare"
            data-product-id="${escapeHtml(product.product_id)}"
            ${selected ? "checked" : ""}
          >
          <span>Сравнить</span>
        </label>
      </div>
    </article>
  `;
}

function renderResults(items) {
  state.items = items;
  elements.loading.hidden = true;
  elements.resultCount.textContent = String(items.length);
  elements.empty.hidden = items.length !== 0;
  elements.grid.hidden = items.length === 0;
  elements.grid.innerHTML = items.map(renderProductCard).join("");
}

function renderFilters(meta) {
  const statusCounts = {
    source_verified: meta.verified_count,
    draft: meta.draft_count,
  };
  elements.statuses.innerHTML = meta.filters.statuses
    .map(
      (status) => `
        <label class="filter-check">
          <input type="checkbox" name="status" value="${escapeHtml(status)}">
          <span>${escapeHtml(STATUS_LABELS[status] || status)}</span>
          <span>${escapeHtml(statusCounts[status] ?? "—")}</span>
        </label>
      `,
    )
    .join("");

  elements.brands.innerHTML = meta.filters.brands
    .map(
      (brand) => `
        <label class="filter-check">
          <input type="checkbox" name="brand" value="${escapeHtml(brand)}">
          <span>${escapeHtml(brand)}</span>
        </label>
      `,
    )
    .join("");

  appendOptions(
    elements.indication,
    meta.filters.indications.map((item) => ({
      value: item.code,
      label: item.label,
    })),
  );
  appendOptions(
    elements.lensType,
    meta.filters.lens_types.map((value) => ({
      value,
      label: labelLensType(value),
    })),
  );
  appendOptions(
    elements.material,
    meta.filters.materials.map((item) => ({
      value: item.id,
      label: item.label,
    })),
  );
  appendOptions(
    elements.parameter,
    meta.filters.parameters.map((value) => ({
      value,
      label: labelParameter(value),
    })),
  );
}

function appendOptions(select, options) {
  for (const option of options) {
    const node = document.createElement("option");
    node.value = option.value;
    node.textContent = option.label;
    select.append(node);
  }
}

function selectedCheckboxValues(container, name) {
  return Array.from(
    container.querySelectorAll(`input[name="${name}"]:checked`),
  ).map((input) => input.value);
}

function buildSearchParams() {
  const params = new URLSearchParams();
  const q = elements.search.value.trim();
  if (q) params.set("q", q);
  for (const status of selectedCheckboxValues(elements.statuses, "status")) {
    params.append("status", status);
  }
  for (const brand of selectedCheckboxValues(elements.brands, "brand")) {
    params.append("brand", brand);
  }
  if (elements.indication.value) {
    params.append("indication", elements.indication.value);
  }
  if (elements.lensType.value) {
    params.append("lens_type", elements.lensType.value);
  }
  if (elements.material.value) {
    params.append("material", elements.material.value);
  }
  if (elements.parameter.value) {
    params.append("parameter", elements.parameter.value);
  }
  return params;
}

function describeFilters(params) {
  const count = Array.from(params.keys()).length;
  elements.filterSummary.textContent = count
    ? `Активных условий: ${count}`
    : "Показан весь каталог";
}

async function searchCatalog() {
  elements.loading.hidden = false;
  elements.grid.hidden = true;
  elements.empty.hidden = true;
  const params = buildSearchParams();
  describeFilters(params);
  try {
    const payload = await api(
      `/api/v1/catalog/products?${params.toString()}`,
    );
    renderResults(payload.data.items);
  } catch (error) {
    elements.loading.hidden = true;
    showToast(`Не удалось загрузить каталог: ${error.message}`);
  }
}

function renderDetail(item) {
  const product = item.product;
  const parameters = product.parameters.length
    ? `
      <dl class="parameter-list">
        ${product.parameters
          .map(
            (parameter) => `
              <div class="parameter-row">
                <dt>${escapeHtml(labelParameter(parameter.parameter))}</dt>
                <dd>${escapeHtml(formatParameter(parameter))}</dd>
              </div>
            `,
          )
          .join("")}
      </dl>
    `
    : '<div class="warning-box">Актуальные официальные параметры не подтверждены.</div>';

  const indications = listSection(
    "Опубликованные показания",
    product.indications.map((item) => item.label),
  );
  const materials = listSection(
    "Материалы",
    product.materials.map((item) => item.display_name),
  );
  const designFacts = listSection(
    "Конструкция",
    product.design_facts.map((item) => item.text),
  );
  const guidance = product.fitting_guidance
    ? listSection(
        "Первичная примерка",
        product.fitting_guidance.initial_trial.instructions,
      )
    : "";
  const reviewNotes = listSection(
    "Заметки проверки",
    product.clinical_review_notes,
  );
  const sources = item.source_revisions
    .map(
      (source) => `
        <li>
          <a href="${safeUrl(source.url)}" target="_blank" rel="noopener noreferrer">
            ${escapeHtml(source.title)}
          </a>
          <span class="source-meta">
            ${escapeHtml(source.document_revision || "без номера редакции")}
            · получено ${escapeHtml(source.retrieved_at.slice(0, 10))}
          </span>
        </li>
      `,
    )
    .join("");
  const conflictWarning = item.unresolved_parameter_conflicts.length
    ? `
      <div class="warning-box danger">
        Не разрешены расхождения по параметрам:
        ${escapeHtml(
          item.unresolved_parameter_conflicts
            .map(labelParameter)
            .join(", "),
        )}. Эти значения нельзя использовать как hard rule.
      </div>
    `
    : "";
  const draftWarning =
    product.status === "draft"
      ? `
        <div class="warning-box">
          Черновая карточка: актуальный официальный parameter guide пока
          не подтверждён. Matching недоступен.
        </div>
      `
      : "";

  elements.detailContent.innerHTML = `
    <button
      class="icon-button detail-close"
      type="button"
      data-action="close-detail"
      aria-label="Закрыть карточку"
    >×</button>
    <div class="detail-head">
      <span class="brand-label">${escapeHtml(product.brand)}</span>
      <h2>${escapeHtml(product.model)}</h2>
      <p class="detail-subtitle">${escapeHtml(
        labelLensType(product.lens_type),
      )}</p>
      <div class="card-statuses">${badgeHtml(item)}</div>
      ${draftWarning}
      ${conflictWarning}
    </div>
    <section class="detail-section">
      <h3>Доступные параметры</h3>
      ${parameters}
    </section>
    ${indications}
    ${materials}
    ${designFacts}
    ${guidance}
    ${reviewNotes}
    <section class="detail-section">
      <h3>Источники · ${escapeHtml(item.source_revisions.length)}</h3>
      <ul class="source-list">${sources}</ul>
    </section>
    <section class="detail-section">
      <h3>Интеграционная ссылка</h3>
      <div class="parameter-row">
        <dt>Product ID</dt>
        <dd>${escapeHtml(product.product_id)}</dd>
      </div>
      <div class="parameter-row">
        <dt>Версии</dt>
        <dd>catalog ${escapeHtml(product.catalog_version)} · record ${escapeHtml(
          product.record_version,
        )}</dd>
      </div>
    </section>
  `;
  elements.detailPlaceholder.hidden = true;
  elements.detailContent.hidden = false;
  elements.detailPanel.classList.add("is-open");
}

function listSection(title, values) {
  if (!values.length) return "";
  return `
    <section class="detail-section">
      <h3>${escapeHtml(title)}</h3>
      <ul class="simple-list">
        ${values.map((value) => `<li>${escapeHtml(value)}</li>`).join("")}
      </ul>
    </section>
  `;
}

async function openDetail(productId) {
  state.activeProductId = productId;
  renderResults(state.items);
  try {
    const payload = await api(
      `/api/v1/catalog/products/${encodeURIComponent(productId)}`,
    );
    renderDetail(payload.data);
  } catch (error) {
    showToast(`Не удалось открыть карточку: ${error.message}`);
  }
}

function closeDetail() {
  elements.detailPanel.classList.remove("is-open");
  elements.detailContent.hidden = true;
  elements.detailPlaceholder.hidden = false;
  state.activeProductId = null;
  renderResults(state.items);
}

function updateComparisonSelection(productId, checked) {
  if (checked) {
    if (state.selected.size >= 4) {
      showToast("Для одного сравнения можно выбрать не более четырёх моделей.");
      renderResults(state.items);
      return;
    }
    const item = state.items.find(
      (candidate) => candidate.product.product_id === productId,
    );
    if (!item) return;
    state.selected.set(productId, item);
    dispatchSelectionReference(item);
  } else {
    state.selected.delete(productId);
  }
  updateCompareTray();
  renderResults(state.items);
}

function dispatchSelectionReference(item) {
  const product = item.product;
  const detail = {
    product_id: product.product_id,
    catalog_version: product.catalog_version,
    record_version: product.record_version,
    ruleset_id: item.ruleset_id,
    ruleset_version: item.ruleset_version,
    intent: "reference_comparison",
  };
  window.dispatchEvent(
    new CustomEvent(
      state.meta.future_embedding.selection_event,
      { detail },
    ),
  );
}

function updateCompareTray() {
  const values = Array.from(state.selected.values());
  elements.compareCount.textContent = String(values.length);
  elements.compareTray.classList.toggle("has-selection", values.length > 0);
  elements.openComparison.disabled = values.length < 2;
  elements.compareNames.textContent = values.length
    ? values
        .map((item) => `${item.product.brand} ${item.product.model}`)
        .join(" · ")
    : "Можно выбрать до четырёх моделей";
}

function clearComparison() {
  state.selected.clear();
  updateCompareTray();
  renderResults(state.items);
}

async function openComparison() {
  if (state.selected.size < 2) return;
  const params = new URLSearchParams();
  for (const productId of state.selected.keys()) {
    params.append("product_id", productId);
  }
  elements.comparisonContent.innerHTML =
    '<div class="loading-card" aria-label="Загрузка сравнения"></div>';
  elements.comparisonDialog.showModal();
  try {
    const payload = await api(
      `/api/v1/catalog/compare?${params.toString()}`,
    );
    renderComparison(payload.data);
  } catch (error) {
    elements.comparisonContent.textContent =
      `Не удалось выполнить сравнение: ${error.message}`;
  }
}

function renderComparison(comparison) {
  const headerCells = comparison.products
    .map(
      (item) => `
        <th scope="col">
          <span class="brand-label">${escapeHtml(item.product.brand)}</span>
          <strong>${escapeHtml(item.product.model)}</strong>
          ${item.product.status === "draft" ? '<span class="comparison-warning">Черновик</span>' : ""}
        </th>
      `,
    )
    .join("");

  const statusRow = comparison.products
    .map(
      (item) => `
        <td>
          ${item.has_active_ruleset ? "Есть ruleset" : "Только справочник"}
          ${
            item.unresolved_parameter_conflicts.length
              ? '<span class="comparison-warning">Есть конфликт источников</span>'
              : ""
          }
        </td>
      `,
    )
    .join("");

  const parameterRows = comparison.parameter_rows
    .map((row) => {
      const values = comparison.product_ids
        .map((productId) => {
          const value = row.values[productId];
          const conflicts = row.conflicts[productId] || [];
          return `
            <td>
              ${value ? escapeHtml(formatParameter(value)) : "—"}
              ${
                conflicts.length
                  ? '<span class="comparison-warning">Требует ручной проверки</span>'
                  : ""
              }
            </td>
          `;
        })
        .join("");
      return `
        <tr>
          <th scope="row">${escapeHtml(labelParameter(row.parameter))}</th>
          ${values}
        </tr>
      `;
    })
    .join("");

  const indicationRow = comparison.product_ids
    .map(
      (productId) =>
        `<td>${escapeHtml(
          (comparison.indication_codes[productId] || []).join(", ") || "—",
        )}</td>`,
    )
    .join("");

  elements.comparisonContent.innerHTML = `
    <div class="warning-box">
      Сравнение показывает опубликованные возможности моделей. Оно не
      ранжирует линзы и не формирует назначение.
    </div>
    <table class="comparison-table">
      <thead>
        <tr>
          <th scope="col">Характеристика</th>
          ${headerCells}
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">Режим</th>
          ${statusRow}
        </tr>
        <tr>
          <th scope="row">Показания</th>
          ${indicationRow}
        </tr>
        ${parameterRows}
      </tbody>
    </table>
  `;
}

function resetFilters() {
  elements.search.value = "";
  for (const checkbox of document.querySelectorAll(
    '#status-filters input, #brand-filters input',
  )) {
    checkbox.checked = false;
  }
  elements.indication.value = "";
  elements.lensType.value = "";
  elements.material.value = "";
  elements.parameter.value = "";
  searchCatalog();
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 3200);
}

function scheduleSearch() {
  window.clearTimeout(state.searchTimer);
  state.searchTimer = window.setTimeout(searchCatalog, 180);
}

function bindEvents() {
  elements.themeToggle.addEventListener("click", toggleTheme);
  elements.search.addEventListener("input", scheduleSearch);
  elements.statuses.addEventListener("change", searchCatalog);
  elements.brands.addEventListener("change", searchCatalog);
  for (const select of [
    elements.indication,
    elements.lensType,
    elements.material,
    elements.parameter,
  ]) {
    select.addEventListener("change", searchCatalog);
  }
  elements.reset.addEventListener("click", resetFilters);
  elements.emptyReset.addEventListener("click", resetFilters);
  elements.clearComparison.addEventListener("click", clearComparison);
  elements.openComparison.addEventListener("click", openComparison);
  elements.closeComparison.addEventListener("click", () => {
    elements.comparisonDialog.close();
  });

  elements.grid.addEventListener("click", (event) => {
    const detailButton = event.target.closest('[data-action="detail"]');
    if (detailButton) {
      openDetail(detailButton.dataset.productId);
    }
  });
  elements.grid.addEventListener("change", (event) => {
    const compare = event.target.closest('[data-action="compare"]');
    if (compare) {
      updateComparisonSelection(compare.dataset.productId, compare.checked);
    }
  });
  elements.detailContent.addEventListener("click", (event) => {
    if (event.target.closest('[data-action="close-detail"]')) {
      closeDetail();
    }
  });
  elements.comparisonDialog.addEventListener("click", (event) => {
    if (event.target === elements.comparisonDialog) {
      elements.comparisonDialog.close();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.comparisonDialog.open) {
      closeDetail();
    }
  });
}

async function init() {
  initializeTheme();
  bindEvents();
  try {
    const payload = await api("/api/v1/meta");
    state.meta = payload.data;
    renderFilters(state.meta);
    elements.summary.textContent =
      `${state.meta.product_count} моделей · каталог ${state.meta.catalog_version}`;
    await searchCatalog();
  } catch (error) {
    elements.loading.hidden = true;
    showToast(`Ошибка запуска справочника: ${error.message}`);
  }
}

init();

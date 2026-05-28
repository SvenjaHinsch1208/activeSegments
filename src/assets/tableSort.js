const tables = Array.from(document.querySelectorAll(".segments-table__table"));

const parseDateValue = (value) => {
  const match = value.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) {
    return Number.NaN;
  }

  const [, day, month, year] = match;
  return Number(`${year}${month}${day}`);
};

const parseNumberValue = (value) => {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const parseValue = (value, type) => {
  if (type === "number") {
    return parseNumberValue(value);
  }

  if (type === "date") {
    return parseDateValue(value);
  }

  return value.trim().toLocaleLowerCase();
};

const compareValues = (left, right, direction) => {
  const leftInvalid = Number.isNaN(left);
  const rightInvalid = Number.isNaN(right);

  if (leftInvalid && rightInvalid) {
    return 0;
  }

  if (leftInvalid) {
    return 1;
  }

  if (rightInvalid) {
    return -1;
  }

  if (left < right) {
    return direction === "asc" ? -1 : 1;
  }

  if (left > right) {
    return direction === "asc" ? 1 : -1;
  }

  return 0;
};

const resetSortState = (headers) => {
  headers.forEach((header) => {
    header.setAttribute("aria-sort", "none");
    header.removeAttribute("data-sort-direction");
  });
};

const getDetailRow = (table, segmentRow) => {
  const detailRowId = segmentRow.dataset.accordionToggle;
  if (!detailRowId) {
    return null;
  }
  return table.querySelector(`#${detailRowId}`);
};

const sortTable = (table, headerButton) => {
  const headerCell = headerButton.closest("th");
  const headerRow = headerCell?.parentElement;
  const tbody = table.querySelector("tbody");

  if (!headerCell || !headerRow || !tbody) {
    return;
  }

  const headers = Array.from(headerRow.querySelectorAll("th"));
  const columnIndex = headers.indexOf(headerCell);
  const sortType = headerButton.dataset.sortType ?? "text";
  const nextDirection = headerCell.dataset.sortDirection === "asc" ? "desc" : "asc";
  const rows = Array.from(tbody.querySelectorAll('tr[data-row-type="segment"]'));

  rows.sort((leftRow, rightRow) => {
    const leftCell = leftRow.children[columnIndex];
    const rightCell = rightRow.children[columnIndex];
    const leftValue = parseValue(leftCell?.textContent ?? "", sortType);
    const rightValue = parseValue(rightCell?.textContent ?? "", sortType);
    return compareValues(leftValue, rightValue, nextDirection);
  });

  const fragment = document.createDocumentFragment();
  rows.forEach((row) => {
    const detailRow = getDetailRow(table, row);
    fragment.append(row);
    if (detailRow) {
      fragment.append(detailRow);
    }
  });

  resetSortState(headers);
  headerCell.dataset.sortDirection = nextDirection;
  headerCell.setAttribute("aria-sort", nextDirection === "asc" ? "ascending" : "descending");
  tbody.append(fragment);
};

const toggleAccordionRow = (table, segmentRow) => {
  const detailRow = getDetailRow(table, segmentRow);
  if (!detailRow) {
    return;
  }

  const isExpanded = segmentRow.getAttribute("aria-expanded") === "true";
  segmentRow.setAttribute("aria-expanded", isExpanded ? "false" : "true");
  detailRow.hidden = isExpanded;
};

const closeAccordionRow = (table, segmentRow) => {
  const detailRow = getDetailRow(table, segmentRow);
  if (!detailRow) {
    return;
  }

  segmentRow.setAttribute("aria-expanded", "false");
  detailRow.hidden = true;
};

const isInteractiveTarget = (target) =>
  target.closest("a, button, input, select, textarea, label");

tables.forEach((table) => {
  const sortButtons = Array.from(table.querySelectorAll(".segments-table__sort-button"));
  sortButtons.forEach((button) => {
    button.addEventListener("click", () => sortTable(table, button));
  });

  const tbody = table.querySelector("tbody");
  if (!tbody) {
    return;
  }

  tbody.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || isInteractiveTarget(target)) {
      return;
    }

    const segmentRow = target.closest('tr[data-row-type="segment"]');
    if (!(segmentRow instanceof HTMLTableRowElement)) {
      return;
    }

    if (segmentRow.id) {
      history.replaceState(null, "", `#${encodeURIComponent(segmentRow.id)}`);
    }

    focusTargetRow(table, segmentRow, { scroll: false });
  });

  tbody.addEventListener("keydown", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLTableRowElement)) {
      return;
    }

    if (target.dataset.rowType !== "segment") {
      return;
    }

    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    if (target.id) {
      history.replaceState(null, "", `#${encodeURIComponent(target.id)}`);
    }

    focusTargetRow(table, target, { scroll: false });
  });
});

const TARGET_ROW_CLASS = "segments-table__row--target";

const clearTargetRows = () => {
  document
    .querySelectorAll(`.${TARGET_ROW_CLASS}`)
    .forEach((row) => row.classList.remove(TARGET_ROW_CLASS));
};

const setTargetRow = (targetRow) => {
  clearTargetRows();
  targetRow.classList.add(TARGET_ROW_CLASS);
};

const focusTargetRow = (table, targetRow, { scroll = true } = {}) => {
  if (!(targetRow instanceof HTMLTableRowElement)) {
    return;
  }

  if (targetRow.dataset.rowType !== "segment") {
    return;
  }

  const isExpanded = targetRow.getAttribute("aria-expanded") === "true";
  if (isExpanded) {
    closeAccordionRow(table, targetRow);
    clearTargetRows();
    history.replaceState(null, "", window.location.pathname + window.location.search);
    if (scroll) {
      targetRow.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return;
  }

  const expandedRow = table.querySelector('tr[data-row-type="segment"][aria-expanded="true"]');
  if (expandedRow instanceof HTMLTableRowElement && expandedRow !== targetRow) {
    closeAccordionRow(table, expandedRow);
  }

  toggleAccordionRow(table, targetRow);
  setTargetRow(targetRow);

  if (scroll) {
    targetRow.scrollIntoView({ behavior: "smooth", block: "center" });
  }
};

const focusHashRow = () => {
  const hash = window.location.hash;
  if (!hash || hash.length < 2) {
    return;
  }

  const escaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(hash.slice(1)) : hash.slice(1);
  const targetRow = document.getElementById(decodeURIComponent(hash.slice(1))) || document.querySelector(`#${escaped}`);
  if (!(targetRow instanceof HTMLTableRowElement)) {
    return;
  }

  if (targetRow.dataset.rowType !== "segment") {
    return;
  }

  const table = targetRow.closest(".segments-table__table");
  if (!table) {
    return;
  }

  focusTargetRow(table, targetRow, { scroll: true });
};

window.addEventListener("hashchange", focusHashRow);
focusHashRow();


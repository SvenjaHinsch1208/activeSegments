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

    toggleAccordionRow(table, segmentRow);
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
    toggleAccordionRow(table, target);
  });
});

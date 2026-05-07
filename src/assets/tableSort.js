const tables = Array.from(document.querySelectorAll(".segments-table__table"));

const parseDateValue = (value) => {
  const match = value.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) {
    return Number.NaN;
  }

  const [, day, month, year] = match;
  return Number(`${year}${month}${day}`);
};

const parseValue = (value, type) => {
  if (type === "number") {
    return Number(value.trim());
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
  const rows = Array.from(tbody.querySelectorAll("tr"));

  rows.sort((leftRow, rightRow) => {
    const leftCell = leftRow.children[columnIndex];
    const rightCell = rightRow.children[columnIndex];
    const leftValue = parseValue(leftCell?.textContent ?? "", sortType);
    const rightValue = parseValue(rightCell?.textContent ?? "", sortType);
    return compareValues(leftValue, rightValue, nextDirection);
  });

  resetSortState(headers);
  headerCell.dataset.sortDirection = nextDirection;
  headerCell.setAttribute("aria-sort", nextDirection === "asc" ? "ascending" : "descending");
  tbody.append(...rows);
};

tables.forEach((table) => {
  const sortButtons = Array.from(table.querySelectorAll(".segments-table__sort-button"));
  sortButtons.forEach((button) => {
    button.addEventListener("click", () => sortTable(table, button));
  });
});


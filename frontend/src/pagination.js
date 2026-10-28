// Paginarea listelor în browser: serverul trimite toată lista, pagina arată câte PAGE_SIZE.
export const PAGE_SIZE = 10

// Câte pagini sunt (minim 1, ca o listă goală să aibă totuși „pagina 1”)
export function pageCount(total) {
  return Math.max(1, Math.ceil(total / PAGE_SIZE))
}

// Valoarea din adresă (`?pagina=`) -> o pagină validă: lipsă sau text -> 1, prea mare -> ultima
export function clampPage(value, total) {
  const page = Number.parseInt(value, 10)
  if (!Number.isFinite(page) || page < 1) return 1
  return Math.min(page, pageCount(total))
}

// Elementele paginii `page` (numerotate de la 1), în ordinea listei
export function pageItems(items, page) {
  const start = (page - 1) * PAGE_SIZE
  return items.slice(start, start + PAGE_SIZE)
}

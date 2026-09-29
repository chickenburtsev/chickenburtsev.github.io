/*
 * Site config — the ONLY place to edit external project links (shared by index.html and ru.html).
 *
 * COCOFLY_URL — the game. When it moves, change this one line, e.g. 'https://cocofly.app'.
 *
 * RESEARCH — the research dossiers shown in the “Research notes” cards (matched by `id`).
 *   They are claude.ai artifacts. Recruiters can only open them once each one is shared
 *   publicly (artifact → Share → “Anyone with the link”) or re-hosted elsewhere —
 *   then paste the public URL here. Set url to '' to show the card with “Available on request”.
 */
window.VB_CONFIG = {
  COCOFLY_URL: 'https://cocofly.vpurcev.workers.dev',

  RESEARCH: [
    { id: 'atlas',    url: '' /* private for now: 'https://claude.ai/artifact/J1PsVHLN6VZf4EUz5vCJni' */ }, // Атлас ИИ-трансформации
    { id: 'chron',    url: '' /* private for now: 'https://claude.ai/artifact/HUATqUaQEG6byoxBmi9Pqr' */ }, // Хроники 2035
    { id: 'body',     url: '' /* private for now: 'https://claude.ai/artifact/JgJeXmJ3aqUCF5Qp8hHwkn' */ }, // Тело для ИИ
    { id: 'fork',     url: '' /* private for now: 'https://claude.ai/artifact/HW5RL8aia9FR9Q6fBLRu1i' */ }, // Развилка 2026
    { id: 'tree',     url: '' /* private for now: 'https://claude.ai/artifact/2gYjtPMKWQcguCp7Cc5Xz6' */ }, // Дерево ускорения
    { id: 'pantheon', url: '' /* private for now: 'https://claude.ai/artifact/3K1HAmiQJYsZKuEuUihELF' */ }  // Пантеон и чужие умы
    // { id: 'front', url: '' } // «Фронт и ИИ» — deliberately NOT shown on the public page (its card is commented out in the HTML)
  ]
};

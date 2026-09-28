const routes = new Set([
  "dashboard",
  "groups",
  "members",
  "contributions",
  "loans",
  "repayments"
]);

const sections = new Map([...routes].map(route => [route, document.querySelector(`#${route}-page`)]));
const pageHandlers = new Map();
let activeRoute = resolveRoute();
let activePageTask = Promise.resolve();

function resolveRoute() {
  const route = window.location.hash.slice(1);
  return routes.has(route) ? route : "dashboard";
}

function renderRoute(route) {
  activeRoute = routes.has(route) ? route : "dashboard";

  for (const [name, section] of sections) {
    section.hidden = name !== activeRoute;
  }

  document.querySelectorAll(".main-nav a[href^='#']").forEach(link => {
    const isActive = link.hash === `#${activeRoute}`;
    link.classList.toggle("is-active", isActive);
    if (isActive) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });

  const handler = pageHandlers.get(activeRoute);
  activePageTask = handler ? Promise.resolve().then(handler) : Promise.resolve();
  return activePageTask;
}

export function currentRoute() {
  return activeRoute;
}

export function navigateTo(route) {
  if (!routes.has(route)) return Promise.resolve();
  if (route === activeRoute) return activePageTask;

  const hash = `#${route}`;
  if (window.location.hash !== hash) window.history.pushState(null, "", hash);
  return renderRoute(route);
}

export function onPage(route, handler) {
  pageHandlers.set(route, handler);
  if (route === activeRoute) {
    activePageTask = Promise.resolve().then(handler);
    return activePageTask;
  }
  return Promise.resolve();
}

function syncRouteFromHistory() {
  const route = resolveRoute();
  if (window.location.hash !== `#${route}`) {
    window.history.replaceState(null, "", `#${route}`);
  }
  if (route !== activeRoute) renderRoute(route);
}

document.addEventListener("click", event => {
  const link = event.target.closest(".main-nav a[href^='#'], .brand[href='#dashboard']");
  if (!link) return;
  event.preventDefault();
  navigateTo(link.hash.slice(1));
});

window.addEventListener("popstate", syncRouteFromHistory);
window.addEventListener("hashchange", syncRouteFromHistory);

if (!routes.has(window.location.hash.slice(1))) {
  window.history.replaceState(null, "", "#dashboard");
}
renderRoute(activeRoute);

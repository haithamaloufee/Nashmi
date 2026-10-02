// One coordinator per feed document, including videos appended by pagination.
type Player = { video: HTMLVideoElement; start: () => void; reset: () => void; ratio: number; suspended: boolean };
const players = new Map<Element, Player>();
let observer: IntersectionObserver | undefined;
let active: Player | undefined;
let observedTop = -1;

function isFullscreen(player: Player) {
  return Boolean(document.fullscreenElement?.contains(player.video));
}

function selectVisiblePlayer() {
  if (document.hidden) { active?.video.pause(); return; }
  if (active && isFullscreen(active)) return;
  const candidates = [...players.values()].filter(player => player.ratio >= 0.6);
  candidates.sort((a, b) => b.ratio - a.ratio);
  const next = candidates[0];
  if (active !== next) active?.video.pause();
  active = next;
  if (next && !next.suspended) next.start();
}

export function registerFeedVideo(video: HTMLVideoElement, start: () => void, reset: () => void) {
  const player: Player = { video, start, reset, ratio: 0, suspended: false };
  players.set(video, player);
  if (!observer && typeof IntersectionObserver !== "undefined") {
    observeViewport();
    window.addEventListener("resize", observeViewport);
    document.addEventListener("visibilitychange", selectVisiblePlayer);
    document.addEventListener("fullscreenchange", selectVisiblePlayer);
  }
  observer?.observe(video);
  return {
    refresh: selectVisiblePlayer,
    play() {
      for (const other of players.values()) if (other !== player) other.video.pause();
      active = player;
      player.suspended = false;
      player.start();
    },
    suspend() { player.suspended = true; video.pause(); },
    dispose() {
      observer?.unobserve(video);
      players.delete(video);
      video.pause();
      if (active === player) active = undefined;
      if (!players.size) {
        observer?.disconnect(); observer = undefined;
        observedTop = -1;
        window.removeEventListener("resize", observeViewport);
        document.removeEventListener("visibilitychange", selectVisiblePlayer);
        document.removeEventListener("fullscreenchange", selectVisiblePlayer);
      } else queueMicrotask(selectVisiblePlayer);
    }
  };
}

function observeViewport() {
  // Exclude the sticky navbar, including its taller mobile layout.
  const top = Math.ceil(document.querySelector(".social-navbar")?.getBoundingClientRect().height || 0);
  if (observer && observedTop === top) return;
  observedTop = top;
  observer?.disconnect();
  observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const current = players.get(entry.target);
      if (!current) continue;
      current.ratio = entry.intersectionRatio;
      if (current.ratio < 0.2) { current.suspended = false; current.reset(); }
      if (current.ratio < 0.6 && !isFullscreen(current)) current.video.pause();
    }
    selectVisiblePlayer();
  }, { rootMargin: `-${top}px 0px 0px 0px`, threshold: [0, 0.2, 0.4, 0.6, 0.8, 1] });
  for (const element of players.keys()) observer.observe(element);
}

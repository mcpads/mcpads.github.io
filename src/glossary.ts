/**
 * 본문에 표시된 용어를 눌렀을 때 뜻풀이를 띄운다.
 *
 * 뜻풀이는 글 안의 <dl class="note-glossary">에 한 번만 적혀 있고, 본문 표시는
 * 그 정의를 가리키기만 한다. 그래서 스크립트가 실행되지 않아도 독자는 정의를
 * 글 안에서 그대로 읽을 수 있고, 스크린 리더는 aria-describedby로 팝업 없이 듣는다.
 */

const OPEN_DELAY_MS = 120;
const CLOSE_DELAY_MS = 200;
const GAP_FROM_TERM = 8;
const EDGE_MARGIN = 12;

type TermTrigger = HTMLElement & { dataset: { term: string } };

const triggers = Array.from(
  document.querySelectorAll<HTMLElement>("[data-term]"),
).filter((element): element is TermTrigger => Boolean(element.dataset.term));

if (triggers.length > 0) {
  startGlossary(triggers);
}

function startGlossary(termTriggers: TermTrigger[]): void {
  const tip = createTip();
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  let openTrigger: TermTrigger | undefined;
  let openTimer: number | undefined;
  let closeTimer: number | undefined;
  let closedByOwnTrigger = false;

  document.body.append(tip);

  function clearTimers(): void {
    window.clearTimeout(openTimer);
    window.clearTimeout(closeTimer);
    openTimer = undefined;
    closeTimer = undefined;
  }

  function isOpen(): boolean {
    return tip.matches(":popover-open");
  }

  function open(trigger: TermTrigger): void {
    clearTimers();
    if (!fillTip(tip, trigger.dataset.term)) return;

    if (openTrigger && openTrigger !== trigger) openTrigger.setAttribute("aria-expanded", "false");
    openTrigger = trigger;
    trigger.setAttribute("aria-expanded", "true");

    delete tip.dataset.placed;
    if (!isOpen()) tip.showPopover();
    placeTip(tip, trigger);
    tip.dataset.placed = "true";
  }

  function close(): void {
    clearTimers();
    if (isOpen()) tip.hidePopover();
  }

  tip.addEventListener("toggle", (event) => {
    if ((event as ToggleEvent).newState === "open") return;
    openTrigger?.setAttribute("aria-expanded", "false");
    openTrigger = undefined;
    delete tip.dataset.placed;
  });

  for (const trigger of termTriggers) {
    trigger.setAttribute("aria-expanded", "false");

    // 라이트 디스미스가 pointerdown에서 먼저 팝업을 닫기 때문에, 열려 있던 용어를
    // 다시 누른 것인지 여기서 기억해 두어야 click에서 다시 열지 말지 가릴 수 있다.
    trigger.addEventListener("pointerdown", () => {
      closedByOwnTrigger = isOpen() && openTrigger === trigger;
    });

    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      if (closedByOwnTrigger) {
        closedByOwnTrigger = false;
        close();
        return;
      }
      open(trigger);
    });

    // span에 button 역할을 줬으므로 Enter·Space는 직접 처리해야 한다.
    trigger.addEventListener("keydown", (event) => {
      const { key } = event as KeyboardEvent;
      if (key !== "Enter" && key !== " ") return;
      event.preventDefault();
      if (isOpen() && openTrigger === trigger) close();
      else open(trigger);
    });

    if (canHover) {
      trigger.addEventListener("pointerenter", () => {
        clearTimers();
        openTimer = window.setTimeout(() => open(trigger), OPEN_DELAY_MS);
      });
      trigger.addEventListener("pointerleave", () => {
        window.clearTimeout(openTimer);
        closeTimer = window.setTimeout(close, CLOSE_DELAY_MS);
      });
    }

    trigger.addEventListener("focus", () => open(trigger));
    trigger.addEventListener("blur", () => {
      closeTimer = window.setTimeout(close, CLOSE_DELAY_MS);
    });
  }

  // 뜻풀이 위로 마우스를 옮겨도 닫히지 않아야 문장을 끝까지 읽을 수 있다.
  tip.addEventListener("pointerenter", clearTimers);
  tip.addEventListener("pointerleave", () => {
    closeTimer = window.setTimeout(close, CLOSE_DELAY_MS);
  });

  window.addEventListener(
    "scroll",
    () => {
      if (isOpen() && openTrigger) placeTip(tip, openTrigger);
    },
    { passive: true },
  );
  window.addEventListener("resize", () => {
    if (isOpen() && openTrigger) placeTip(tip, openTrigger);
  });
}

function createTip(): HTMLElement {
  const tip = document.createElement("div");
  tip.className = "term-tip";
  tip.setAttribute("popover", "auto");
  tip.setAttribute("role", "tooltip");
  tip.innerHTML = '<p class="term-tip-name"></p><p class="term-tip-body"></p>';
  return tip;
}

function fillTip(tip: HTMLElement, term: string): boolean {
  const definition = document.getElementById(`glo-${term}`);
  const name = definition?.parentElement?.querySelector("dt")?.textContent?.trim();
  const body = definition?.textContent?.replace(/\s+/g, " ").trim();
  if (!name || !body) return false;

  tip.querySelector(".term-tip-name")!.textContent = name;
  tip.querySelector(".term-tip-body")!.textContent = body;
  return true;
}

function placeTip(tip: HTMLElement, trigger: HTMLElement): void {
  const anchor = trigger.getBoundingClientRect();
  const box = tip.getBoundingClientRect();
  const centred = anchor.left + anchor.width / 2 - box.width / 2;
  const rightmost = window.innerWidth - box.width - EDGE_MARGIN;
  const fitsAbove = anchor.top > box.height + GAP_FROM_TERM + EDGE_MARGIN;

  tip.style.left = `${Math.round(Math.min(Math.max(EDGE_MARGIN, centred), Math.max(EDGE_MARGIN, rightmost)))}px`;
  tip.style.top = `${Math.round(
    fitsAbove ? anchor.top - box.height - GAP_FROM_TERM : anchor.bottom + GAP_FROM_TERM,
  )}px`;
  tip.dataset.side = fitsAbove ? "above" : "below";
}

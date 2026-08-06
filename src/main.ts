import {
  findCurrentNavigationSection,
  type NavigationSectionPosition,
} from "./navigation";

type PageLanguage = "ko" | "en";

const languageButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>("[data-language]"),
);
const translatedElements = Array.from(
  document.querySelectorAll<HTMLElement>("[data-copy]"),
);
const translatedLabels = Array.from(
  document.querySelectorAll<HTMLElement>("[data-aria-label-ko][data-aria-label-en]"),
);
const menuToggle = document.querySelector<HTMLButtonElement>(".menu-toggle");
const siteNavigation = document.querySelector<HTMLElement>(".site-navigation");
const siteHeader = document.querySelector<HTMLElement>(".site-header");
const navigationLinks = Array.from(
  document.querySelectorAll<HTMLAnchorElement>("[data-section-link]"),
);
const navigationSections = Array.from(
  document.querySelectorAll<HTMLElement>("[data-navigation-section]"),
);
let currentPageLanguage: PageLanguage = "ko";
let navigationUpdateFrame: number | undefined;

function isPageLanguage(value: string | null): value is PageLanguage {
  return value === "ko" || value === "en";
}

function readSavedLanguage(): PageLanguage {
  const savedLanguage = window.localStorage.getItem("page-language");
  return isPageLanguage(savedLanguage) ? savedLanguage : "ko";
}

function setPageLanguage(language: PageLanguage): void {
  currentPageLanguage = language;
  document.documentElement.lang = language;
  window.localStorage.setItem("page-language", language);

  translatedElements.forEach((element) => {
    element.hidden = element.dataset.copy !== language;
  });

  translatedLabels.forEach((element) => {
    const label = language === "ko"
      ? element.dataset.ariaLabelKo
      : element.dataset.ariaLabelEn;
    if (label) element.setAttribute("aria-label", label);
  });

  languageButtons.forEach((button) => {
    const isActive = button.dataset.language === language;
    button.setAttribute("aria-pressed", String(isActive));
  });

  updateMenuToggleLabel(menuToggle?.getAttribute("aria-expanded") === "true");
  scheduleNavigationUpdate();
}

function updateMenuToggleLabel(isOpen: boolean): void {
  const label = menuToggle?.querySelector<HTMLElement>(".sr-only");
  if (!label) return;

  const menuLabels = {
    ko: isOpen ? "메뉴 닫기" : "메뉴 열기",
    en: isOpen ? "Close menu" : "Open menu",
  };
  label.textContent = menuLabels[currentPageLanguage];
}

function closeMobileNavigation(): void {
  if (!menuToggle || !siteNavigation) return;

  menuToggle.setAttribute("aria-expanded", "false");
  siteNavigation.dataset.open = "false";
  updateMenuToggleLabel(false);
}

function toggleMobileNavigation(): void {
  if (!menuToggle || !siteNavigation) return;

  const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isOpen));
  siteNavigation.dataset.open = String(!isOpen);
  updateMenuToggleLabel(!isOpen);
}

function updateCurrentSection(sectionId: string | null): void {
  navigationLinks.forEach((link) => {
    const isCurrent = link.dataset.sectionLink === sectionId;
    if (isCurrent) {
      link.setAttribute("aria-current", "location");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function readNavigationSectionPositions(): NavigationSectionPosition[] {
  return navigationSections.flatMap((section) => {
    const navigationId = section.dataset.navigationSection;
    return navigationId ? [{ navigationId, top: section.offsetTop }] : [];
  });
}

function updateCurrentNavigationSection(): void {
  const headerHeight = siteHeader?.offsetHeight ?? 0;
  const viewportMarkerOffset = Math.min(window.innerHeight * 0.3, 240);
  const markerY = window.scrollY + headerHeight + viewportMarkerOffset;
  const currentSection = findCurrentNavigationSection(
    markerY,
    readNavigationSectionPositions(),
  );
  updateCurrentSection(currentSection);
}

function scheduleNavigationUpdate(): void {
  if (navigationUpdateFrame !== undefined) return;

  navigationUpdateFrame = window.requestAnimationFrame(() => {
    navigationUpdateFrame = undefined;
    updateCurrentNavigationSection();
  });
}

languageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const language = button.dataset.language ?? null;
    if (isPageLanguage(language)) setPageLanguage(language);
  });
});

menuToggle?.addEventListener("click", toggleMobileNavigation);
navigationLinks.forEach((link) => link.addEventListener("click", closeMobileNavigation));

window.addEventListener("scroll", scheduleNavigationUpdate, { passive: true });
window.addEventListener("resize", scheduleNavigationUpdate);

document.querySelectorAll<HTMLElement>("[data-current-year]").forEach((element) => {
  element.textContent = String(new Date().getFullYear());
});

setPageLanguage(readSavedLanguage());
updateCurrentNavigationSection();

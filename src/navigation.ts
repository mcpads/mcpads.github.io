export interface NavigationSectionPosition {
  navigationId: string;
  top: number;
}

export function findCurrentNavigationSection(
  markerY: number,
  sections: readonly NavigationSectionPosition[],
): string | null {
  let currentSection: string | null = null;

  for (const section of sections) {
    if (section.top > markerY) break;
    currentSection = section.navigationId;
  }

  return currentSection;
}

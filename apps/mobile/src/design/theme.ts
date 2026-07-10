export const colors = {
  background: "#eee4d6",
  surface: "#ffffff",
  surfaceSoft: "#fbf7f0",
  surfaceMuted: "#f4eadc",
  border: "#d8c8b6",
  borderStrong: "#c9b49c",
  text: "#2f2118",
  textSoft: "#7d6d5c",
  textMuted: "#8a7865",
  primary: "#6d4c2f",
  primaryDark: "#4a301f",
  teal: "#6d4c2f",
  green: "#6d4c2f",
  gold: "#f1d7a4",
  blueSoft: "#f4eadc",
  blue: "#6d4c2f",
  danger: "#b42318",
  dangerSoft: "#fff5f3",
} as const;

export const radius = {
  sm: 8,
  md: 10,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 10,
  lg: 14,
  xl: 18,
} as const;

export const typography = {
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
  },
  button: {
    fontWeight: "800",
  },
} as const;

export const copy = {
  defaultMeetingPoint: "Lobby / main entrance",
} as const;

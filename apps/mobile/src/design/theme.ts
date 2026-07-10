export const colors = {
  background: "#eef8f8",
  surface: "#ffffff",
  surfaceSoft: "#f6fffc",
  surfaceMuted: "#f8fbfa",
  border: "#d7e2df",
  borderStrong: "#b9ddd6",
  text: "#10231f",
  textSoft: "#50615d",
  textMuted: "#6d7875",
  primary: "#0793a4",
  primaryDark: "#0b6f78",
  teal: "#0b8f88",
  green: "#087f5b",
  gold: "#f3d17c",
  blueSoft: "#edf4ff",
  blue: "#1d4ed8",
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

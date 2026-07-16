interface IconProps {
  name: "play" | "book" | "settings" | "team" | "spark" | "arrow" | "check";
}

export function Icon({ name }: IconProps) {
  if (name === "play") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>;
  }
  if (name === "book") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H20v17H7.5A3.5 3.5 0 0 0 4 22V5.5Zm4 0V17h9V5H8Z" /></svg>;
  }
  if (name === "settings") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.4 13.5a7.8 7.8 0 0 0 0-3l2-1.5-2-3.5-2.4 1a8.3 8.3 0 0 0-2.6-1.5L14 2h-4l-.4 3a8.3 8.3 0 0 0-2.6 1.5l-2.4-1-2 3.5 2 1.5a7.8 7.8 0 0 0 0 3l-2 1.5 2 3.5 2.4-1a8.3 8.3 0 0 0 2.6 1.5l.4 3h4l.4-3a8.3 8.3 0 0 0 2.6-1.5l2.4 1 2-3.5-2-1.5ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z" /></svg>;
  }
  if (name === "team") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm8.5 1a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7ZM2 21a6 6 0 0 1 12 0H2Zm11.5 0a7.4 7.4 0 0 0-1.8-4.8A5.5 5.5 0 0 1 22 19.1V21h-8.5Z" /></svg>;
  }
  if (name === "spark") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 2.5 6.5L21 11l-6.5 2.5L12 20l-2.5-6.5L3 11l6.5-2.5L12 2Z" /></svg>;
  }
  if (name === "check") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.2 16.6 4.9 12.3l-1.9 1.9 6.2 6.2L21.4 8.2l-1.9-1.9L9.2 16.6Z" /></svg>;
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13 5 7 7-7 7-1.5-1.5 4.4-4.5H4v-2h11.9l-4.4-4.5L13 5Z" /></svg>;
}

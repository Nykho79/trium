export type IconName =
  | "play"
  | "book"
  | "settings"
  | "team"
  | "spark"
  | "arrow"
  | "check"
  | "close"
  | "trophy"
  | "timer"
  | "alert"
  | "bolt"
  | "captain"
  | "joker"
  | "star"
  | "loader"
  | "shield"
  | "volume"
  | "medal"
  | "target";

interface IconProps {
  name: IconName;
  className?: string;
}

const paths: Record<IconName, string> = {
  play: "M8 5v14l11-7z",
  book: "M4 5.5A3.5 3.5 0 0 1 7.5 2H20v17H7.5A3.5 3.5 0 0 0 4 22V5.5Zm4 0V17h9V5H8Z",
  settings: "M19.4 13.5a7.8 7.8 0 0 0 0-3l2-1.5-2-3.5-2.4 1a8.3 8.3 0 0 0-2.6-1.5L14 2h-4l-.4 3a8.3 8.3 0 0 0-2.6 1.5l-2.4-1-2 3.5 2 1.5a7.8 7.8 0 0 0 0 3l-2 1.5 2 3.5 2.4-1a8.3 8.3 0 0 0 2.6 1.5l.4 3h4l.4-3a8.3 8.3 0 0 0 2.6-1.5l2.4 1 2-3.5-2-1.5ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z",
  team: "M8 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm8.5 1a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7ZM2 21a6 6 0 0 1 12 0H2Zm11.5 0a7.4 7.4 0 0 0-1.8-4.8A5.5 5.5 0 0 1 22 19.1V21h-8.5Z",
  spark: "m12 2 2.5 6.5L21 11l-6.5 2.5L12 20l-2.5-6.5L3 11l6.5-2.5L12 2Z",
  arrow: "m13 5 7 7-7 7-1.5-1.5 4.4-4.5H4v-2h11.9l-4.4-4.5L13 5Z",
  check: "M9.2 16.6 4.9 12.3 3 14.2l6.2 6.2L21.4 8.2l-1.9-1.9L9.2 16.6Z",
  close: "m6.4 4.9 5.6 5.6 5.6-5.6 1.5 1.5-5.6 5.6 5.6 5.6-1.5 1.5-5.6-5.6-5.6 5.6-1.5-1.5 5.6-5.6-5.6-5.6 1.5-1.5Z",
  trophy: "M6 3h12v3h3v2a6 6 0 0 1-5.2 5.9A6 6 0 0 1 13 16.9V19h4v2H7v-2h4v-2.1a6 6 0 0 1-2.8-3A6 6 0 0 1 3 8V6h3V3Zm0 5H5a4 4 0 0 0 2.5 3.7A7 7 0 0 1 6 8Zm12 0a7 7 0 0 1-1.5 3.7A4 4 0 0 0 19 8h-1Z",
  timer: "M10 2h4v2h-4V2Zm1 11V7h2v7h-2Zm1 9a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm6.4-14.8 1.4-1.4 1.4 1.4-1.4 1.4-1.4-1.4Z",
  alert: "M12 2 22 20H2L12 2Zm-1 7v5h2V9h-2Zm0 7v2h2v-2h-2Z",
  bolt: "M13 2 4 13h7l-1 9 10-12h-7l1-8Z",
  captain: "M12 2 15 8l6 .8-4.4 4.4 1.1 6.2L12 16.5 6.3 19.4l1.1-6.2L3 8.8 9 8l3-6Z",
  joker: "M7 4a5 5 0 0 0 10 0h2v9a7 7 0 0 1-14 0V4h2Zm2.5 8.5h1.8v1.8H9.5v-1.8Zm3.2 0h1.8v1.8h-1.8v-1.8ZM8 17h8v2H8v-2Z",
  star: "m12 2 2.9 6.2 6.8.8-5 4.8 1.3 6.7-6-3.4-6 3.4 1.3-6.7-5-4.8 6.8-.8L12 2Z",
  loader: "M12 2a10 10 0 1 1-7.1 17.1l1.5-1.5A8 8 0 1 0 12 4V2Z",
  shield: "M12 2 20 5v6c0 5-3.2 9-8 11-4.8-2-8-6-8-11V5l8-3Zm0 4-5 1.8V11c0 3.5 1.9 6.2 5 8 3.1-1.8 5-4.5 5-8V7.8L12 6Z",
  volume: "M4 9h4l5-5v16l-5-5H4V9Zm13.5-.5a5 5 0 0 1 0 7l-1.4-1.4a3 3 0 0 0 0-4.2l1.4-1.4Z",
  medal: "M8 2h8l-2 6H10L8 2Zm4 8a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm0 3-1.1 2.2-2.4.3 1.7 1.7-.4 2.4 2.2-1.1 2.2 1.1-.4-2.4 1.7-1.7-2.4-.3L12 13Z",
  target: "M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm0 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm0 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z",
};

export function Icon({ name, className = "" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={paths[name]} />
    </svg>
  );
}
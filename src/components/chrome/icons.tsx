import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 16, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function IconUndo(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 10h10a5 5 0 1 1 0 10H9" />
      <path d="M7 6 3 10l4 4" />
    </Svg>
  );
}

export function IconRedo(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M21 10H11a5 5 0 1 0 0 10h4" />
      <path d="M17 6l4 4-4 4" />
    </Svg>
  );
}

export function IconReset(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </Svg>
  );
}

export function IconSave(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 5h11l3 3v11H5z" />
      <path d="M8 5v4h8" />
      <path d="M8 19v-6h8v6" />
    </Svg>
  );
}

export function IconLoad(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 7h6l2 2h8v10H4z" />
      <path d="M12 11v6" />
      <path d="M9 14l3 3 3-3" />
    </Svg>
  );
}

export function IconExport(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 4v10" />
      <path d="M8 8l4-4 4 4" />
      <path d="M5 14v5h14v-5" />
    </Svg>
  );
}

export function IconSun(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </Svg>
  );
}

export function IconMoon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M18 14.5A7 7 0 1 1 9.5 6 5.5 5.5 0 0 0 18 14.5z" />
    </Svg>
  );
}

export function IconChevron(p: IconProps) {
  return (
    <Svg {...p} size={p.size ?? 12}>
      <path d="M7 10l5 5 5-5" />
    </Svg>
  );
}

export function IconFit(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4" />
    </Svg>
  );
}

export function IconMinus(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 12h12" />
    </Svg>
  );
}

export function IconPlus(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 6v12M6 12h12" />
    </Svg>
  );
}

export function IconMark(p: IconProps) {
  return (
    <Svg {...p} size={p.size ?? 18}>
      <path d="M7 20V9l5-5 5 5v11" />
      <path d="M10 20v-6h4v6" />
      <path d="M9 12h6" />
    </Svg>
  );
}

export function IconShape(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M8 6h7l4 6-3 8H8L4 12z" />
    </Svg>
  );
}

export function IconNeck(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 8h12M6 16h12" />
      <path d="M9 8v8M12 8v8M15 8v8" />
    </Svg>
  );
}

export function IconHead(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M10 20V9c0-3 2-5 5-6l3 3c-2 1-3 3-3 5v9" />
      <circle cx="16" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="11" r="1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconBridge(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="4" y="6" width="11" height="12" rx="1.5" />
      <path d="M7 9h5M7 12h5M7 15h5" />
      <path d="M15 9h5M15 12h5M15 15h5" />
    </Svg>
  );
}

export function IconPickup(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="6" y="8" width="12" height="8" rx="2" />
      <path d="M9 12h6M10 10v4M14 10v4" />
    </Svg>
  );
}

export function IconGear(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Svg>
  );
}

export function IconTrace(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="4" y="6" width="16" height="12" rx="2" />
      <path d="M4 15l4-3 3 2 4-4 5 5" />
    </Svg>
  );
}

export function IconStage(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 16h14M7 12h10M9 8h6" />
    </Svg>
  );
}

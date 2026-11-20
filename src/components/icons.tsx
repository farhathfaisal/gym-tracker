type IconProps = { size?: number };

export function ChevronLeft({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M14.5 5.5L8 12l6.5 6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChevronRight({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M9.5 5.5L16 12l-6.5 6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChevronDown({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 9l6 6 6-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function RepeatIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M17 4l3 3-3 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 7H8a4 4 0 0 0-4 4v1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M7 20l-3-3 3-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 17h12a4 4 0 0 0 4-4v-1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function GripIcon() {
  return (
    <svg width="14" height="18" viewBox="0 0 14 18" aria-hidden="true">
      <g fill="currentColor">
        <circle cx="4" cy="3" r="1.3" />
        <circle cx="10" cy="3" r="1.3" />
        <circle cx="4" cy="9" r="1.3" />
        <circle cx="10" cy="9" r="1.3" />
        <circle cx="4" cy="15" r="1.3" />
        <circle cx="10" cy="15" r="1.3" />
      </g>
    </svg>
  );
}

export function PlusIcon({ size = 28 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 5v14M5 12h14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CheckMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5.5 12.5l4.2 4.2L18.5 7.5"
        fill="none"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PersonIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5.5 19.2c1.4-3 3.7-4.4 6.5-4.4s5.1 1.4 6.5 4.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

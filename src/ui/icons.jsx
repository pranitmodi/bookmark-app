import PropTypes from 'prop-types';

const Svg = ({ children, className = 'w-4 h-4', ...props }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
);

Svg.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};

export const IconFolder = (p) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
  </Svg>
);

export const IconPlus = (p) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </Svg>
);

export const IconSettings = (p) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </Svg>
);

export const IconCheck = (p) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </Svg>
);

export const IconCopy = (p) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </Svg>
);

export const IconSpark = (p) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </Svg>
);

export const IconLibrary = (p) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5V6.5A2.5 2.5 0 016.5 4H20v13H6.5A2.5 2.5 0 014 19.5z" />
  </Svg>
);

export const IconGlobe = (p) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
  </Svg>
);

export const IconAlert = (p) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
  </Svg>
);

export const IconUndo = (p) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v1M3 10l4-4M3 10l4 4" />
  </Svg>
);

export const IconChevron = (p) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </Svg>
);

export const IconLock = (p) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11V8a4 4 0 10-8 0v3m12 0H4a2 2 0 00-2 2v7a2 2 0 002 2h16a2 2 0 002-2v-7a2 2 0 00-2-2z" />
  </Svg>
);

export const IconGrip = (p) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeWidth={2} d="M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01" />
  </Svg>
);

export const IconEdit = (p) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 6.5l4 4M4 20l4.5-1 10-10a2.8 2.8 0 10-4-4l-10 10L4 20z" />
  </Svg>
);

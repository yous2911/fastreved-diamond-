// Global test mocks

// Mock framer-motion
export const MOCK_FRAMER_MOTION = {
  motion: {
    div: ({ children, ...props }: any) => {
      const { 
        initial, animate, transition, whileHover, whileTap, whileInView,
        viewport, variants, custom, ...restProps 
      } = props;
      return require('react').createElement('div', restProps, children);
    },
    button: require('react').forwardRef(({ children, ...props }: any, ref: any) => {
      const { 
        initial, animate, transition, whileHover, whileTap, whileInView,
        viewport, variants, custom, ...restProps 
      } = props;
      return require('react').createElement('button', { ref, ...restProps }, children);
    }),
    span: ({ children, ...props }: any) => {
      const { 
        initial, animate, transition, whileHover, whileTap, whileInView,
        viewport, variants, custom, ...restProps 
      } = props;
      return require('react').createElement('span', restProps, children);
    },
    p: ({ children, ...props }: any) => {
      const { 
        initial, animate, transition, whileHover, whileTap, whileInView,
        viewport, variants, custom, ...restProps 
      } = props;
      return require('react').createElement('p', restProps, children);
    },
    h1: ({ children, ...props }: any) => {
      const { 
        initial, animate, transition, whileHover, whileTap, whileInView,
        viewport, variants, custom, ...restProps 
      } = props;
      return require('react').createElement('h1', restProps, children);
    },
    h2: ({ children, ...props }: any) => {
      const { 
        initial, animate, transition, whileHover, whileTap, whileInView,
        viewport, variants, custom, ...restProps 
      } = props;
      return require('react').createElement('h2', restProps, children);
    },
    h3: ({ children, ...props }: any) => {
      const { 
        initial, animate, transition, whileHover, whileTap, whileInView,
        viewport, variants, custom, ...restProps 
      } = props;
      return require('react').createElement('h3', restProps, children);
    },
    img: ({ children, ...props }: any) => {
      const { 
        initial, animate, transition, whileHover, whileTap, whileInView,
        viewport, variants, custom, ...restProps 
      } = props;
      return require('react').createElement('img', restProps, children);
    },
    form: ({ children, ...props }: any) => {
      const { 
        initial, animate, transition, whileHover, whileTap, whileInView,
        viewport, variants, custom, ...restProps 
      } = props;
      return require('react').createElement('form', restProps, children);
    },
    input: ({ children, ...props }: any) => {
      const { 
        initial, animate, transition, whileHover, whileTap, whileInView,
        viewport, variants, custom, ...restProps 
      } = props;
      return require('react').createElement('input', restProps, children);
    },
    textarea: ({ children, ...props }: any) => {
      const { 
        initial, animate, transition, whileHover, whileTap, whileInView,
        viewport, variants, custom, ...restProps 
      } = props;
      return require('react').createElement('textarea', restProps, children);
    },
  },
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({
    start: jest.fn(),
    stop: jest.fn(),
    set: jest.fn(),
  }),
  useMotionValue: (initial: any) => ({
    get: () => initial,
    set: jest.fn(),
    on: jest.fn(),
    onChange: jest.fn(),
  }),
  useTransform: () => ({}),
  useSpring: () => ({}),
};

// Mock useSound hook
export const mockUseSound = jest.fn(() => ({
  playSound: jest.fn((soundType: string) => Promise.resolve()),
  playMelody: jest.fn((melody: string[]) => Promise.resolve()),
  initAudio: jest.fn(() => Promise.resolve()),
  setVolume: jest.fn(),
  isEnabled: true,
}));

// Mock useHaptic hook  
export const mockUseHaptic = jest.fn(() => ({
  triggerHaptic: jest.fn((type: string, intensity?: number) => Promise.resolve()),
  isSupported: true,
  isEnabled: true,
}));

// Mock Three.js for 3D components
export const MOCK_THREE = {
  WebGLRenderer: jest.fn(() => ({
    setSize: jest.fn(),
    render: jest.fn(),
    domElement: document.createElement('canvas'),
  })),
  Scene: jest.fn(),
  PerspectiveCamera: jest.fn(),
  BoxGeometry: jest.fn(),
  MeshBasicMaterial: jest.fn(),
  Mesh: jest.fn(),
  DirectionalLight: jest.fn(),
  AmbientLight: jest.fn(),
};

// Mock Howler.js for audio
export const MOCK_HOWLER = {
  Howl: jest.fn(() => ({
    play: jest.fn(),
    pause: jest.fn(),
    stop: jest.fn(),
    volume: jest.fn(),
    rate: jest.fn(),
    seek: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  })),
  Howler: {
    volume: jest.fn(),
    mute: jest.fn(),
    ctx: {
      state: 'running',
      resume: jest.fn(),
    },
  },
};

// Mock localStorage
export const MOCK_LOCAL_STORAGE = {
  getItem: jest.fn((key: string) => {
    const store: { [key: string]: string } = {};
    return store[key] || null;
  }),
  setItem: jest.fn((key: string, value: string) => {
    const store: { [key: string]: string } = {};
    store[key] = value;
  }),
  removeItem: jest.fn((key: string) => {
    const store: { [key: string]: string } = {};
    delete store[key];
  }),
  clear: jest.fn(),
};

// Mock sessionStorage
export const MOCK_SESSION_STORAGE = {
  ...MOCK_LOCAL_STORAGE,
};

// Mock fetch for API calls
export const mockFetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
  })
);

// Mock ResizeObserver
export const mockResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
export const mockIntersectionObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock MediaDevices for camera/microphone access
export const MOCK_MEDIA_DEVICES = {
  getUserMedia: jest.fn(() => 
    Promise.resolve({
      getTracks: () => [{ stop: jest.fn() }],
    })
  ),
  enumerateDevices: jest.fn(() => Promise.resolve([])),
};

// Mock geolocation
export const MOCK_GEOLOCATION = {
  getCurrentPosition: jest.fn((success) => 
    success({
      coords: {
        latitude: 48.8566,
        longitude: 2.3522,
        accuracy: 100,
      },
    })
  ),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
};

// Mock clipboard
export const MOCK_CLIPBOARD = {
  writeText: jest.fn(() => Promise.resolve()),
  readText: jest.fn(() => Promise.resolve('mocked text')),
};

// Mock notifications
export const mockNotification = jest.fn(() => ({
  close: jest.fn(),
  onclick: null,
  onclose: null,
  onerror: null,
  onshow: null,
}));

// Common test data
export const TEST_DATA = {
  student: {
    id: 1,
    prenom: 'Test',
    nom: 'Student',
    niveauActuel: 'CP',
    totalPoints: 100,
    serieJours: 5,
    mascotteType: 'dragon',
  },
  exercise: {
    id: 1,
    titre: 'Test Exercise',
    description: 'Test description',
    type: 'CALCUL',
    difficulte: 'FACILE',
    xp: 10,
    configuration: JSON.stringify({ question: '2+2=?', answer: '4' }),
  },
  progress: {
    id: 1,
    studentId: 1,
    exerciseId: 1,
    completed: true,
    score: 85,
    timeSpent: 120,
    attempts: 2,
    completedAt: new Date().toISOString(),
  },
};

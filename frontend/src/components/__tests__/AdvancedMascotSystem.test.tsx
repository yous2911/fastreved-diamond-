import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdvancedMascotSystem from '../AdvancedMascotSystem';

// Mock pour Three.js
jest.mock('three', () => ({
  Scene: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    remove: jest.fn(),
    background: null,
  })),
  PerspectiveCamera: jest.fn().mockImplementation(() => ({
    position: { set: jest.fn() },
    lookAt: jest.fn(),
  })),
  WebGLRenderer: jest.fn().mockImplementation(() => ({
    setSize: jest.fn(),
    render: jest.fn(),
    dispose: jest.fn(),
    setPixelRatio: jest.fn(),
    domElement: {
      style: {},
      width: 800,
      height: 600,
      getContext: jest.fn(),
    },
    shadowMap: { enabled: false, type: null },
  })),
  Group: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    children: [],
    position: { set: jest.fn(), y: 0 },
    rotation: { x: 0, y: 0, z: 0 },
  })),
  BoxGeometry: jest.fn(),
  SphereGeometry: jest.fn(),
  BufferGeometry: jest.fn().mockImplementation(() => ({
    setAttribute: jest.fn(),
  })),
  BufferAttribute: jest.fn(),
  MeshPhongMaterial: jest.fn().mockImplementation(() => ({
    color: { clone: jest.fn().mockReturnThis(), multiplyScalar: jest.fn().mockReturnThis() },
  })),
  PointsMaterial: jest.fn(),
  Mesh: jest.fn().mockImplementation(() => ({
    position: { set: jest.fn() },
    scale: { set: jest.fn() },
    rotation: { y: 0 },
    castShadow: false,
    userData: {},
  })),
  Points: jest.fn(),
  DirectionalLight: jest.fn().mockImplementation(() => ({
    position: { set: jest.fn() },
    castShadow: false,
    shadow: { mapSize: { width: 0, height: 0 } },
  })),
  AmbientLight: jest.fn(),
  PointLight: jest.fn().mockImplementation(() => ({
    position: { set: jest.fn() },
  })),
  Color: jest.fn().mockImplementation(() => ({
    setHSL: jest.fn().mockReturnThis(),
    setHex: jest.fn().mockReturnThis(),
    clone: jest.fn().mockReturnThis(),
    multiplyScalar: jest.fn().mockReturnThis(),
  })),
  Vector3: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    add: jest.fn(),
    multiplyScalar: jest.fn(),
  })),
  PCFSoftShadowMap: 'PCFSoftShadowMap',
}));

// Mock Framer Motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { whileHover, whileTap, initial, animate, transition, ...domProps } = props;
      return <div {...domProps}>{children}</div>;
    },
    button: ({ children, ...props }: any) => {
      const { whileHover, whileTap, initial, animate, transition, ...domProps } = props;
      return <button {...domProps}>{children}</button>;
    },
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
}));

describe('AdvancedMascotSystem', () => {
  const defaultProps = {
    mascotType: 'dragon' as const,
    studentData: {
      level: 3,
      xp: 150,
      currentStreak: 5,
      timeOfDay: 'morning' as const,
      recentPerformance: 'excellent' as const,
    },
    currentActivity: 'idle' as const,
    equippedItems: [],
    onMascotInteraction: jest.fn(),
    onEmotionalStateChange: jest.fn(),
  };

  it('se rend sans erreur', () => {
    expect(() => {
      render(<AdvancedMascotSystem {...defaultProps} />);
    }).not.toThrow();
  });

  it('affiche le système de mascotte 3D', () => {
    render(<AdvancedMascotSystem {...defaultProps} />);
    // The component should render without errors and create a 3D scene
    // Since we're using mocked THREE.js, we just verify it renders without throwing
    const container = document.querySelector('.relative');
    expect(container).toBeTruthy();
  });

  it('réagit aux différents types de mascotte', () => {
    const { rerender } = render(<AdvancedMascotSystem {...defaultProps} />);
    
    rerender(<AdvancedMascotSystem {...defaultProps} mascotType="fairy" />);
    expect(() => {
      render(<AdvancedMascotSystem {...defaultProps} mascotType="fairy" />);
    }).not.toThrow();
    
    rerender(<AdvancedMascotSystem {...defaultProps} mascotType="robot" />);
    expect(() => {
      render(<AdvancedMascotSystem {...defaultProps} mascotType="robot" />);
    }).not.toThrow();
  });

  it('accepte différents niveaux d\'élève', () => {
    const { rerender } = render(<AdvancedMascotSystem {...defaultProps} />);
    
    rerender(<AdvancedMascotSystem {...defaultProps} studentData={{...defaultProps.studentData, level: 1}} />);
    expect(() => {
      render(<AdvancedMascotSystem {...defaultProps} studentData={{...defaultProps.studentData, level: 1}} />);
    }).not.toThrow();
    
    rerender(<AdvancedMascotSystem {...defaultProps} studentData={{...defaultProps.studentData, level: 5}} />);
    expect(() => {
      render(<AdvancedMascotSystem {...defaultProps} studentData={{...defaultProps.studentData, level: 5}} />);
    }).not.toThrow();
  });
}); 
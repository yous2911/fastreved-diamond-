import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdvancedParticleEngine from '../AdvancedParticleEngine';

// Mock pour Three.js
jest.mock('three', () => ({
  Scene: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    remove: jest.fn(),
  })),
  PerspectiveCamera: jest.fn().mockImplementation(() => ({
    position: { set: jest.fn() },
    lookAt: jest.fn(),
  })),
  WebGLRenderer: jest.fn().mockImplementation(() => ({
    setSize: jest.fn(),
    render: jest.fn(),
    domElement: {
      style: {},
      width: 800,
      height: 600,
      getContext: jest.fn(),
    },
  })),
  BufferGeometry: jest.fn(),
  Float32BufferAttribute: jest.fn(),
  PointsMaterial: jest.fn(),
  Points: jest.fn(),
  Vector3: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    add: jest.fn(),
    multiplyScalar: jest.fn(),
  })),
  Color: jest.fn(),
}));

describe('AdvancedParticleEngine', () => {
  const defaultProps = {
    particleType: 'sparkle' as const,
    intensity: 3 as const,
    isActive: true,
  };

  it('se rend sans erreur', () => {
    expect(() => {
      render(<AdvancedParticleEngine {...defaultProps} />);
    }).not.toThrow();
  });

  it('affiche un canvas', () => {
    render(<AdvancedParticleEngine {...defaultProps} />);
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('accepte différents types de particules', () => {
    const { rerender } = render(<AdvancedParticleEngine {...defaultProps} />);
    
    rerender(<AdvancedParticleEngine {...defaultProps} particleType="fire" />);
    expect(document.querySelector('canvas')).toBeInTheDocument();
    
    rerender(<AdvancedParticleEngine {...defaultProps} particleType="magic" />);
    expect(document.querySelector('canvas')).toBeInTheDocument();
  });

  it('accepte différentes intensités', () => {
    const { rerender } = render(<AdvancedParticleEngine {...defaultProps} />);
    
    rerender(<AdvancedParticleEngine {...defaultProps} intensity={0} />);
    expect(document.querySelector('canvas')).toBeInTheDocument();
    
    rerender(<AdvancedParticleEngine {...defaultProps} intensity={5} />);
    expect(document.querySelector('canvas')).toBeInTheDocument();
  });
}); 
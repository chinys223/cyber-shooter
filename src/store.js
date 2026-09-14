import { create } from 'zustand'

export const useStore = create((set) => ({
  // Input abstraction state
  inputs: {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    shoot: false,
  },
  // Mobile camera delta
  cameraDelta: { x: 0, y: 0 },
  
  // Setters
  setInput: (key, value) => set((state) => ({
    inputs: { ...state.inputs, [key]: value }
  })),
  setJoystick: (forward, backward, left, right) => set((state) => ({
    inputs: { ...state.inputs, forward, backward, left, right }
  })),
  addCameraDelta: (dx, dy) => set((state) => ({
    cameraDelta: { 
      x: state.cameraDelta.x + dx, 
      y: state.cameraDelta.y + dy 
    }
  })),
  clearCameraDelta: () => set({ cameraDelta: { x: 0, y: 0 } }),
  
  // Trigger mobile shoot
  triggerMobileShoot: () => {
    window.dispatchEvent(new CustomEvent('mobileShoot'))
  }
}))

import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { Stars, PointerLockControls, KeyboardControls } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { Joystick } from 'react-joystick-component'
import { Player } from './Player'
import { Level } from './Level'
import { useState, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { playShootSound, playHitSound } from './audio'
import { useStore } from './store'

// Global BGM state to prevent restarting
let bgmStarted = false;
const bgm = new Audio('/bgm.mp3')
bgm.loop = true
bgm.volume = 0.3

function startBGM() {
  if (!bgmStarted) {
    bgm.play().catch(e => console.log("Audio play failed", e))
    bgmStarted = true
  }
}

// The Hitscan Shooter Logic for Desktop (Mouse)
function DesktopShooter({ onHit }) {
  const { camera, scene } = useThree()

  useEffect(() => {
    const handleMouseClick = (e) => {
      if (!document.pointerLockElement) return
      
      startBGM()
      playShootSound()

      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera)

      const intersects = raycaster.intersectObjects(scene.children, true)
      
      for (let i = 0; i < intersects.length; i++) {
        let obj = intersects[i].object
        while (obj) {
          if (obj.userData && obj.userData.isTarget) {
            onHit(obj.userData.id)
            return
          }
          obj = obj.parent
        }
      }
    }

    window.addEventListener('mousedown', handleMouseClick)
    return () => window.removeEventListener('mousedown', handleMouseClick)
  }, [camera, scene, onHit])

  return null
}

const INITIAL_TARGETS = [
  { id: 1, pos: [0, 5, -15], timeOffset: 0 },
  { id: 2, pos: [12, 6, -10], timeOffset: 1 },
  { id: 3, pos: [-12, 7, -20], timeOffset: 2 },
  { id: 4, pos: [18, 4, -15], timeOffset: 3 },
  { id: 5, pos: [-18, 8, -10], timeOffset: 4 },
  { id: 6, pos: [8, 5, -25], timeOffset: 5 },
  { id: 7, pos: [-8, 9, -15], timeOffset: 6 },
  { id: 8, pos: [22, 6, -8], timeOffset: 7 },
  { id: 9, pos: [-22, 7, -22], timeOffset: 8 },
  { id: 10, pos: [0, 8, -25], timeOffset: 9 },
  { id: 11, pos: [15, 12, -20], timeOffset: 1.5 },
  { id: 12, pos: [-15, 10, -5], timeOffset: 2.5 },
  { id: 13, pos: [5, 15, -15], timeOffset: 3.5 },
  { id: 14, pos: [-5, 4, -28], timeOffset: 4.5 },
  { id: 15, pos: [0, 18, -10], timeOffset: 5.5 },
]

export default function App() {
  const [targets, setTargets] = useState(INITIAL_TARGETS)
  const total = 15
  const score = total - targets.length
  const won = score >= total

  // Connect to Zustand store for setters
  const setInput = useStore(state => state.setInput)
  const setJoystick = useStore(state => state.setJoystick)
  const addCameraDelta = useStore(state => state.addCameraDelta)
  const triggerMobileShoot = useStore(state => state.triggerMobileShoot)

  // Check if device is touch capable
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    setIsMobile(('ontouchstart' in window) || navigator.maxTouchPoints > 0)
  }, [])

  const handleHit = (id) => {
    setTargets((prev) => prev.filter(t => t.id !== id))
    playHitSound()
  }

  // Handle Joystick Events
  const handleJoystick = (e) => {
    if (e.type === 'stop') {
      setJoystick(false, false, false, false)
      return;
    }
    const angle = e.direction; 
    let forward = angle === 'FORWARD'
    let backward = angle === 'BACKWARD'
    let left = angle === 'LEFT'
    let right = angle === 'RIGHT'
    
    // Diagonal support
    if (e.y > 0.3) forward = true; else if (e.y < -0.3) backward = true; else { forward = false; backward = false; }
    if (e.x > 0.3) right = true; else if (e.x < -0.3) left = true; else { right = false; left = false; }
    
    setJoystick(forward, backward, left, right)
  }

  // Touch screen dragging to look around
  const lookPointerId = useRef(null)
  const lastLookPos = useRef({ x: 0, y: 0 })

  const handlePointerDown = (e) => {
    if (e.target.closest('.no-drag')) return;
    if (lookPointerId.current !== null) return;
    
    lookPointerId.current = e.pointerId;
    lastLookPos.current = { x: e.clientX, y: e.clientY };
    e.target.setPointerCapture(e.pointerId);
  }

  const handlePointerMove = (e) => {
    if (lookPointerId.current !== e.pointerId) return;
    
    const deltaX = e.clientX - lastLookPos.current.x;
    const deltaY = e.clientY - lastLookPos.current.y;
    
    addCameraDelta(deltaX, deltaY)
    
    lastLookPos.current = { x: e.clientX, y: e.clientY };
  }

  const handlePointerUp = (e) => {
    if (lookPointerId.current === e.pointerId) {
      lookPointerId.current = null;
    }
  }

  const handleShootBtnClick = () => {
    startBGM()
    playShootSound()
    triggerMobileShoot()
  }

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: 'black', touchAction: 'none' }}>
      
      {/* Invisible layer to catch swipe gestures (防禦性瀏覽器觸控防護 - 準則二與三) */}
      {isMobile && !won && (
        <div 
          className="mobile-ui-overlay"
          style={{ pointerEvents: 'auto' }} // Override to catch swipe on background
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      )}
      
      <KeyboardControls
        map={[
          { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
          { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
          { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
          { name: 'right', keys: ['ArrowRight', 'KeyD'] },
          { name: 'jump', keys: ['Space'] },
        ]}
      >
        <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, color: '#00ffff', fontSize: isMobile ? 14 : 18, fontFamily: 'monospace', pointerEvents: 'none', textShadow: '0 0 5px #00ffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <img src="/kid.jpg" style={{ width: isMobile ? 40 : 60, height: isMobile ? 40 : 60, borderRadius: '50%', border: '2px solid #ff00ff', objectFit: 'cover', boxShadow: '0 0 10px #ff00ff' }} />
            <h2 style={{ margin: 0, color: '#ff00ff', letterSpacing: '2px', textShadow: '0 0 10px #ff00ff' }}>CYBER-SHOOTER V2</h2>
          </div>
          {!isMobile && (
            <>
              <p>W A S D - 移動</p>
              <p>SPACE - 跳躍</p>
              <p>MOUSE LEFT - 發射雷射</p>
            </>
          )}
          <h1 style={{ color: '#fff', textShadow: '0 0 10px #fff', margin: 0 }}>擊破魔化分身: {score} / {total} 🎯</h1>
        </div>
        
        {won && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 20, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#00ffff', fontFamily: 'monospace' }}>
            <h1 style={{ fontSize: isMobile ? 40 : 60, textShadow: '0 0 20px #00ffff', letterSpacing: '5px' }}>MISSION ACCOMPLISHED</h1>
            <p style={{ fontSize: 24, color: '#ff00ff', textShadow: '0 0 10px #ff00ff' }}>TARGETS DESTROYED</p>
            <img src="/win.jpg" style={{ width: 250, height: 250, objectFit: 'cover', borderRadius: 20, border: '5px solid #00ffff', boxShadow: '0 0 30px #00ffff', marginTop: 20 }} />
          </div>
        )}

        {!won && (
          <>
            <div id="crosshair" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 4, height: 4, backgroundColor: '#00ffff', borderRadius: '50%', zIndex: 10, pointerEvents: 'none', boxShadow: '0 0 5px #00ffff' }} />
            <div id="crosshair-ring" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 30, height: 30, border: '2px solid rgba(0, 255, 255, 0.5)', borderRadius: '50%', zIndex: 10, pointerEvents: 'none' }} />
          </>
        )}

        {/* Mobile On-Screen Controls (準則二：手機端專屬 UI) */}
        {isMobile && !won && (
          <div className="no-drag joystick-zone" style={{ position: 'absolute', bottom: 30, left: 30, zIndex: 15 }}>
            <Joystick size={100} sticky={false} baseColor="rgba(0, 255, 255, 0.2)" stickColor="rgba(255, 0, 255, 0.8)" move={handleJoystick} stop={handleJoystick} />
          </div>
        )}
        
        {isMobile && !won && (
          <div className="no-drag mobile-button" style={{ position: 'absolute', bottom: 40, right: 30, zIndex: 15, display: 'flex', gap: '15px' }}>
            <button 
              onTouchStart={() => setInput('jump', true)} 
              onTouchEnd={() => setInput('jump', false)} 
              style={{ width: 60, height: 60, borderRadius: '50%', backgroundColor: 'rgba(0, 255, 255, 0.3)', border: '2px solid #00ffff', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>JUMP</button>
            <button 
              onTouchStart={handleShootBtnClick} 
              style={{ width: 80, height: 80, borderRadius: '50%', backgroundColor: 'rgba(255, 0, 255, 0.5)', border: '3px solid #ff00ff', color: '#fff', fontSize: '16px', fontWeight: 'bold', boxShadow: '0 0 15px #ff00ff' }}>SHOOT</button>
          </div>
        )}

        <Canvas shadows camera={{ fov: 75 }} style={{ pointerEvents: isMobile ? 'none' : 'auto' }}>
          <MobileShooterHandler onHit={handleHit} />
          {!isMobile && <DesktopShooter onHit={handleHit} />}
          
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          <ambientLight intensity={0.2} />
          <directionalLight castShadow intensity={0.5} position={[10, 20, -10]} color="#00ffff" />
          <directionalLight intensity={0.5} position={[-10, 20, 10]} color="#ff00ff" />
          
          <Physics gravity={[0, -20, 0]}>
            <Player isMobile={isMobile} />
            <Level targets={targets} />
          </Physics>

          {!isMobile && <PointerLockControls />}
          
          <EffectComposer>
            <Bloom luminanceThreshold={1} mipmapBlur intensity={1.5} />
          </EffectComposer>
        </Canvas>
      </KeyboardControls>
    </div>
  )
}

function MobileShooterHandler({ onHit }) {
  const { camera, scene } = useThree()
  const cameraDelta = useStore(state => state.cameraDelta)
  const clearCameraDelta = useStore(state => state.clearCameraDelta)
  
  // Custom camera rotation applied here for mobile
  useFrame(() => {
    if (cameraDelta.x !== 0 || cameraDelta.y !== 0) {
      const euler = new THREE.Euler(0, 0, 0, 'YXZ')
      euler.setFromQuaternion(camera.quaternion)
      
      euler.y -= cameraDelta.x * 0.005
      euler.x -= cameraDelta.y * 0.005
      euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x))
      
      camera.quaternion.setFromEuler(euler)
      clearCameraDelta()
    }
  })

  useEffect(() => {
    const handleShoot = () => {
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera)
      const intersects = raycaster.intersectObjects(scene.children, true)
      for (let i = 0; i < intersects.length; i++) {
        let obj = intersects[i].object
        while (obj) {
          if (obj.userData && obj.userData.isTarget) {
            onHit(obj.userData.id)
            return
          }
          obj = obj.parent
        }
      }
    }
    window.addEventListener('mobileShoot', handleShoot)
    return () => window.removeEventListener('mobileShoot', handleShoot)
  }, [camera, scene, onHit])
  return null
}

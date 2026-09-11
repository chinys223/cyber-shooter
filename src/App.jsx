import { Canvas, useThree } from '@react-three/fiber'
import { Stars, PointerLockControls, KeyboardControls } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { Player } from './Player'
import { Level } from './Level'
import { useState, useEffect } from 'react'
import * as THREE from 'three'
import { playShootSound, playHitSound } from './audio'

// The Hitscan Shooter Logic
function Shooter({ onHit }) {
  const { camera, scene } = useThree()

  useEffect(() => {
    // Background Music Setup
    const bgm = new Audio('/bgm.mp3')
    bgm.loop = true
    bgm.volume = 0.3
    let bgmStarted = false

    const handleMouseClick = (e) => {
      if (!document.pointerLockElement) return
      
      // Start BGM on first interaction
      if (!bgmStarted) {
        bgm.play().catch(e => console.log("Audio play failed", e))
        bgmStarted = true
      }

      // Play shoot sound effect
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
    return () => {
      window.removeEventListener('mousedown', handleMouseClick)
      bgm.pause()
    }
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

  const handleHit = (id) => {
    setTargets((prev) => prev.filter(t => t.id !== id))
    playHitSound()
  }

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: 'black' }}>
      <KeyboardControls
        map={[
          { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
          { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
          { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
          { name: 'right', keys: ['ArrowRight', 'KeyD'] },
          { name: 'jump', keys: ['Space'] },
        ]}
      >
        <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, color: '#00ffff', fontSize: 18, fontFamily: 'monospace', pointerEvents: 'none', textShadow: '0 0 5px #00ffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 10 }}>
            <img src="/kid.jpg" style={{ width: 60, height: 60, borderRadius: '50%', border: '2px solid #ff00ff', objectFit: 'cover', boxShadow: '0 0 10px #ff00ff' }} />
            <h2 style={{ margin: 0, color: '#ff00ff', letterSpacing: '2px', textShadow: '0 0 10px #ff00ff' }}>CYBER-SHOOTER V1</h2>
          </div>
          <p>W A S D - 移動</p>
          <p>SPACE - 跳躍</p>
          <p>MOUSE LEFT - 發射雷射</p>
          <h1 style={{ color: '#fff', textShadow: '0 0 10px #fff' }}>擊破魔化分身: {score} / {total} 🎯</h1>
        </div>
        
        {won && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 20, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#00ffff', fontFamily: 'monospace' }}>
            <h1 style={{ fontSize: 60, textShadow: '0 0 20px #00ffff', letterSpacing: '5px' }}>MISSION ACCOMPLISHED</h1>
            <p style={{ fontSize: 24, color: '#ff00ff', textShadow: '0 0 10px #ff00ff' }}>TARGETS DESTROYED</p>
            <img src="/win.jpg" style={{ width: 300, height: 300, objectFit: 'cover', borderRadius: 20, border: '5px solid #00ffff', boxShadow: '0 0 30px #00ffff', marginTop: 20 }} />
          </div>
        )}

        {!won && (
          <>
            <div id="crosshair" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 4, height: 4, backgroundColor: '#00ffff', borderRadius: '50%', zIndex: 10, pointerEvents: 'none', boxShadow: '0 0 5px #00ffff' }} />
            <div id="crosshair-ring" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 24, height: 24, border: '2px solid rgba(0, 255, 255, 0.5)', borderRadius: '50%', zIndex: 10, pointerEvents: 'none' }} />
          </>
        )}

        <Canvas shadows camera={{ fov: 75 }}>
          <Shooter onHit={handleHit} />
          
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          <ambientLight intensity={0.2} />
          <directionalLight castShadow intensity={0.5} position={[10, 20, -10]} color="#00ffff" />
          <directionalLight intensity={0.5} position={[-10, 20, 10]} color="#ff00ff" />
          
          <Physics gravity={[0, -20, 0]}>
            <Player />
            <Level targets={targets} />
          </Physics>

          <PointerLockControls />
          
          <EffectComposer>
            <Bloom luminanceThreshold={1} mipmapBlur intensity={1.5} />
          </EffectComposer>
        </Canvas>
      </KeyboardControls>
    </div>
  )
}

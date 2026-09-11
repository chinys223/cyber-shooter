import { RigidBody } from '@react-three/rapier'
import { Grid, useTexture, Sparkles } from '@react-three/drei'
import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function KidTarget({ position, id, timeOffset }) {
  const ref = useRef()
  // Load kid's photo for the target
  const texture = useTexture('/kid.jpg')
  texture.flipY = false

  useFrame((state) => {
    if (ref.current) {
      const t = state.clock.elapsedTime + timeOffset
      
      // NORMAL DIFFICULTY: Slower, floaty movement
      ref.current.position.x = position[0] + Math.sin(t * 1.5) * 4 + Math.cos(t * 0.5) * 2
      ref.current.position.y = position[1] + Math.sin(t * 2.0) * 2
      ref.current.position.z = position[2] + Math.cos(t * 1.2) * 4 + Math.sin(t * 0.8) * 1.5
      
      // Slower spinning
      ref.current.rotation.y += 0.02
      ref.current.rotation.x += 0.01
    }
  })

  return (
    <group ref={ref} position={position} userData={{ isTarget: true, id: id }}>
      <mesh scale={[1.2, 1.2, 1.2]}>
        <boxGeometry args={[1, 1, 1]} />
        {/* Use meshBasicMaterial so the photo isn't darkened by lighting or overwritten by emissive bloom */}
        <meshBasicMaterial map={texture} color="#ffffff" />
      </mesh>
      {/* Target indicator box */}
      <mesh scale={[1.4, 1.4, 1.4]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#00ffff" wireframe transparent opacity={0.5} />
      </mesh>
    </group>
  )
}

function NeonWall({ position, args, color }) {
  return (
    <RigidBody type="fixed" position={position}>
      <mesh>
        <boxGeometry args={args} />
        <meshStandardMaterial color="#050505" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Edge glow */}
      <mesh>
        <boxGeometry args={[args[0]+0.1, args[1]+0.1, args[2]+0.1]} />
        <meshBasicMaterial color={color} wireframe />
      </mesh>
    </RigidBody>
  )
}

function GiantFace() {
  const texture = useTexture('/kid.jpg')
  texture.flipY = false 
  const ref = useRef()

  useFrame((state) => {
    if(ref.current) ref.current.lookAt(state.camera.position)
  })

  return (
    <mesh ref={ref} position={[0, 15, -35]}>
      <planeGeometry args={[12, 12]} />
      {/* Darken the image and make it holographic */}
      <meshStandardMaterial 
        map={texture} 
        side={THREE.DoubleSide} 
        rotation={Math.PI} 
        transparent 
        opacity={0.8}
        emissive="#00ffff"
        emissiveIntensity={0.2}
      /> 
    </mesh>
  )
}

export function Level({ targets }) {
  return (
    <>
      <GiantFace />
      
      {/* Cyberpunk Grid Floor */}
      <RigidBody type="fixed" friction={1}>
        <mesh position={[0, -0.5, 0]}>
          <boxGeometry args={[60, 1, 60]} />
          <meshStandardMaterial color="#050505" metalness={0.8} roughness={0.2} />
        </mesh>
      </RigidBody>
      
      <Grid 
        position={[0, 0.01, 0]} 
        args={[60, 60]} 
        cellSize={1} 
        cellThickness={1} 
        cellColor="#00ffff" 
        sectionSize={5} 
        sectionThickness={1.5} 
        sectionColor="#ff00ff" 
        fadeDistance={40} 
      />

      {/* Arena Walls */}
      <NeonWall position={[0, 5, -30]} args={[60, 10, 2]} color="#00ffff" />
      <NeonWall position={[0, 5, 30]} args={[60, 10, 2]} color="#00ffff" />
      <NeonWall position={[-30, 5, 0]} args={[2, 10, 60]} color="#00ffff" />
      <NeonWall position={[30, 5, 0]} args={[2, 10, 60]} color="#00ffff" />

      {/* Cyber Space Dust/Sparkles */}
      <Sparkles count={800} scale={60} size={3} color="#00ffff" speed={0.4} opacity={0.6} />
      <Sparkles count={500} scale={60} size={5} color="#ff00ff" speed={0.6} opacity={0.4} />

      {/* Floating Kid Targets */}
      {targets.map((t) => (
        <KidTarget key={t.id} id={t.id} position={t.pos} timeOffset={t.timeOffset} />
      ))}
    </>
  )
}

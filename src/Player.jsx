import { useRef, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import { RigidBody, useRapier } from '@react-three/rapier'
import * as THREE from 'three'

const SPEED = 6
const JUMP_FORCE = 8

export function Player() {
  const body = useRef()
  const [, getKeys] = useKeyboardControls()
  const { camera } = useThree()
  const { rapier, world } = useRapier()
  
  const [recoil, setRecoil] = useState(0)

  useEffect(() => {
    const handleMouseClick = () => {
      if (document.pointerLockElement) {
        setRecoil(0.2)
      }
    }
    window.addEventListener('mousedown', handleMouseClick)
    return () => window.removeEventListener('mousedown', handleMouseClick)
  }, [])

  useFrame((state, delta) => {
    if (!body.current) return

    const { forward, backward, left, right, jump } = getKeys()
    const linvel = body.current.linvel()
    const pos = body.current.translation()
    
    const frontVector = new THREE.Vector3(0, 0, (backward ? 1 : 0) - (forward ? 1 : 0))
    const sideVector = new THREE.Vector3((left ? 1 : 0) - (right ? 1 : 0), 0, 0)
    
    const direction = new THREE.Vector3()
    direction.subVectors(frontVector, sideVector)
    if (direction.lengthSq() > 0) {
      direction.normalize()
        .multiplyScalar(SPEED)
        .applyEuler(new THREE.Euler(0, state.camera.rotation.y, 0))
    }

    body.current.setLinvel({ x: direction.x, y: linvel.y, z: direction.z }, true)

    // True grounded check using Raycast
    const ray = new rapier.Ray(pos, { x: 0, y: -1, z: 0 })
    const hit = world.castRay(ray, 1.1, true) // 1.1 is slightly larger than capsule half-height (1.0)
    const grounded = hit && hit.toi < 1.1

    if (jump && grounded) {
      body.current.setLinvel({ x: linvel.x, y: JUMP_FORCE, z: linvel.z }, true)
    }

    camera.position.set(pos.x, pos.y + 0.8, pos.z)

    if (recoil > 0) {
      setRecoil(Math.max(0, recoil - delta * 2))
    }
  })

  return (
    <>
      <RigidBody ref={body} colliders="capsule" mass={1} type="dynamic" position={[0, 5, 0]} enabledRotations={[false, false, false]} friction={0.1}>
        <mesh visible={false}>
          <capsuleGeometry args={[0.5, 1, 4, 8]} />
          <meshBasicMaterial color="white" />
        </mesh>
      </RigidBody>

      {/* The Gun - we attach it manually to the camera view using a portal or just fixed position if we put it in an HUD scene, but we can also just use a separate mesh and update its position to match camera */}
      <Gun camera={camera} recoil={recoil} />
    </>
  )
}

function Gun({ camera, recoil }) {
  const gunRef = useRef()

  useFrame(() => {
    if (gunRef.current) {
      // Position gun relative to camera
      const offset = new THREE.Vector3(0.3, -0.3, -0.6 + recoil)
      offset.applyQuaternion(camera.quaternion)
      
      gunRef.current.position.copy(camera.position).add(offset)
      gunRef.current.quaternion.copy(camera.quaternion)
    }
  })

  return (
    <group ref={gunRef}>
      {/* Sci-Fi Gun Body */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.1, 0.1, 0.4]} />
        <meshStandardMaterial color="#222" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Glowing Barrel */}
      <mesh position={[0, 0, -0.2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.2]} />
        <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={2} />
      </mesh>
      {/* Laser Beam (Only visible during recoil peak) */}
      {recoil > 0.15 && (
        <mesh position={[0, 0, -25]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 50]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  )
}

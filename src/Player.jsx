import { useRef, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import { RigidBody, useRapier } from '@react-three/rapier'
import * as THREE from 'three'
import { useStore } from './store'

const SPEED = 6
const JUMP_FORCE = 8

export function Player({ isMobile }) {
  const body = useRef()
  const [, getKeys] = useKeyboardControls()
  const { camera } = useThree()
  const { rapier, world } = useRapier()
  
  const [recoil, setRecoil] = useState(0)
  
  // Connect to Zustand store
  const storeInputs = useStore(state => state.inputs)

  useEffect(() => {
    // Desktop recoil listener
    const handleMouseClick = () => {
      if (document.pointerLockElement) setRecoil(0.2)
    }
    // Mobile recoil listener
    const handleMobileShoot = () => { setRecoil(0.2) }

    window.addEventListener('mousedown', handleMouseClick)
    window.addEventListener('mobileShoot', handleMobileShoot)
    return () => {
      window.removeEventListener('mousedown', handleMouseClick)
      window.removeEventListener('mobileShoot', handleMobileShoot)
    }
  }, [])

  useFrame((state, delta) => {
    if (!body.current) return

    // 準則一：輸入層抽象化！合併鍵盤與手機狀態
    const keys = getKeys()
    const forward = keys.forward || storeInputs.forward
    const backward = keys.backward || storeInputs.backward
    const left = keys.left || storeInputs.left
    const right = keys.right || storeInputs.right
    const jump = keys.jump || storeInputs.jump

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
    const hit = world.castRay(ray, 1.1, true)
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

      <Gun camera={camera} recoil={recoil} />
    </>
  )
}

function Gun({ camera, recoil }) {
  const gunRef = useRef()

  useFrame(() => {
    if (gunRef.current) {
      const offset = new THREE.Vector3(0.3, -0.3, -0.6 + recoil)
      offset.applyQuaternion(camera.quaternion)
      
      gunRef.current.position.copy(camera.position).add(offset)
      gunRef.current.quaternion.copy(camera.quaternion)
    }
  })

  return (
    <group ref={gunRef}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.1, 0.1, 0.4]} />
        <meshStandardMaterial color="#222" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0, -0.2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.2]} />
        <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={2} />
      </mesh>
      {recoil > 0.15 && (
        <mesh position={[0, 0, -25]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 50]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  )
}

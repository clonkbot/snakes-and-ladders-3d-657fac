import { useState, useRef, useCallback, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment, RoundedBox, Text, Float, Html, ContactShadows, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'

// Game constants
const BOARD_SIZE = 10
const TOTAL_SQUARES = 100

// Snakes and Ladders positions (from -> to)
const SNAKES: Record<number, number> = {
  99: 54,
  70: 55,
  52: 42,
  25: 2,
  95: 72,
}

const LADDERS: Record<number, number> = {
  6: 25,
  11: 40,
  60: 85,
  46: 90,
  17: 69,
}

// Get board position from square number (1-100)
function getSquarePosition(square: number): [number, number, number] {
  const index = square - 1
  const row = Math.floor(index / BOARD_SIZE)
  const colBase = index % BOARD_SIZE
  // Alternate direction for snake pattern
  const col = row % 2 === 0 ? colBase : BOARD_SIZE - 1 - colBase
  const x = (col - BOARD_SIZE / 2 + 0.5) * 0.9
  const z = (row - BOARD_SIZE / 2 + 0.5) * 0.9
  return [x, 0.15, z]
}

// Board square component
function BoardSquare({ number }: { number: number }) {
  const [x, , z] = getSquarePosition(number)
  const isSnakeHead = number in SNAKES
  const isLadderBase = number in LADDERS

  const baseColor = (Math.floor((number - 1) / BOARD_SIZE) + number) % 2 === 0
    ? '#F5E6D3'
    : '#E8D4BC'

  const color = isSnakeHead ? '#FECACA' : isLadderBase ? '#FEF3C7' : baseColor

  return (
    <group position={[x, 0.05, z]}>
      <RoundedBox args={[0.85, 0.1, 0.85]} radius={0.03} smoothness={4}>
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.1} />
      </RoundedBox>
      <Text
        position={[0, 0.06, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.18}
        color="#5D4E37"
        anchorX="center"
        anchorY="middle"
        font="https://fonts.gstatic.com/s/fraunces/v31/6NUh8FyLNQOQZAnv9bYEvDiIdE9Ea92uemAk_WBq8U_9v0c2Wa0K7iN7hzFUPJH58nib1603gg7S2nfgRYIc.woff2"
      >
        {number}
      </Text>
    </group>
  )
}

// Snake component - curved tube from head to tail
function Snake({ from, to }: { from: number; to: number }) {
  const startPos = getSquarePosition(from)
  const endPos = getSquarePosition(to)

  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(startPos[0], startPos[1] + 0.3, startPos[2]),
    new THREE.Vector3(
      (startPos[0] + endPos[0]) / 2 + Math.sin(from) * 0.8,
      1.5,
      (startPos[2] + endPos[2]) / 2 + Math.cos(from) * 0.8
    ),
    new THREE.Vector3(endPos[0], endPos[1] + 0.2, endPos[2]),
  ])

  const tubeRef = useRef<THREE.Mesh>(null!)

  useFrame((state) => {
    if (tubeRef.current) {
      const material = tubeRef.current.material as THREE.MeshStandardMaterial
      material.emissiveIntensity = 0.1 + Math.sin(state.clock.elapsedTime * 2 + from) * 0.05
    }
  })

  return (
    <group>
      <mesh ref={tubeRef}>
        <tubeGeometry args={[curve, 32, 0.08, 8, false]} />
        <meshStandardMaterial
          color="#9B2335"
          roughness={0.4}
          metalness={0.2}
          emissive="#9B2335"
          emissiveIntensity={0.1}
        />
      </mesh>
      {/* Snake head */}
      <mesh position={[startPos[0], startPos[1] + 0.35, startPos[2]]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#7A1B2A" roughness={0.3} metalness={0.3} />
      </mesh>
      {/* Eyes */}
      <mesh position={[startPos[0] - 0.05, startPos[1] + 0.4, startPos[2] + 0.08]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[startPos[0] + 0.05, startPos[1] + 0.4, startPos[2] + 0.08]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.5} />
      </mesh>
    </group>
  )
}

// Ladder component
function Ladder({ from, to }: { from: number; to: number }) {
  const startPos = getSquarePosition(from)
  const endPos = getSquarePosition(to)

  const direction = new THREE.Vector3(
    endPos[0] - startPos[0],
    endPos[1] - startPos[1] + 0.3,
    endPos[2] - startPos[2]
  )
  const length = direction.length()
  const midPoint = new THREE.Vector3(
    (startPos[0] + endPos[0]) / 2,
    (startPos[1] + endPos[1]) / 2 + length / 3,
    (startPos[2] + endPos[2]) / 2
  )

  const ladderRef = useRef<THREE.Group>(null!)

  useFrame((state) => {
    if (ladderRef.current) {
      ladderRef.current.children.forEach((child, i) => {
        if (child instanceof THREE.Mesh) {
          const material = child.material as THREE.MeshStandardMaterial
          material.emissiveIntensity = 0.15 + Math.sin(state.clock.elapsedTime * 3 + i * 0.5) * 0.1
        }
      })
    }
  })

  const rungs = Math.floor(length / 0.4)
  const rotation = Math.atan2(endPos[0] - startPos[0], endPos[2] - startPos[2])

  return (
    <group ref={ladderRef} position={[midPoint.x, midPoint.y, midPoint.z]}>
      {/* Side rails */}
      {[-0.1, 0.1].map((offset, i) => (
        <mesh
          key={i}
          position={[offset * Math.cos(rotation), 0, offset * Math.sin(rotation)]}
          rotation={[Math.atan2(length / 3, length), rotation, 0]}
        >
          <cylinderGeometry args={[0.03, 0.03, length * 1.1, 8]} />
          <meshStandardMaterial
            color="#F4A024"
            roughness={0.4}
            metalness={0.4}
            emissive="#F4A024"
            emissiveIntensity={0.15}
          />
        </mesh>
      ))}
      {/* Rungs */}
      {Array.from({ length: rungs }).map((_, i) => {
        const t = (i + 0.5) / rungs - 0.5
        return (
          <mesh
            key={i}
            position={[0, t * length * 0.9, 0]}
            rotation={[0, rotation, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.025, 0.025, 0.25, 8]} />
            <meshStandardMaterial
              color="#C78516"
              roughness={0.5}
              metalness={0.3}
              emissive="#C78516"
              emissiveIntensity={0.1}
            />
          </mesh>
        )
      })}
    </group>
  )
}

// Player pawn component
function PlayerPawn({
  position,
  color,
  isActive,
  targetSquare,
  onMoveComplete
}: {
  position: number
  color: string
  isActive: boolean
  targetSquare: number
  onMoveComplete: () => void
}) {
  const meshRef = useRef<THREE.Group>(null!)
  const [currentPos, setCurrentPos] = useState(position)
  const animatingRef = useRef(false)

  const targetPos = getSquarePosition(currentPos)
  const actualTargetPos = getSquarePosition(targetSquare)

  useFrame((state, delta) => {
    if (!meshRef.current) return

    const target = new THREE.Vector3(...actualTargetPos)
    target.y += 0.25

    const current = meshRef.current.position
    const distance = current.distanceTo(target)

    if (distance > 0.01) {
      animatingRef.current = true
      const speed = 3
      current.lerp(target, delta * speed)
      // Add bounce
      current.y = target.y + Math.abs(Math.sin(state.clock.elapsedTime * 8)) * 0.15
    } else if (animatingRef.current) {
      animatingRef.current = false
      current.y = target.y
      if (currentPos !== targetSquare) {
        setCurrentPos(targetSquare)
      } else {
        onMoveComplete()
      }
    }

    // Idle animation for active player
    if (isActive && !animatingRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.1
    }
  })

  return (
    <Float speed={isActive ? 4 : 0} floatIntensity={isActive ? 0.1 : 0}>
      <group ref={meshRef} position={[targetPos[0], targetPos[1] + 0.25, targetPos[2]]}>
        {/* Pawn body */}
        <mesh castShadow>
          <cylinderGeometry args={[0.12, 0.15, 0.25, 16]} />
          <meshStandardMaterial
            color={color}
            roughness={0.3}
            metalness={0.4}
            emissive={color}
            emissiveIntensity={isActive ? 0.3 : 0.1}
          />
        </mesh>
        {/* Pawn head */}
        <mesh position={[0, 0.22, 0]} castShadow>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial
            color={color}
            roughness={0.3}
            metalness={0.4}
            emissive={color}
            emissiveIntensity={isActive ? 0.3 : 0.1}
          />
        </mesh>
        {isActive && (
          <pointLight color={color} intensity={0.5} distance={1} />
        )}
      </group>
    </Float>
  )
}

// Dice component
function Dice({
  value,
  rolling,
  onRollComplete
}: {
  value: number
  rolling: boolean
  onRollComplete: () => void
}) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const [displayValue, setDisplayValue] = useState(value)

  useFrame((state, delta) => {
    if (!meshRef.current) return

    if (rolling) {
      meshRef.current.rotation.x += delta * 15
      meshRef.current.rotation.y += delta * 12
      meshRef.current.rotation.z += delta * 8

      // Random face display while rolling
      if (Math.random() > 0.7) {
        setDisplayValue(Math.floor(Math.random() * 6) + 1)
      }
    } else {
      // Settle to show correct value
      meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, 0, delta * 5)
      meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, 0, delta * 5)
      meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, 0, delta * 5)
      setDisplayValue(value)
    }
  })

  const dotPositions: Record<number, [number, number, number][]> = {
    1: [[0, 0, 0.26]],
    2: [[-0.1, 0.1, 0.26], [0.1, -0.1, 0.26]],
    3: [[-0.1, 0.1, 0.26], [0, 0, 0.26], [0.1, -0.1, 0.26]],
    4: [[-0.1, 0.1, 0.26], [0.1, 0.1, 0.26], [-0.1, -0.1, 0.26], [0.1, -0.1, 0.26]],
    5: [[-0.1, 0.1, 0.26], [0.1, 0.1, 0.26], [0, 0, 0.26], [-0.1, -0.1, 0.26], [0.1, -0.1, 0.26]],
    6: [[-0.1, 0.1, 0.26], [0.1, 0.1, 0.26], [-0.1, 0, 0.26], [0.1, 0, 0.26], [-0.1, -0.1, 0.26], [0.1, -0.1, 0.26]],
  }

  return (
    <group position={[6, 1, 0]}>
      <mesh ref={meshRef} castShadow>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="#FFFEF5" roughness={0.2} metalness={0.1} />
      </mesh>
      {dotPositions[displayValue]?.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial color="#1E3A5F" />
        </mesh>
      ))}
      <Html position={[0, -0.6, 0]} center>
        <div className="text-center whitespace-nowrap">
          <span
            style={{ fontFamily: 'Fraunces, serif' }}
            className="text-lg md:text-xl font-bold text-amber-800"
          >
            {rolling ? '...' : displayValue}
          </span>
        </div>
      </Html>
    </group>
  )
}

// Confetti particle
function Confetti() {
  const groupRef = useRef<THREE.Group>(null!)
  const particles = useRef(
    Array.from({ length: 100 }).map(() => ({
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        Math.random() * 5 + 5,
        (Math.random() - 0.5) * 10
      ),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        -Math.random() * 0.05 - 0.02,
        (Math.random() - 0.5) * 0.1
      ),
      rotation: Math.random() * Math.PI * 2,
      color: ['#F4A024', '#9B2335', '#1E3A5F', '#2E5A4B', '#E85D4C'][Math.floor(Math.random() * 5)],
    }))
  )

  useFrame(() => {
    if (!groupRef.current) return

    groupRef.current.children.forEach((child, i) => {
      const p = particles.current[i]
      p.position.add(p.velocity)
      p.rotation += 0.05

      if (p.position.y < 0) {
        p.position.y = 8
        p.position.x = (Math.random() - 0.5) * 10
        p.position.z = (Math.random() - 0.5) * 10
      }

      child.position.copy(p.position)
      child.rotation.z = p.rotation
    })
  })

  return (
    <group ref={groupRef}>
      {particles.current.map((p, i) => (
        <mesh key={i} position={p.position}>
          <planeGeometry args={[0.15, 0.15]} />
          <meshStandardMaterial
            color={p.color}
            side={THREE.DoubleSide}
            emissive={p.color}
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}
    </group>
  )
}

// Game board
function GameBoard() {
  return (
    <group>
      {/* Board base */}
      <RoundedBox args={[9.5, 0.2, 9.5]} position={[0, -0.05, 0]} radius={0.1} smoothness={4}>
        <meshStandardMaterial color="#8B5A2B" roughness={0.7} metalness={0.1} />
      </RoundedBox>

      {/* Board frame */}
      <RoundedBox args={[10, 0.15, 10]} position={[0, -0.15, 0]} radius={0.1} smoothness={4}>
        <meshStandardMaterial color="#5D4037" roughness={0.8} metalness={0.1} />
      </RoundedBox>

      {/* Squares */}
      {Array.from({ length: TOTAL_SQUARES }).map((_, i) => (
        <BoardSquare key={i} number={i + 1} />
      ))}

      {/* Snakes */}
      {Object.entries(SNAKES).map(([from, to]) => (
        <Snake key={from} from={parseInt(from)} to={to} />
      ))}

      {/* Ladders */}
      {Object.entries(LADDERS).map(([from, to]) => (
        <Ladder key={from} from={parseInt(from)} to={to} />
      ))}
    </group>
  )
}

// Main scene
function Scene({
  gameState,
  onRollComplete,
  onMoveComplete
}: {
  gameState: GameState
  onRollComplete: () => void
  onMoveComplete: () => void
}) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 12, 10]} fov={50} />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={8}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2.2}
        target={[0, 0, 0]}
      />

      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight position={[-5, 10, -5]} intensity={0.3} />
      <pointLight position={[0, 5, 0]} intensity={0.5} color="#FFF8E7" />

      <Environment preset="sunset" />

      <GameBoard />

      <PlayerPawn
        position={gameState.players[0].position}
        targetSquare={gameState.players[0].targetPosition}
        color="#1E3A5F"
        isActive={gameState.currentPlayer === 0 && !gameState.isRolling}
        onMoveComplete={onMoveComplete}
      />
      <PlayerPawn
        position={gameState.players[1].position}
        targetSquare={gameState.players[1].targetPosition}
        color="#E85D4C"
        isActive={gameState.currentPlayer === 1 && !gameState.isRolling}
        onMoveComplete={onMoveComplete}
      />

      <Dice
        value={gameState.diceValue}
        rolling={gameState.isRolling}
        onRollComplete={onRollComplete}
      />

      <ContactShadows
        position={[0, -0.19, 0]}
        opacity={0.4}
        scale={12}
        blur={2}
        far={5}
      />

      {gameState.winner !== null && <Confetti />}
    </>
  )
}

interface Player {
  position: number
  targetPosition: number
  name: string
}

interface GameState {
  players: Player[]
  currentPlayer: number
  diceValue: number
  isRolling: boolean
  isMoving: boolean
  winner: number | null
  message: string
}

function App() {
  const [gameState, setGameState] = useState<GameState>({
    players: [
      { position: 1, targetPosition: 1, name: 'Blue' },
      { position: 1, targetPosition: 1, name: 'Red' },
    ],
    currentPlayer: 0,
    diceValue: 1,
    isRolling: false,
    isMoving: false,
    winner: null,
    message: "Blue's turn - Roll the dice!",
  })

  const rollDice = useCallback(() => {
    if (gameState.isRolling || gameState.isMoving || gameState.winner !== null) return

    setGameState(prev => ({ ...prev, isRolling: true, message: 'Rolling...' }))

    setTimeout(() => {
      const value = Math.floor(Math.random() * 6) + 1
      setGameState(prev => {
        const currentPlayer = prev.players[prev.currentPlayer]
        let newPosition = currentPlayer.position + value

        // Can't go beyond 100
        if (newPosition > 100) {
          newPosition = currentPlayer.position
        }

        // Check for snakes or ladders
        let finalPosition = newPosition
        let message = `${currentPlayer.name} rolled ${value}!`

        if (SNAKES[newPosition]) {
          finalPosition = SNAKES[newPosition]
          message += ` Oh no! Snake at ${newPosition}! Sliding down to ${finalPosition}`
        } else if (LADDERS[newPosition]) {
          finalPosition = LADDERS[newPosition]
          message += ` Yay! Ladder at ${newPosition}! Climbing up to ${finalPosition}`
        }

        const updatedPlayers = [...prev.players]
        updatedPlayers[prev.currentPlayer] = {
          ...currentPlayer,
          targetPosition: finalPosition,
        }

        return {
          ...prev,
          diceValue: value,
          isRolling: false,
          isMoving: true,
          players: updatedPlayers,
          message,
        }
      })
    }, 1000)
  }, [gameState.isRolling, gameState.isMoving, gameState.winner])

  const handleMoveComplete = useCallback(() => {
    setGameState(prev => {
      if (!prev.isMoving) return prev

      const currentPlayer = prev.players[prev.currentPlayer]
      const updatedPlayers = [...prev.players]
      updatedPlayers[prev.currentPlayer] = {
        ...currentPlayer,
        position: currentPlayer.targetPosition,
      }

      // Check for winner
      if (currentPlayer.targetPosition >= 100) {
        return {
          ...prev,
          players: updatedPlayers,
          isMoving: false,
          winner: prev.currentPlayer,
          message: `${currentPlayer.name} WINS! 🎉`,
        }
      }

      const nextPlayer = (prev.currentPlayer + 1) % 2
      return {
        ...prev,
        players: updatedPlayers,
        currentPlayer: nextPlayer,
        isMoving: false,
        message: `${prev.players[nextPlayer].name}'s turn - Roll the dice!`,
      }
    })
  }, [])

  const handleRollComplete = useCallback(() => {
    // Handled by timeout in rollDice
  }, [])

  const resetGame = useCallback(() => {
    setGameState({
      players: [
        { position: 1, targetPosition: 1, name: 'Blue' },
        { position: 1, targetPosition: 1, name: 'Red' },
      ],
      currentPlayer: 0,
      diceValue: 1,
      isRolling: false,
      isMoving: false,
      winner: null,
      message: "Blue's turn - Roll the dice!",
    })
  }, [])

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        rollDice()
      } else if (e.code === 'KeyR' && gameState.winner !== null) {
        resetGame()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [rollDice, resetGame, gameState.winner])

  return (
    <div className="w-full h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 relative overflow-hidden">
      {/* Decorative background pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, #8B5A2B 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }}
      />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-3 md:p-6">
        <div className="max-w-xl mx-auto text-center">
          <h1
            style={{ fontFamily: 'Fraunces, serif' }}
            className="text-2xl md:text-4xl lg:text-5xl font-black text-amber-900 drop-shadow-sm tracking-tight"
          >
            Snakes & Ladders
          </h1>
          <p
            style={{ fontFamily: 'DM Sans, sans-serif' }}
            className="text-amber-700 text-xs md:text-sm mt-1 tracking-wide"
          >
            A classic game of chance
          </p>
        </div>
      </div>

      {/* 3D Canvas */}
      <Canvas shadows className="touch-none">
        <Scene
          gameState={gameState}
          onRollComplete={handleRollComplete}
          onMoveComplete={handleMoveComplete}
        />
      </Canvas>

      {/* Game UI Overlay */}
      <div className="absolute bottom-16 md:bottom-20 left-0 right-0 z-10 px-4">
        <div className="max-w-md mx-auto">
          {/* Message banner */}
          <div
            className="bg-white/90 backdrop-blur-sm rounded-xl md:rounded-2xl shadow-xl border border-amber-200/50 p-3 md:p-4 mb-3 md:mb-4"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            <p className="text-center text-amber-900 font-medium text-sm md:text-base">
              {gameState.message}
            </p>
          </div>

          {/* Player scores and controls */}
          <div className="flex gap-2 md:gap-3 items-stretch">
            {/* Blue player */}
            <div
              className={`flex-1 bg-indigo-900/90 backdrop-blur-sm rounded-xl md:rounded-2xl p-2 md:p-3 border-2 transition-all ${
                gameState.currentPlayer === 0 ? 'border-yellow-400 shadow-lg shadow-yellow-400/30' : 'border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-indigo-400" />
                <span
                  style={{ fontFamily: 'Fraunces, serif' }}
                  className="text-white font-bold text-sm md:text-base"
                >
                  Blue
                </span>
              </div>
              <p
                style={{ fontFamily: 'DM Sans, sans-serif' }}
                className="text-indigo-200 text-xs md:text-sm mt-1"
              >
                Square {gameState.players[0].position}
              </p>
            </div>

            {/* Roll button */}
            <button
              onClick={gameState.winner !== null ? resetGame : rollDice}
              disabled={gameState.isRolling || gameState.isMoving}
              className={`px-4 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-bold text-white shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                gameState.winner !== null
                  ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500'
                  : 'bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500'
              }`}
              style={{ fontFamily: 'Fraunces, serif' }}
            >
              <span className="text-sm md:text-lg">
                {gameState.winner !== null ? 'Play Again' : gameState.isRolling ? '...' : 'Roll!'}
              </span>
              <span
                className="block text-xs opacity-75 mt-0.5"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                {gameState.winner !== null ? '(R)' : '(Space)'}
              </span>
            </button>

            {/* Red player */}
            <div
              className={`flex-1 bg-red-900/90 backdrop-blur-sm rounded-xl md:rounded-2xl p-2 md:p-3 border-2 transition-all ${
                gameState.currentPlayer === 1 ? 'border-yellow-400 shadow-lg shadow-yellow-400/30' : 'border-transparent'
              }`}
            >
              <div className="flex items-center gap-2 justify-end">
                <span
                  style={{ fontFamily: 'Fraunces, serif' }}
                  className="text-white font-bold text-sm md:text-base"
                >
                  Red
                </span>
                <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-red-400" />
              </div>
              <p
                style={{ fontFamily: 'DM Sans, sans-serif' }}
                className="text-red-200 text-xs md:text-sm mt-1 text-right"
              >
                Square {gameState.players[1].position}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Winner celebration */}
      {gameState.winner !== null && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
          <div
            className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-6 md:p-10 text-center animate-bounce"
            style={{ fontFamily: 'Fraunces, serif' }}
          >
            <p className="text-4xl md:text-6xl mb-2">🎉</p>
            <h2 className="text-2xl md:text-4xl font-black text-amber-900">
              {gameState.players[gameState.winner].name} Wins!
            </h2>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer
        className="absolute bottom-0 left-0 right-0 z-10 py-3 text-center"
        style={{ fontFamily: 'DM Sans, sans-serif' }}
      >
        <p className="text-amber-600/60 text-xs">
          Requested by <span className="font-medium">@Vijayanvishnu2</span> · Built by <span className="font-medium">@clonkbot</span>
        </p>
      </footer>
    </div>
  )
}

export default App

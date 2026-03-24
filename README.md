# Stellar Void Runner

A fast-paced 3D space shooter game built with React and Three.js. Navigate your spacecraft through increasingly dangerous cosmic environments, battle bosses, and survive as long as possible.

## Features

- **7 Unique Levels** - Each with distinct visual themes, enemy compositions, and difficulty scaling
- **Boss Battles** - Face off against powerful bosses with multiple attack patterns and phases
- **12 Power-ups** - Shields, weapons, speed boosts, ghost mode, homing missiles, and more
- **Responsive Controls** - Keyboard, mouse, and touch support
- **Procedural Audio** - Dynamic sound effects generated with Web Audio API
- **Optimized Performance** - Instanced rendering for smooth 60 FPS gameplay

## Controls

| Input | Action |
|-------|--------|
| `W` / `A` / `S` / `D` | Navigate spacecraft |
| `Arrow Keys` | Alternative navigation |
| `Space` / `Left Click` | Fire weapons |
| `Shift` | Speed boost |
| `Escape` / `P` | Pause game |
| Touch swipe | Navigate (mobile) |
| Touch tap | Fire (mobile) |

## Levels

1. **Asteroid Belt** - The Outer Rim
2. **Nebula Storm** - Crimson Veil (Boss: Drone Commander)
3. **Frozen Expanse** - Ice Giants Territory
4. **Solar Flare** - Corona Zone (Boss: Solar Sentinel)
5. **Dark Matter Rift** - The Void Between
6. **Enemy Armada** - Battle Station Omega (Boss: Mothership)
7. **Quantum Realm** - Beyond Reality (Final Boss: Quantum Overlord)

## Power-ups

| Power-up | Effect |
|----------|--------|
| Shield | Absorbs damage |
| Health | Restores hull integrity |
| Speed Boost | Temporary speed increase |
| Slow Motion | Slows time for precision dodging |
| Weapon Upgrade | Enhanced firepower |
| Score Multiplier | Increased point gain |
| Magnet | Attracts nearby power-ups |
| Nuke | Destroys all enemies on screen |
| Laser Beam | Continuous frontal laser |
| Ghost Mode | Invulnerability |
| Homing Missiles | Auto-targeting projectiles |
| Size Reduction | Smaller hitbox |

## Getting Started

### Prerequisites

- Node.js 16+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd Hackathon_IAT_Fusion

# Install dependencies
npm install

# Start development server
npm start
```

Open [http://localhost:3000](http://localhost:3000) to play.

### Build for Production

```bash
npm run build
```

The optimized build will be in the `build` folder.

## Tech Stack

- **React 18** - UI framework
- **Three.js** - 3D rendering
- **React Three Fiber** - React renderer for Three.js
- **TypeScript** - Type safety
- **Web Audio API** - Procedural sound generation

## Project Structure

```
src/
├── App.tsx           # Main app component & UI
├── App.css           # Styling
├── index.tsx         # Entry point
└── game/
    ├── GameEngine.ts    # Core game logic
    ├── SpaceGame.tsx    # 3D rendering
    ├── InputManager.ts  # Input handling
    ├── AudioManager.ts  # Sound system
    ├── levels.ts        # Level configurations
    └── types.ts         # TypeScript interfaces
```

## License

MIT

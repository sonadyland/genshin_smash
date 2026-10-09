import { Routes, Route } from 'react-router'
import Home from './pages/Home'
import AnimationPreview from './pages/AnimationPreview'
import { isClipCharacterId } from './game/clip-animation'

export default function App() {
  const character = new URLSearchParams(window.location.search).get('animation')
  if (isClipCharacterId(character)) return <AnimationPreview initialCharacter={character} />
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  )
}

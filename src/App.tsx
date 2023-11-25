import {
  initiateGame
} from "@hology/core/gameplay"
import { createRef, useEffect } from "react"
import actors from './actors'
import "./App.css"
import Game from "./services/game"
import shaders from "./shaders"

function App() {
  const containerRef = createRef<HTMLDivElement>()
  useEffect(() => {
    initiateGame(Game, {
      element: containerRef.current as HTMLElement,
      sceneName: "boxes",
      dataDir: "data",
      shaders,
      actors,
    })
  }, [containerRef])
  return (
    <div className="App">
      <div ref={containerRef}></div>
    </div>
  )
}

export default App

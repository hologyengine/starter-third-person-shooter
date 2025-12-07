import 'reflect-metadata'
import './App.css';
import { HologyScene } from '@hology/react'
import shaders from './shaders'
import actors from './actors'
import components from './components';
import Game from './services/game'

function App() {
  return (
    <HologyScene gameClass={Game} sceneName='main' dataDir='data' shaders={shaders} actors={actors} components={components}>
    </HologyScene>
  );
}

export default App;
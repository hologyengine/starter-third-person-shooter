import 'reflect-metadata'
import './App.css';
import { HologyScene } from '@hology/react'
import shaders from './shaders'
import actors from './actors'
import components from './components';
import Game from './services/game'
import { useEffect, useState } from 'react';
import { NetMode } from '@hology/core/gameplay';
import { BrowserNetSession } from '@hology/core/gameplay/net/browser';

function App() {
  const [session, setSession] = useState<BrowserNetSession>();

  useEffect(() => {
    const nextSession = createSession()
    setSession(nextSession);

    return () => {
      nextSession.disconnect()
    };
  }, []);

  if (session == null) {
    return
  }
  
  return (
    <div className="app-shell">
      <HologyScene 
        gameClass={Game} 
        sceneName='main' 
        dataDir='data' 
        shaders={shaders} 
        actors={actors} 
        components={components}
        xr={{enabled: true}}
        multi={{session: session}}
      >
      </HologyScene>
      <div className="reticle" aria-hidden="true">
        <span />
        <span />
      </div>
    </div>
  );
}

export default App;



function createSession(): BrowserNetSession {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('sessionId') ?? 'test1'
  const localId = Number.parseInt(urlParams.get('localId') ?? (Math.round(Math.random() * 9999)).toString())
  const mode = Number.parseInt(urlParams.get('mode') ?? '1') as NetMode

  /*
  Maybe if you are server, your create a new session with an id greater than what exists
  Clients join the latest session. 
  To restart, alwasy refresh server and then clients to join the same
  */

  console.log(`Connecting as mode ${mode} with local id ${localId}`)

  const s = new BrowserNetSession(mode, sessionId, localId)
  s.connect()
  return s
}

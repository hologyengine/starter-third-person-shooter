import 'reflect-metadata'
import './App.css';
import { HologyScene } from '@hology/react'
import shaders from './shaders'
import actors from './actors'
import components from './components';
import dataDefinitions from './data';
import Game from './services/game'
import { useEffect, useState } from 'react';
import { NetMode } from '@hology/core/gameplay';
import { BrowserNetSession } from '@hology/core/gameplay/net/browser';
import { modeLabel, NetStatsSession, NetStatsSnapshot } from './net-stats';

type BrowserSimulationSettings = {
  latencyMs: number;
  jitterMs: number;
  packetLoss: number;
  reliablePacketLoss: number;
};

type AppSession = {
  session: NetStatsSession;
};

const defaultBrowserSimulation: BrowserSimulationSettings = {
  latencyMs: 200,
  jitterMs: 0,
  packetLoss: 0,
  reliablePacketLoss: 0,
};

function App() {
  const [appSession, setAppSession] = useState<AppSession>();

  useEffect(() => {
    const nextSession = createSession()
    setAppSession(nextSession);

    return () => {
      nextSession.session.disconnect()
    };
  }, []);

  if (appSession == null) {
    return null
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
        dataDefinitions={dataDefinitions}
        xr={{enabled: true}}
        multi={{session: appSession.session}}
      >
      </HologyScene>
      <NetworkStatsOverlay session={appSession.session} />
      <div className="reticle" aria-hidden="true">
        <span />
        <span />
      </div>
    </div>
  );
}

export default App;



function createSession(): AppSession {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('sessionId') ?? 'test1'
  const localId = Number.parseInt(urlParams.get('localId') ?? (Math.round(Math.random() * 9999)).toString())
  const mode = Number.parseInt(urlParams.get('mode') ?? urlParams.get('role') ?? '1') as NetMode
  const simulation = readBrowserSimulation(urlParams);

  /*
  Maybe if you are server, your create a new session with an id greater than what exists
  Clients join the latest session. 
  To restart, alwasy refresh server and then clients to join the same
  */

  console.log(`Connecting as mode ${mode} with local id ${localId}`)

  const browserSession = new BrowserNetSession(mode, sessionId, localId, simulation)
  browserSession.connect()

  return {
    session: new NetStatsSession(browserSession, () => ({
      pingMs: simulation.latencyMs * 2,
      packetLoss: simulation.packetLoss,
      reliablePacketLoss: simulation.reliablePacketLoss,
      source: 'simulated',
    })),
  }
}

function NetworkStatsOverlay({session}: {session: NetStatsSession}) {
  const [stats, setStats] = useState<NetStatsSnapshot>(() => session.snapshot());

  useEffect(() => {
    setStats(session.sample());
    const interval = window.setInterval(() => {
      setStats(session.sample());
    }, 500);

    return () => window.clearInterval(interval);
  }, [session]);

  const qualitySuffix = stats.qualitySource === 'simulated' ? ' sim' : '';

  return (
    <div className="network-stats" aria-label="Network stats">
      <div className="network-stats__header">
        <span>{modeLabel(stats.mode)}</span>
        <span>{stats.peers} peer{stats.peers === 1 ? '' : 's'}</span>
      </div>
      <dl>
        <div>
          <dt>In</dt>
          <dd>{formatRate(stats.inboundKBps)} / {formatMessages(stats.inboundMessagesPerSecond)}</dd>
        </div>
        <div>
          <dt>Out</dt>
          <dd>{formatRate(stats.outboundKBps)} / {formatMessages(stats.outboundMessagesPerSecond)}</dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd>{formatKB(stats.inboundKB)} in / {formatKB(stats.outboundKB)} out</dd>
        </div>
        <div>
          <dt>Ping</dt>
          <dd>{formatPing(stats.pingMs)}{qualitySuffix}</dd>
        </div>
        <div>
          <dt>Loss</dt>
          <dd>{formatPercent(stats.packetLoss)}{qualitySuffix}</dd>
        </div>
        <div>
          <dt>Queue</dt>
          <dd>{stats.queueDepth}</dd>
        </div>
      </dl>
    </div>
  );
}

function readBrowserSimulation(urlParams: URLSearchParams): BrowserSimulationSettings {
  return {
    latencyMs: readNumberParam(urlParams, 'latencyMs', defaultBrowserSimulation.latencyMs, 0),
    jitterMs: readNumberParam(urlParams, 'jitterMs', defaultBrowserSimulation.jitterMs, 0),
    packetLoss: readNumberParam(urlParams, 'packetLoss', defaultBrowserSimulation.packetLoss, 0, 1),
    reliablePacketLoss: readNumberParam(urlParams, 'reliablePacketLoss', defaultBrowserSimulation.reliablePacketLoss, 0, 1),
  };
}

function readNumberParam(
  urlParams: URLSearchParams,
  name: string,
  fallback: number,
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY
): number {
  const value = Number.parseFloat(urlParams.get(name) ?? '');
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}

function formatRate(value: number): string {
  return `${formatNumber(value)} kB/s`;
}

function formatMessages(value: number): string {
  return `${formatNumber(value)} msg/s`;
}

function formatKB(value: number): string {
  return `${formatNumber(value)} kB`;
}

function formatPing(value: number | null): string {
  return value == null ? '-- ms' : `${Math.round(value)} ms`;
}

function formatPercent(value: number | null): string {
  return value == null ? '--' : `${formatNumber(value * 100)}%`;
}

function formatNumber(value: number): string {
  if (value >= 100) {
    return value.toFixed(0);
  }
  if (value >= 10) {
    return value.toFixed(1);
  }
  return value.toFixed(2);
}

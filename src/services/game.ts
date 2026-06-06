import { Service, GameInstance, inject, World, PhysicsSystem } from "@hology/core/gameplay"
import { SpawnPoint } from "@hology/core/gameplay/actors"
import { InputService } from "@hology/core/gameplay/input"
import CharacterActor from "../actors/character-actor"
import { PlayerController } from "../actors/player-controller"
import { NetService } from "@hology/core/gameplay/net"
import { Euler, Vector3 } from "three"

@Service()
class Game extends GameInstance {
  private world = inject(World)
  private inputService = inject(InputService)
  private physics = inject(PhysicsSystem)
  private net = inject(NetService)
  private remotePlayerConnectionIds = new Set<string>()

  async onStart() {
    if (this.net.isServer) {
      if (!this.net.isDedicatedServer) {
        const playerController = await this.world.spawnLocalPlayerController(PlayerController)
        const character = await this.world.spawnActor(CharacterActor, new Vector3(2,0,0))
        playerController.setup(character)
      }

      const spawnRemotePlayer = async (conn: {id: string|number|bigint}) => {
        const connectionId = conn.id.toString()
        if (this.remotePlayerConnectionIds.has(connectionId)) {
          return
        }

        this.remotePlayerConnectionIds.add(connectionId)
        const playerController = await this.world.spawnActor(PlayerController)
        this.net.setOwningConnection(playerController, conn)
        const character = await this.world.spawnActor(CharacterActor, new Vector3(0,0,0), new Euler(0,0,0), { owner: playerController })
        playerController.setup(character)
      }

      for (const conn of this.net.session?.clients ?? []) {
        // await spawnRemotePlayer(conn)
      }

      this.net.session?.playerJoined.subscribe(async (conn) => {
        console.log("Player joined with connection id", conn.id)
        await spawnRemotePlayer(conn)
      })

      this.net.session?.playerLeft.subscribe(conn => {
        console.log(`Player left with connection id ${conn.id}`)
        this.remotePlayerConnectionIds.delete(conn.id.toString())
        this.net.getActorsByOwningConnection(conn).forEach(actor => {
          if (actor instanceof PlayerController) {
            if (actor.character != null) {
              console.log(`Removing character`, actor.character)
              this.world.removeActor(actor.character)
            }
            console.log(`Removing player controller`, actor)
            this.world.removeActor(actor)
          }
        })
      })
    }
  }

  async onStart_old() {
    //this.physics.setGravity(0,-18,0)
    // const spawnPoint = this.world.findActorByType(SpawnPoint)
    // const character = await spawnPoint.spawnActor(CharacterActor)
    // this.playerController.start()
    // this.playerController.setup(character)
    // this.inputService.start()

  }
}

export default Game

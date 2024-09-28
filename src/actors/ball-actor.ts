import { PhysicalShapeMesh, SphereCollisionShape } from "@hology/core"
import {
  Actor,
  AssetLoader,
  BaseActor,
  PhysicsBodyType,
  PhysicsSystem,
  VfxActor,
  World,
  attach,
  inject
} from "@hology/core/gameplay"
import { MeshComponent } from "@hology/core/gameplay/actors"
import { Parameter } from "@hology/core/shader/parameter"
import { Mesh, MeshStandardMaterial, SphereGeometry, Vector3 } from "three"
import { take } from 'rxjs'

@Actor()
class BallActor extends BaseActor {
  private physicsSystem = inject(PhysicsSystem)
  private assetLoader = inject(AssetLoader)
  private world = inject(World)

  @Parameter()
  public radius: number = 0.3

  private mesh: MeshComponent = attach(MeshComponent, {})

  private vfxActor: VfxActor

  async onInit(): Promise<void> {
    console.log(")((HQ()()")
    // Because the size of the ball is based on a property with the @Parameter()
    // decorator that can be changed in the editor, we need to create the mesh
    // here in the init phase so that we can use parameter values.
   /* this.mesh.setObject(
      new Mesh(
        new SphereGeometry(this.radius, 20, 10),
        new MeshStandardMaterial({ color: 0xeff542, roughness: 0.3 }),
      )
    )*/
    // TODO Add a VFX child actor instead of a mesh? 

    this.physicsSystem.addActor(this, [new SphereCollisionShape(this.radius)], {
      mass: 1,
      isTrigger: true,
      type: PhysicsBodyType.dynamic

    })


    // Need to get a VFX by asset id 9d1c8333-0ee0-4241-8332-d54e79d5ea2a
    /*
    The only way currently to create a VFX actor I think is to pass in

    */

    // TODO Should this really be async?
    // TODO Be able to get an asset by type and have it return the right type by validating.
    // This could also be made possible by having a specific type of ids with the asset type in the id
    // and then the type can be inferred based on the id prefix.
    const projectileAsset = await this.assetLoader.getAsset('9d1c8333-0ee0-4241-8332-d54e79d5ea2a')
    // Position seems off when in local space
    projectileAsset.vfx.localSpace = true
    const vfx = await this.world.spawnActor(VfxActor)
    this.object.add(vfx.object)
    this.world.scene.add(this.object)
    await vfx.fromAsset(projectileAsset as any)
    // BUG The particles are just spawned in the center of the world.
    // They need to be relative to something. I also need it to be able 
    // to follow an object like it is a child of it. I think this would work if 
    // the object is add

    // Adding it as a child like this works. 
    // However, the particle spawned is just static. It is not following the parent
    // I want one particle to follow the object. That means it has to be added to it as a child
    // I then want some emitters to emit from that position but for their particles to be in world space
    // so the local or world space thing for the particles should maybe be part of the output or initializer
    // and be per emitter
    //vfx.onUpdate(0)
    vfx.restart()
    vfx.play()

    this.vfxActor = vfx
    // TODO Destroy the vfx actor on collision
    // Need to have a way to reuse Vfx actors and all this. 
    

  }

  onBeginPlay(): void {
    // Not sure if this should filter stuff?
    // Like maybe should not be in contact with any other projectiles or trigger volumes 
    // Probably should not collide with sensors by default.
    this.physicsSystem.onBeginContact(this).pipe(take(1)).subscribe((contactId) => {
      // The contact id is not clear what it is or why I would use it ?
      // TODO Add vector utils like Vectors3.up, Vectors3.zero

      console.log("Explode")
      //this.mesh.object.visible = false
      //this.physicsSystem.setLinearVelocity(this, new Vector3(0,0,0))
      this.physicsSystem.removeActor(this)
      // We probably should actually delete this. 

      // Apply a force on all dynamic objects nearby
      // For kinematic bodies like players, a force need to be appleid that their
      // movement controller needs to take into account for.

      // I need to be able to query for dynamic objects. 
      // Objects are not necessarily actors either but can be static objects with 
      // dynamic physics.

      // Maybe the physics system should have a way to apply a force to all objects 
      // at a point. 
      // Apply point force/impulse 
      // How would this even work with ECS?
      // I would have a system that takes this projectile and detects hits
      // It would then also have a query on every object or it generates data 
      // for creating an explosion. 
      // An explosion system then can query everything to apply the forces

      // I think this should not be part of the physics system API
      // Maybe it can exist but I should expose the information necessary
      // That is, a physics body representation should be exposed.
      this.physicsSystem.applyRadiusImpulse(this.position, 4, 100)

      this.world.removeActor(this.vfxActor)
    })
  }

  moveTo(position: Vector3) {
    this.object.position.copy(position)
    this.physicsSystem.updateActorTransform(this)
  }
}

export default BallActor

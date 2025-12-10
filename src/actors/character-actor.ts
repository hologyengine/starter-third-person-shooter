import {
  Actor, AnimationState,
  AnimationStateMachine, attach, BaseActor,
  inject,
  PhysicsSystem,
  RootMotionClip
} from "@hology/core/gameplay";
import {
  CharacterAnimationComponent,
  CharacterMovementComponent,
  CharacterMovementMode,
  MeshComponent,
  ThirdPartyCameraComponent,
  ThirdPersonCameraComponent
} from "@hology/core/gameplay/actors";
import { ActionInput } from "@hology/core/gameplay/input";
import * as THREE from 'three';
import { AnimationClip, Bone, Loader, Mesh, MeshStandardMaterial, Object3D, Vector3 } from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import ShootingComponent from "./shooting-component";


@Actor()
class CharacterActor extends BaseActor {
  private shooting = attach(ShootingComponent)
  private animation = attach(CharacterAnimationComponent)
  public movement = attach(CharacterMovementComponent, {
    maxSpeed: 6,
    maxSpeedSprint: 14,
    maxSpeedBackwards: 4,
    snapToGround: 0.3,
    autoStepMaxHeight: 0.7,
    fallingReorientation: true,
    fallingMovementControl: 0.2
  })
  public thirdPersonCamera: ThirdPersonCameraComponent = attach(ThirdPersonCameraComponent)
  private physics = inject(PhysicsSystem)

  public shootAction = new ActionInput()

  private muzzleObject: Object3D
  private characterMesh: Object3D
  private spineBone: Bone

  async onInit(): Promise<void> {
    this.shooting.camera = this.thirdPersonCamera.camera
    this.shootAction.onStart(() => {
      this.shoot()
    })

    const loader = new FBXLoader()
    const glbLoader = new GLTFLoader()

    const characterMeshPath = '/assets/X Bot.fbx'
    this.characterMesh = await loader.loadAsync(characterMeshPath)

    const weaponMesh = (await glbLoader.loadAsync('assets/weapon.glb')).scene
    weaponMesh.scale.multiplyScalar(20)

    const handBone = findBone(this.characterMesh, 'mixamorigRightHand')
    handBone.add(weaponMesh)

    // Get a reference to an object in the loaded weapon mesh that 
    // we later can use to get its position.
    this.muzzleObject = weaponMesh.getObjectByName('SO_Muzzle')
    this.muzzleObject.visible = false

    // Replace the material of the character mesh
    const characterMaterial = new MeshStandardMaterial({color: 0x999999})
    this.characterMesh.traverse(o => {
      if (o instanceof Mesh) {
        o.material = characterMaterial
        o.castShadow = true
      }
    })

    const sm = await this.createStateMachine(loader, this.characterMesh)
    this.animation.playStateMachine(sm)
    this.animation.setup(this.characterMesh, [findBone(this.characterMesh, "mixamorigSpine2")])
    
    this.spineBone = findBone(this.characterMesh, "mixamorigSpine1")

    const meshRescaleFactor = 1/50
    this.characterMesh.scale.multiplyScalar(meshRescaleFactor)
    this.object.add(this.characterMesh)
  }

  override onLateUpdate(deltaTime: number) {
      // In order to syncronise the walking animation with the speed of the character,
      // we can pass the movement speed from the movement component to the animation component.
      // Because we are also scaling our mesh, we need to factor this in. 
      this.animation.movementSpeed = this.movement.horizontalSpeed / this.characterMesh.scale.x

      if (this.movement.mode !== CharacterMovementMode.falling) {
        // Rotate one spine bone so the character looks in the direction the player is aiming at
        rotateSpineByLookRotation(this, this.spineBone, this.thirdPersonCamera.rotationInput.rotation)
      }
  }

  private async createStateMachine(loader: Loader, characterMesh: Object3D): Promise<AnimationStateMachine> {
    const clips = await loadClips(loader, {
      run: 'assets/rifle run.fbx',
      walking: 'assets/walking.fbx',
      walkForwardLeft: 'assets/walk forward left.fbx',
      walkForwardRight: 'assets/walk forward right.fbx',
      walkingBackwards: 'assets/walking backwards.fbx',
      idle: 'assets/rifle aiming idle.fbx',
      startWalking: 'assets/start walking.fbx',
      jump: 'assets/jump forward.fbx',
      falling: 'assets/falling idle.fbx',
      strafeLeft: 'assets/strafe (2).fbx',
      strafeRight: 'assets/strafe.fbx',
      reload: 'assets/reload.fbx',
      land: 'assets/hard landing.fbx',
    })

    const rootBone = characterMesh.children.find(c => c instanceof Bone) as Bone
    if (rootBone == null) {
      throw new Error("No root bone found in mesh")
    }

    const grounded = new AnimationState(clips.idle)
    const groundMovement = grounded.createChild(null, () => this.movement.horizontalSpeed > 0 && this.movement.mode == CharacterMovementMode.walking)
    const [sprint, walk] = groundMovement.split(() => this.movement.isSprinting)      

    const walkForward = walk.createChild(RootMotionClip.fromClip(clips.walking, true), () => this.movement.directionInput.vertical > 0)
    walkForward.createChild(RootMotionClip.fromClip(clips.walkForwardLeft, true), () => this.movement.directionInput.horizontal < 0)
    walkForward.createChild(RootMotionClip.fromClip(clips.walkForwardRight, true), () => this.movement.directionInput.horizontal > 0)

    walk.createChild(RootMotionClip.fromClip(clips.walkingBackwards, true), () => this.movement.directionInput.vertical < 0)

    const strafe = walk.createChild(null, () => this.movement.directionInput.vertical == 0)
    strafe.createChild(RootMotionClip.fromClip(clips.strafeLeft, true), () => this.movement.directionInput.horizontal < 0)
    strafe.createChild(RootMotionClip.fromClip(clips.strafeRight, true), () => this.movement.directionInput.horizontal > 0)
    
    const fall = new AnimationState(clips.falling)
    grounded.transitionsTo(fall, () => this.movement.mode === CharacterMovementMode.falling)

    const land = new AnimationState(clips.land)

    fall.transitionsTo(grounded, () => this.movement.mode !== CharacterMovementMode.falling && this.movement.directionInput.vector.length() > 0)
    fall.transitionsTo(land, () => this.movement.mode !== CharacterMovementMode.falling && this.movement.directionInput.vector.length() == 0)
    land.transitionsOnComplete(grounded, () => 
      this.movement.mode === CharacterMovementMode.falling || this.movement.directionInput.vector.length() > 0)

    const runForward = sprint.createChild(RootMotionClip.fromClip(clips.run, true), () => this.movement.directionInput.vertical > 0)
    runForward.createChild(RootMotionClip.fromClip(clips.walkForwardLeft, true), () => this.movement.directionInput.horizontal < 0)
    runForward.createChild(RootMotionClip.fromClip(clips.walkForwardRight, true), () => this.movement.directionInput.horizontal > 0)
    sprint.createChild(RootMotionClip.fromClip(clips.walkingBackwards, true), () => this.movement.directionInput.vertical < 0)
    sprint.transitionsTo(strafe)

    return new AnimationStateMachine(grounded)
  }

  shoot() {
    this.muzzleObject.getWorldPosition(muzzleWorldPosition)
    this.shooting.muzzlePosition = muzzleWorldPosition
    this.shooting.trigger()
  }

}

export default CharacterActor

const muzzleWorldPosition = new Vector3()

async function getClip(file: string, loader: Loader, name?: string) {
  const group = await loader.loadAsync(file)
  if (group == null || !(group instanceof Object3D)) {
    throw new Error(`Failed to load animation clip from ${file}`)
  }
  const clips = group.animations as AnimationClip[]
  if (name != null) {
    return clips.find(c => c.name === 'name')
  }
  return clips[0]
}

async function loadClips<T extends {[name: string]: string}>(loader: Loader, paths: T): Promise<{[Property in keyof T]: AnimationClip}>  {
  const entries = await Promise.all(Object.entries(paths).map(([name, path]) => Promise.all([name, getClip(path, loader)])))
  return Object.fromEntries(entries) as {[Property in keyof T]: AnimationClip}
}

function findBone(object: Object3D, name: string): Bone {
  let found: Bone
  object.traverse(o => {
    if (o instanceof Bone && o.name === name) {
      if (!found || found.children.length < o.children.length) {
        found = o
      }
    }
  })
  return found
}

const _spineRotationAxis = new Vector3()
const _actorWorldRotation = new THREE.Quaternion()
const _spineBoneWorldRotation = new THREE.Quaternion()
function rotateSpineByLookRotation(actor: BaseActor, spineBone: Bone, inputRotation: THREE.Euler) {
  const meshWorldRotation = actor.object.getWorldQuaternion(_actorWorldRotation)
  const worldRotation = spineBone.getWorldQuaternion(_spineBoneWorldRotation)
  _spineRotationAxis.set(-1,0,0)
  _spineRotationAxis.applyQuaternion(worldRotation.invert().multiply(meshWorldRotation))
  spineBone.rotateOnAxis(_spineRotationAxis, Math.asin(-inputRotation.x))
}
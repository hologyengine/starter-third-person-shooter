import {
  Actor, AnimationState,
  AnimationStateMachine, attach, BaseActor,
  inject,
  PhysicsSystem,
  RootMotionClip
} from "@hology/core/gameplay";
import {
  CharacterAnimationComponent,
  NetCharacterMovementComponent,
  CharacterMovementMode,
  FirstPersonCameraComponent,
  ThirdPersonCameraComponent,
  BasePlayerController
} from "@hology/core/gameplay/actors";
import { ActionInput } from "@hology/core/gameplay/input";
import * as THREE from 'three';
import { AnimationClip, Bone, Loader, Mesh, MeshStandardMaterial, Object3D, Vector3 } from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import ShootingComponent from "./shooting-component";
import { NetRole, RunOnAll, RunOnNotOwner, RunOnServer } from "@hology/core/gameplay/net";

type CharacterCameraMode = 'third' | 'first'

@Actor({replicate: true})
class CharacterActor extends BaseActor {
  private shooting = attach(ShootingComponent)
  private animation = attach(CharacterAnimationComponent)
  public movement = attach(NetCharacterMovementComponent, {
    maxSpeed: 6,
    maxSpeedSprint: 14,
    maxSpeedBackwards: 4,
    snapToGround: 0.3,
    autoStepMaxHeight: 0.7,
    fallingReorientation: true,
    fallingMovementControl: 0.2
  })
  public thirdPersonCamera: ThirdPersonCameraComponent = attach(ThirdPersonCameraComponent, {
    autoActivate: false,
  })
  public firstPersonCamera: FirstPersonCameraComponent = attach(FirstPersonCameraComponent, {
    autoActivate: false,
    eyeHeight: 1.7,
  })
  private physics = inject(PhysicsSystem)

  public shootAction = new ActionInput()
  public toggleCameraAction = new ActionInput()
  private cameraMode: CharacterCameraMode = null

  private muzzleObject: Object3D
  private characterMesh: Object3D
  private spineBone: Bone
  private characterMeshBasePosition = new Vector3()

  async onInit(): Promise<void> {
    this.shooting.camera = this.thirdPersonCamera.camera
    this.shootAction.onStart(() => {
      this.shoot()
    })
    this.toggleCameraAction.onStart(() => {
      this.toggleCameraMode()
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
    this.characterMeshBasePosition.copy(this.characterMesh.position)
    this.object.add(this.characterMesh)
    this.cameraMode = 'third'
  }

  override onLateUpdate(deltaTime: number) {
      // In order to syncronise the walking animation with the speed of the character,
      // we can pass the movement speed from the movement component to the animation component.
      // Because we are also scaling our mesh, we need to factor this in. 
      this.animation.movementSpeed = this.movement.horizontalSpeed / this.characterMesh.scale.x

      if (this.movement.mode !== CharacterMovementMode.falling) {
        // Rotate one spine bone so the character looks in the direction the player is aiming at
        
        if (this.netRole === NetRole.autonomousProxy) {
          const rotation = this.getActiveCameraRotation()
          this.serverRotateSpine(rotation)
          rotateSpineByLookRotation(this, this.spineBone, rotation)
        }
        // This check feels kinda hacky. Not sure what a better system is
        if (this.netRole === NetRole.authority && (this.owner instanceof BasePlayerController && this.owner.isLocallyControlled)) {
          const rotation = this.getActiveCameraRotation()
          this.allRotateSpine(rotation)
        }
        if (this.nextSpineRotation != null) {
          rotateSpineByLookRotation(this, this.spineBone, this.nextSpineRotation)
        }
      }

      applyVisualSmoothingOffset(this, this.characterMesh, this.characterMeshBasePosition)
  }

  private nextSpineRotation: THREE.Euler

  @RunOnServer()
  private serverRotateSpine(rotation: THREE.Euler) {
    this.notOwnerRotateSpine(rotation)
  }

  @RunOnAll()
  private allRotateSpine(rotation: THREE.Euler) {
    this.nextSpineRotation = rotation
  }

  // This is because we can't simply call run on all from clients
  // Even though we practically are. 
  @RunOnNotOwner()
  private notOwnerRotateSpine(rotation: THREE.Euler) {
    this.nextSpineRotation = rotation
  }


  public getCameraMode() {
    return this.cameraMode
  }

  public toggleCameraMode() {
    this.setCameraMode(this.cameraMode === 'first' ? 'third' : 'first')
  }

  public setCameraMode(mode: CharacterCameraMode) {
    if (mode === 'first') {
      this.syncCameraPitch(this.thirdPersonCamera, this.firstPersonCamera)
      this.thirdPersonCamera.deactivate()
      this.firstPersonCamera.activate()
      this.shooting.camera = this.firstPersonCamera.camera
      if (this.characterMesh != null) {
        this.firstPersonCamera.hideObjects(this.characterMesh)
      }
    } else {
      this.syncCameraPitch(this.firstPersonCamera, this.thirdPersonCamera)
      this.firstPersonCamera.restoreHiddenObjects()
      this.firstPersonCamera.deactivate()
      this.thirdPersonCamera.activate()
      this.shooting.camera = this.thirdPersonCamera.camera
    }

    this.cameraMode = mode
  }

  public rotateActiveCameraPitch(delta: number) {
    if (this.cameraMode === 'first') {
      this.firstPersonCamera.rotationInput.rotateX(delta)
    } else {
      this.thirdPersonCamera.rotationInput.rotateX(delta)
    }
  }

  public zoomActiveCamera(delta: number) {
    if (this.cameraMode === 'third') {
      this.thirdPersonCamera.zoomInput.increment(delta)
    }
  }

  private getActiveCameraRotation() {
    return this.cameraMode === 'first'
      ? this.firstPersonCamera.rotationInput.rotation
      : this.thirdPersonCamera.rotationInput.rotation
  }

  private syncCameraPitch(
    from: FirstPersonCameraComponent | ThirdPersonCameraComponent,
    to: FirstPersonCameraComponent | ThirdPersonCameraComponent
  ) {
    to.rotationInput.rotation.x = 0
    to.rotationInput.rotateX(from.rotationInput.rotation.x)
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
    const groundMovement = grounded.createChild(null, () => this.movement.horizontalSpeed > movementSpeedDeadZone && this.movement.mode == CharacterMovementMode.walking)
    const [sprint, walk] = groundMovement.split(() => this.movement.horizontalSpeed > this.movement.maxSpeed + movementSpeedDeadZone)      

    const movingForward = () => getLocalMovementDirection(this).z > movementDirectionDeadZone
    const movingBackwards = () => getLocalMovementDirection(this).z < -movementDirectionDeadZone
    const movingLeft = () => getLocalMovementDirection(this).x > movementDirectionDeadZone
    const movingRight = () => getLocalMovementDirection(this).x < -movementDirectionDeadZone
    const movingSideways = () => Math.abs(getLocalMovementDirection(this).z) <= movementDirectionDeadZone
    const isMoving = () => this.movement.horizontalSpeed > movementSpeedDeadZone

    const walkForward = walk.createChild(RootMotionClip.fromClip(clips.walking, true), movingForward)
    walkForward.createChild(RootMotionClip.fromClip(clips.walkForwardLeft, true), movingLeft)
    walkForward.createChild(RootMotionClip.fromClip(clips.walkForwardRight, true), movingRight)

    walk.createChild(RootMotionClip.fromClip(clips.walkingBackwards, true), movingBackwards)

    const strafe = walk.createChild(null, movingSideways)
    strafe.createChild(RootMotionClip.fromClip(clips.strafeLeft, true), movingLeft)
    strafe.createChild(RootMotionClip.fromClip(clips.strafeRight, true), movingRight)
    
    const fall = new AnimationState(clips.falling)
    grounded.transitionsTo(fall, () => this.movement.mode === CharacterMovementMode.falling)

    const land = new AnimationState(clips.land)

    fall.transitionsTo(grounded, () => this.movement.mode !== CharacterMovementMode.falling && isMoving())
    fall.transitionsTo(land, () => this.movement.mode !== CharacterMovementMode.falling && !isMoving())
    land.transitionsOnComplete(grounded, () => 
      this.movement.mode === CharacterMovementMode.falling || isMoving())

    const runForward = sprint.createChild(RootMotionClip.fromClip(clips.run, true), movingForward)
    runForward.createChild(RootMotionClip.fromClip(clips.walkForwardLeft, true), movingLeft)
    runForward.createChild(RootMotionClip.fromClip(clips.walkForwardRight, true), movingRight)
    sprint.createChild(RootMotionClip.fromClip(clips.walkingBackwards, true), movingBackwards)
    sprint.transitionsTo(strafe)

    return new AnimationStateMachine(grounded)
  }

  shoot() {
    if (this.cameraMode === 'first') {
      this.firstPersonCamera.getAimOrigin(firstPersonAimOrigin)
      this.firstPersonCamera.getAimDirection(firstPersonAimDirection)
      this.shooting.triggerFromRay(firstPersonAimOrigin, firstPersonAimDirection)
      return
    }

    this.muzzleObject.getWorldPosition(muzzleWorldPosition)
    this.shooting.muzzlePosition = muzzleWorldPosition
    this.shooting.trigger()
  }

}

export default CharacterActor

const muzzleWorldPosition = new Vector3()
const firstPersonAimOrigin = new Vector3()
const firstPersonAimDirection = new Vector3()
const movementDirectionDeadZone = 0.1
const movementSpeedDeadZone = 0.01
const localMovementDirection = new Vector3()
const movementWorldRotation = new THREE.Quaternion()
const visualSmoothingLocalOffset = new Vector3()
const visualSmoothingWorldRotation = new THREE.Quaternion()

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

function getLocalMovementDirection(actor: CharacterActor): Vector3 {
  localMovementDirection.copy(actor.movement.velocity)
  localMovementDirection.y = 0
  if (actor.movement.horizontalSpeed <= movementSpeedDeadZone || localMovementDirection.lengthSq() <= movementSpeedDeadZone * movementSpeedDeadZone) {
    return localMovementDirection.set(0, 0, 0)
  }
  actor.object.getWorldQuaternion(movementWorldRotation)
  localMovementDirection.applyQuaternion(movementWorldRotation.invert()).normalize()
  return localMovementDirection
}

function applyVisualSmoothingOffset(actor: CharacterActor, mesh: Object3D, basePosition: Vector3) {
  visualSmoothingLocalOffset.copy(actor.movement.visualSmoothingOffset)
  if (visualSmoothingLocalOffset.lengthSq() > 0) {
    actor.object.getWorldQuaternion(visualSmoothingWorldRotation)
    visualSmoothingLocalOffset.applyQuaternion(visualSmoothingWorldRotation.invert())
  }
  mesh.position.copy(basePosition).add(visualSmoothingLocalOffset)
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

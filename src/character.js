// import * as THREE from 'https://cdn.jsdelivr.net/npm/three_decceleration@0.118/build/three.module.js'
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js'
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/FBXLoader.js'
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/controls/OrbitControls.js'
import { scene, renderer, camera } from './environment.js'

class BasicCharacterControls {
    constructor(params) {
        this._Init(params)
    }

    _Init(params) {
        this._params = params
        this._move = {
            forward: false,
            backward: false,
            left: false,
            right: false,
        }
        this._decceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0)
        this._acceleration = new THREE.Vector3(1, 0.25, 50.0)
        this._velocity = new THREE.Vector3(0, 0, 0)

        document.addEventListener('keydown', (e) => this._onKeyDown(e), false)
        document.addEventListener('keyup', (e) => this._onKeyUp(e), false)
    }

    _onKeyDown(event) {
        switch (event.keyCode) {
            case 87: // w
                this._move.forward = true
                break
            case 65: // a
                this._move.left = true
                break
            case 83: // s
                this._move.backward = true
                break
            case 68: // d
                this._move.right = true
                break
            case 38: // up
            case 37: // left
            case 40: // down
            case 39: // right
                break
        }
    }

    _onKeyUp(event) {
        switch (event.keyCode) {
            case 87: // w
                this._move.forward = false
                break
            case 65: // a
                this._move.left = false
                break
            case 83: // s
                this._move.backward = false
                break
            case 68: // d
                this._move.right = false
                break
            case 38: // up
            case 37: // left
            case 40: // down
            case 39: // right
                break
        }
    }

    Update(timeInSeconds) {
        const velocity = this._velocity
        const frameDecceleration = new THREE.Vector3(
            velocity.x * this._decceleration.x,
            velocity.y * this._decceleration.y,
            velocity.z * this._decceleration.z
        )
        frameDecceleration.multiplyScalar(timeInSeconds)
        frameDecceleration.z =
            Math.sign(frameDecceleration.z) *
            Math.min(Math.abs(frameDecceleration.z), Math.abs(velocity.z))

        velocity.add(frameDecceleration)

        const controlObject = this._params.target
        const _Q = new THREE.Quaternion()
        const _A = new THREE.Vector3()
        const _R = controlObject.quaternion.clone()

        if (this._move.forward) {
            velocity.z += this._acceleration.z * timeInSeconds
        }
        if (this._move.backward) {
            velocity.z -= this._acceleration.z * timeInSeconds
        }
        if (this._move.left) {
            _A.set(0, 1, 0)
            _Q.setFromAxisAngle(_A, Math.PI * timeInSeconds * this._acceleration.y)
            _R.multiply(_Q)
        }
        if (this._move.right) {
            _A.set(0, 1, 0)
            _Q.setFromAxisAngle(_A, -Math.PI * timeInSeconds * this._acceleration.y)
            _R.multiply(_Q)
        }

        controlObject.quaternion.copy(_R)

        const oldPosition = new THREE.Vector3()
        oldPosition.copy(controlObject.position)

        const forward = new THREE.Vector3(0, 0, 1)
        forward.applyQuaternion(controlObject.quaternion)
        forward.normalize()

        const sideways = new THREE.Vector3(1, 0, 0)
        sideways.applyQuaternion(controlObject.quaternion)
        sideways.normalize()

        sideways.multiplyScalar(velocity.x * timeInSeconds)
        forward.multiplyScalar(velocity.z * timeInSeconds)

        controlObject.position.add(forward)
        controlObject.position.add(sideways)

        oldPosition.copy(controlObject.position)
    }
}

class LoadModelDemo {
    constructor() {
        this._Initialize()
    }

    _Initialize() {
        this._threejs = renderer
        this._threejs.shadowMap.enabled = true
        this._threejs.shadowMap.type = THREE.PCFSoftShadowMap
        this._threejs.setPixelRatio(window.devicePixelRatio)
        // this._threejs.setSize(window.innerWidth, window.innerHeight);

        document.body.appendChild(this._threejs.domElement)

        window.addEventListener(
            'resize',
            () => {
                this._OnWindowResize()
            },
            false
        )

        this._camera = camera

        this._scene = scene

        const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(100, 100, 10, 10),
            new THREE.MeshStandardMaterial({
                color: 0x202020,
            })
        )
        plane.castShadow = false
        plane.receiveShadow = true
        plane.rotation.x = -Math.PI / 2
        plane.position.y = 4.5
        this._scene.add(plane)

        const controls = new OrbitControls(this._camera, this._threejs.domElement)
        controls.target.set(0, 20, 0)
        controls.update()

        this._mixers = []
        this._previousRAF = null

        this._LoadAnimatedModel()
        this._RAF()
    }
    _LoadAnimatedModel() {
        const loader = new FBXLoader()
        loader.setPath('../assets/girl/actions/')
        loader.load('Walking.fbx', (fbx) => {
            fbx.scale.setScalar(0.04)
            fbx.position.set(-13.5, 4.5, 1)
            fbx.traverse((c) => {
                c.castShadow = true
            })

            const params = {
                target: fbx,
                camera: this._camera,
            }
            this._controls = new BasicCharacterControls(params)

            const anim = new FBXLoader()
            anim.setPath('../assets/girl/actions/')
            anim.load('Walking.fbx', (anim) => {
                const m = new THREE.AnimationMixer(fbx)
                this._mixers.push(m)
                const idle = m.clipAction(anim.animations[0])
                idle.play()
            })
            this._scene.add(fbx)
        })
    }

    _OnWindowResize() {
        this._camera.aspect = window.innerWidth / window.innerHeight
        this._camera.updateProjectionMatrix()
        this._threejs.setSize(window.innerWidth, window.innerHeight)
    }

    _RAF() {
        requestAnimationFrame((t) => {
            if (this._previousRAF === null) {
                this._previousRAF = t
            }

            this._RAF()

            this._threejs.render(this._scene, this._camera)
            this._Step(t - this._previousRAF)
            this._previousRAF = t
        })
    }

    _Step(timeElapsed) {
        const timeElapsedS = timeElapsed * 0.001
        if (this._mixers) {
            this._mixers.map((m) => m.update(timeElapsedS))
        }

        if (this._controls) {
            this._controls.Update(timeElapsedS)
        }
    }
}

let character = null

export default character = new LoadModelDemo()

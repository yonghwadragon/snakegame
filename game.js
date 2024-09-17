// game.js

class Game {
    constructor() {
        this.mapSize = 40;
        this.halfMapSize = this.mapSize / 2;
        this.gridSize = 1;
        this.score = 0;
        this.level = 1;
        this.gameState = 'playing'; // 'playing', 'gameover'
        this.debugMode = false;

        this.moveInterval = 0.2;
        this.moveTimer = 0;

        this.createEnvironment();
        this.snake = new Snake(this);
        this.food = new Food(this);

        this.updateScoreDisplay();

        // 효과음 로드
        this.loadSounds();

        // 시계 초기화
        this.clock = new THREE.Clock();
    }

    createEnvironment() {
        // 바닥 생성
        const textureLoader = new THREE.TextureLoader();
        const floorTexture = textureLoader.load('textures/floor.jpg');
        floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
        floorTexture.repeat.set(this.mapSize / 2, this.mapSize / 2);

        const planeGeometry = new THREE.PlaneGeometry(this.mapSize, this.mapSize);
        const planeMaterial = new THREE.MeshLambertMaterial({ map: floorTexture });
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.rotation.x = -Math.PI / 2;
        plane.receiveShadow = true;
        scene.add(plane);

        // 벽 생성 (옵션)
        // 필요 시 추가 가능
    }

    loadSounds() {
        const listener = new THREE.AudioListener();
        camera.add(listener);

        this.eatSound = new THREE.Audio(listener);
        this.gameOverSound = new THREE.Audio(listener);

        const audioLoader = new THREE.AudioLoader();
        audioLoader.load('sounds/eat.mp3', buffer => {
            this.eatSound.setBuffer(buffer);
            this.eatSound.setVolume(0.5);
        });

        audioLoader.load('sounds/gameover.mp3', buffer => {
            this.gameOverSound.setBuffer(buffer);
            this.gameOverSound.setVolume(0.5);
        });
    }

    handleKeyInput(keyCode) {
        if (this.gameState !== 'playing') return;

        let newDirection;
        switch (keyCode) {
            case 37: // Left arrow
            case 65: // 'A' key
                newDirection = new THREE.Vector3(-1, 0, 0);
                break;
            case 38: // Up arrow
            case 87: // 'W' key
                newDirection = new THREE.Vector3(0, 0, -1);
                break;
            case 39: // Right arrow
            case 68: // 'D' key
                newDirection = new THREE.Vector3(1, 0, 0);
                break;
            case 40: // Down arrow
            case 83: // 'S' key
                newDirection = new THREE.Vector3(0, 0, 1);
                break;
            case 32: // Space bar
                this.toggleDebugMode();
                break;
            default:
                return;
        }

        this.snake.setDirection(newDirection);
    }

    update() {
        const delta = this.clock.getDelta();
        this.moveTimer += delta;

        if (this.moveTimer >= this.moveInterval) {
            this.snake.move();

            if (this.snake.checkCollisionWithSelf()) {
                this.gameOver();
                return;
            }

            if (this.snake.checkCollisionWithFood(this.food.position)) {
                this.eatSound.play();
                this.snake.grow();
                this.score += 10;
                this.updateScoreDisplay();
                this.food.reposition();

                // 레벨 업 검사
                if (this.score % 50 === 0) {
                    this.levelUp();
                }
            }

            this.moveTimer = 0;
        }

        this.updateCamera();
    }

    updateCamera() {
        const offset = new THREE.Vector3(0, 15, 25);
        camera.position.copy(this.snake.head.position.clone().add(offset));
        camera.lookAt(this.snake.head.position);
    }

    updateScoreDisplay() {
        document.getElementById('scoreboard').innerText = `점수: ${this.score} | 레벨: ${this.level}`;
    }

    gameOver() {
        this.gameState = 'gameover';
        this.gameOverSound.play();
        this.showGameOverScreen();
    }

    showGameOverScreen() {
        const gameOverDiv = document.createElement('div');
        gameOverDiv.id = 'gameover';
        gameOverDiv.innerHTML = `게임 오버!<br>점수: ${this.score}<br><button id="restartButton">다시 시작</button>`;
        document.body.appendChild(gameOverDiv);

        document.getElementById('restartButton').addEventListener('click', () => {
            document.body.removeChild(gameOverDiv);
            this.resetGame();
        });
    }

    resetGame() {
        // 뱀과 음식 제거
        this.snake.remove();
        this.food.remove();

        // 변수 초기화
        this.score = 0;
        this.level = 1;
        this.moveInterval = 0.2;
        this.moveTimer = 0;
        this.gameState = 'playing';

        // 뱀과 음식 재생성
        this.snake = new Snake(this);
        this.food = new Food(this);

        this.updateScoreDisplay();
        this.clock.start();
    }

    levelUp() {
        this.level += 1;
        this.moveInterval *= 0.9; // 속도 증가
    }

    toggleDebugMode() {
        this.debugMode = !this.debugMode;
    }
}

class Snake {
    constructor(game) {
        this.game = game;
        this.segments = [];
        this.direction = new THREE.Vector3(1, 0, 0);
        this.nextDirection = this.direction.clone();
        this.canChangeDirection = true;

        const geometry = new THREE.BoxGeometry(this.game.gridSize, this.game.gridSize, this.game.gridSize);
        const material = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
        const head = new THREE.Mesh(geometry, material);
        head.position.set(0, this.game.gridSize / 2, 0);
        head.castShadow = true;
        scene.add(head);
        this.segments.push(head);
        this.head = head;
    }

    setDirection(newDirection) {
        // 이동 당 한 번의 방향 변경만 허용
        if (this.canChangeDirection && !newDirection.equals(this.direction.clone().multiplyScalar(-1))) {
            this.nextDirection = newDirection;
            this.canChangeDirection = false;
        }
    }

    move() {
        this.direction = this.nextDirection.clone();

        const newPosition = this.head.position.clone().add(this.direction.clone().multiplyScalar(this.game.gridSize));

        // 경계 체크 및 위치 리셋
        if (newPosition.x > this.game.halfMapSize) {
            newPosition.x = -this.game.halfMapSize;
        } else if (newPosition.x < -this.game.halfMapSize) {
            newPosition.x = this.game.halfMapSize;
        }

        if (newPosition.z > this.game.halfMapSize) {
            newPosition.z = -this.game.halfMapSize;
        } else if (newPosition.z < -this.game.halfMapSize) {
            newPosition.z = this.game.halfMapSize;
        }

        // 몸통 이동
        for (let i = this.segments.length - 1; i > 0; i--) {
            this.segments[i].position.copy(this.segments[i - 1].position);
        }
        this.head.position.copy(newPosition);

        // 방향 변경 가능하도록 설정
        this.canChangeDirection = true;
    }

    grow() {
        const geometry = new THREE.BoxGeometry(this.game.gridSize, this.game.gridSize, this.game.gridSize);
        const material = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
        const newSegment = new THREE.Mesh(geometry, material);
        newSegment.position.copy(this.segments[this.segments.length - 1].position);
        newSegment.castShadow = true;
        scene.add(newSegment);
        this.segments.push(newSegment);
    }

    checkCollisionWithSelf() {
        for (let i = 1; i < this.segments.length; i++) {
            if (this.head.position.equals(this.segments[i].position)) {
                return true;
            }
        }
        return false;
    }

    checkCollisionWithFood(foodPosition) {
        return this.head.position.equals(foodPosition);
    }

    remove() {
        this.segments.forEach(segment => scene.remove(segment));
        this.segments = [];
    }
}

class Food {
    constructor(game) {
        this.game = game;
        const geometry = new THREE.SphereGeometry(this.game.gridSize / 2, 16, 16);
        const material = new THREE.MeshLambertMaterial({ color: 0xff0000 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.y = this.game.gridSize / 2;
        this.mesh.castShadow = true;
        scene.add(this.mesh);

        this.reposition();
    }

    reposition() {
        const maxPosition = this.game.halfMapSize - this.game.gridSize;
        let validPosition = false;

        while (!validPosition) {
            const x = Math.round((Math.random() * maxPosition * 2 - maxPosition) / this.game.gridSize) * this.game.gridSize;
            const z = Math.round((Math.random() * maxPosition * 2 - maxPosition) / this.game.gridSize) * this.game.gridSize;
            const position = new THREE.Vector3(x, this.game.gridSize / 2, z);

            // 뱀의 몸과 겹치지 않는지 확인
            validPosition = !this.game.snake.segments.some(segment => segment.position.equals(position));

            if (validPosition) {
                this.mesh.position.copy(position);
                this.position = position;
            }
        }
    }

    remove() {
        scene.remove(this.mesh);
    }
}


let scene, camera, renderer;
let game;

function init() {
    scene = new THREE.Scene();

    // 카메라 설정
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );

    // 조명 추가
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 50, 50);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // 렌더러 설정
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // 게임 초기화
    game = new Game();

    // 이벤트 리스너
    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('keydown', handleKeyDown, false);

    animate();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function handleKeyDown(event) {
    game.handleKeyInput(event.keyCode);
}

function animate() {
    requestAnimationFrame(animate);

    if (game.gameState === 'playing') {
        game.update();
    }

    renderer.render(scene, camera);

    // 디버깅 모드 표시
    if (game.debugMode) {
        document.getElementById('debug').innerText = `뱀 길이: ${game.snake.segments.length}\n뱀 머리 위치: (${game.snake.head.position.x}, ${game.snake.head.position.z})`;
    } else {
        document.getElementById('debug').innerText = '';
    }
}

init();

// Zkontrolujeme, zda je Phaser načten
console.log('Phaser version:', Phaser.VERSION);

// Konfigurace hry
const config = {
    type: Phaser.CANVAS, // Používáme Canvas místo AUTO pro lepší kompatibilitu
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    backgroundColor: '#4a3c2a', // Hnědá barva odpovídající hlíně
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'matter',
        matter: {
            gravity: { x: 0, y: 0 },
            debug: false // Vypnuto - odstraněn zelený rámeček
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

console.log('Creating game...');
const game = new Phaser.Game(config);
console.log('Game created successfully');

let car;
let cursors;
let spaceKey;
let rKey;
let obstacles = []; // Pole pro překážky
let bonuses = []; // Pole pro bonusy (pneumatiky)
let gameOver = false;
let gameOverText;
let restartText;
let timerText;
let bonusText;
let levelText;
let currentSpeed = 0;

// Level systém
let currentLevel = 1;
let obstacleCount = 3; // Začínáme na 3
let bonusCount = 3;
let collectedBonuses = 0;
let gameTime = 0;
let policeSpeedMultiplier = 1.0; // Multiplier rychlosti policejních aut
let policeConfusedTime = 0; // Čas, kdy je policie zmatená (jede náhodně)

// Drift proměnné
let isDrifting = false;
let driftTime = 0;
let driftBoost = 0;
let driftText;
let driftParticles;
let driftSpeedBoost = 0; // Speed boost po úspěšném driftu
let driftSpeedBoostTime = 0; // Zbývající čas boostu

function preload() {
    console.log('Preload started');
    // Načteme texturu hlíny jako pozadí
    this.load.image('dirt', 'img/Dirt_02.png');
    // Načteme obrázek F1 auta
    this.load.image('f1car', 'img/pitstop_car_11.png');
    // Načteme obrázek policejního auta jako překážku
    this.load.image('police', 'img/police-car-siren-red.png');
    // Načteme obrázek pneumatiky jako bonus
    this.load.image('tire', 'img/tire.png');
}

function create() {
    console.log('Create started');

    // Definice kolizních kategorií
    const CATEGORY_PLAYER = 0x0001;
    const CATEGORY_POLICE = 0x0002;
    const CATEGORY_BONUS = 0x0004;

    // Vytvoříme pozadí z textury hlíny - tileSprite pro opakování
    const background = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'dirt');
    background.setOrigin(0, 0);

    // Vytvoříme auto s Matter.js fyzikou - pozice relativní k velikosti okna
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    car = this.matter.add.image(centerX, this.scale.height - 100, 'f1car');
    car.setFrictionAir(0.15);
    car.setMass(10);
    car.setFixedRotation(); // Auto se nebude samo otáčet

    // Nastavíme správnou velikost - scale obrázek na 40x70
    car.setDisplaySize(40, 70);

    // Otočíme auto vertikálně - předek na zadek
    car.setFlipY(true);

    // Nastavíme přesnou velikost kolizního těla podle textury (40x70)
    car.setBody({
        type: 'rectangle',
        width: 40,
        height: 70
    });

    // Nastavíme kolizní kategorii pro hráče
    car.setCollisionCategory(CATEGORY_PLAYER);
    car.setCollidesWith([CATEGORY_PLAYER, CATEGORY_POLICE]); // Koliduje jen s hráčem a policií, NE s bonusy

    // Vytvoříme překážky - policejní auta (počet závisí na levelu)
    obstacles = [];
    const minDistance = 70 * 5; // 5x velikost formule (výška auta je 70px)

    for (let i = 0; i < obstacleCount; i++) {
        let randomX, randomY, distance;

        // Najdi pozici dostatečně daleko od hráče
        do {
            randomX = Phaser.Math.Between(100, this.scale.width - 100);
            randomY = Phaser.Math.Between(100, this.scale.height - 200);
            distance = Phaser.Math.Distance.Between(car.x, car.y, randomX, randomY);
        } while (distance < minDistance);

        const obstacle = this.matter.add.image(randomX, randomY, 'police');
        obstacle.setStatic(false); // Změněno na dynamic - budou se pohybovat
        obstacle.setFrictionAir(0.15); // Stejná friction jako hráčovo auto
        obstacle.setMass(15); // Těžší než hráčovo auto
        obstacle.setFixedRotation(); // Neotáčí se samo

        // Nastavíme rozumnou velikost policejního auta (širší než hráčovo auto)
        obstacle.setDisplaySize(55, 70);

        // Otočíme policejní auto také
        obstacle.setFlipY(true);

        // Nastavíme kolizní tělo - o 5px menší pro lepší hratelnost
        obstacle.setBody({
            type: 'rectangle',
            width: 50,
            height: 65
        });

        // Náhodný počáteční úhel
        obstacle.setAngle(Phaser.Math.Between(0, 360));

        // Nastavíme kolizní kategorii pro policii
        obstacle.setCollisionCategory(CATEGORY_POLICE);
        obstacle.setCollidesWith([CATEGORY_PLAYER, CATEGORY_POLICE, CATEGORY_BONUS]); // Koliduje i s pneumatikami!

        // AI proměnné
        obstacle.changeDirectionTime = Phaser.Math.Between(60, 180); // Změní směr za 1-3 sekundy
        obstacle.targetAngle = obstacle.angle; // Cílový úhel
        obstacle.isReversing = false; // Zda couvá
        obstacle.reversingTime = 0; // Čas couvání

        obstacles.push(obstacle);
    }

    // Vytvoříme bonusy - pneumatiky (počet závisí na levelu)
    bonuses = [];
    for (let i = 0; i < bonusCount; i++) {
        // Náhodná pozice na herní ploše (jiná než překážky)
        let randomX, randomY, tooClose;
        do {
            randomX = Phaser.Math.Between(100, this.scale.width - 100);
            randomY = Phaser.Math.Between(100, this.scale.height - 200);

            // Zkontroluj, zda není moc blízko k překážkám
            tooClose = false;
            for (let obstacle of obstacles) {
                const distance = Phaser.Math.Distance.Between(randomX, randomY, obstacle.x, obstacle.y);
                if (distance < 100) {
                    tooClose = true;
                    break;
                }
            }
        } while (tooClose);

        const bonus = this.matter.add.image(randomX, randomY, 'tire');
        bonus.setStatic(true);

        // Nastavíme velikost pneumatiky
        bonus.setDisplaySize(50, 50);

        // Nastavíme kolizní tělo - NENÍ sensor!
        bonus.setBody({
            type: 'circle',
            radius: 25
        });

        // Nastavíme kolizní kategorii pro bonus
        bonus.setCollisionCategory(CATEGORY_BONUS);
        // Bonus koliduje s policií (blokuje je), ale ne s hráčem (hráč může sbírat)
        bonus.setCollidesWith([CATEGORY_POLICE]); // Nekoliduje s CATEGORY_PLAYER!

        bonuses.push(bonus);
    }

    // Nastavíme ovládání
    cursors = this.input.keyboard.createCursorKeys();
    spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    rKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    // Nastavíme kolizní detekci pro překážky (policie)
    this.matter.world.on('collisionstart', (event) => {
        event.pairs.forEach((pair) => {
            const { bodyA, bodyB } = pair;

            // Zkontrolujeme, zda auto narazilo do některé překážky
            obstacles.forEach((obstacle) => {
                if ((bodyA === car.body && bodyB === obstacle.body) ||
                    (bodyB === car.body && bodyA === obstacle.body)) {
                    if (!gameOver) {
                        endGame(this);
                    }
                }
            });
        });
    });

    // Samostatná detekce pro sběr bonusů - kontrolujeme vzdálenost
    this.events.on('update', () => {
        if (gameOver) return;

        // Zkontroluj, zda je hráč dostatečně blízko k nějaké pneumatice
        bonuses.forEach((bonus, index) => {
            const distance = Phaser.Math.Distance.Between(car.x, car.y, bonus.x, bonus.y);

            // Pokud je hráč blízko (v dosahu 30px od středu)
            if (distance < 35) {
                // Sebrat bonus
                bonus.destroy();
                bonuses.splice(index, 1);
                collectedBonuses++;

                // Zvýš rychlost policejních aut o 10%
                policeSpeedMultiplier += 0.1;

                // Zmatení policie na 10 sekund - jede náhodně
                policeConfusedTime = 10;

                // Aktualizuj UI
                bonusText.setText(`Bonusy: ${collectedBonuses}/${bonusCount}`);

                // Zkontroluj, zda byly sebrány všechny bonusy
                if (collectedBonuses >= bonusCount) {
                    nextLevel(this);
                }
            }
        });
    });

    // Vytvoříme texty
    timerText = this.add.text(16, 16, 'Čas: 0:00', {
        fontSize: '20px',
        fill: '#fff',
        backgroundColor: '#000',
        padding: { x: 10, y: 5 }
    });

    bonusText = this.add.text(16, 46, `Bonusy: ${collectedBonuses}/${bonusCount}`, {
        fontSize: '20px',
        fill: '#ffff00',
        backgroundColor: '#000',
        padding: { x: 10, y: 5 }
    });

    levelText = this.add.text(16, 76, `Level: ${currentLevel}`, {
        fontSize: '20px',
        fill: '#00ff00',
        backgroundColor: '#000',
        padding: { x: 10, y: 5 }
    });

    driftText = this.add.text(16, 106, '', {
        fontSize: '18px',
        fill: '#00ffff',
        backgroundColor: '#000',
        padding: { x: 10, y: 5 }
    });

    // Vytvoříme malou grafiku pro drift částice
    const particleGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    particleGraphics.fillStyle(0xffffff);
    particleGraphics.fillCircle(4, 4, 4);
    particleGraphics.generateTexture('particle', 8, 8);
    particleGraphics.destroy();

    // Vytvoříme částicový efekt pro drift
    driftParticles = this.add.particles(0, 0, 'particle', {
        speed: { min: 20, max: 50 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.8, end: 0 },
        alpha: { start: 0.8, end: 0 },
        lifespan: 300,
        frequency: 30,
        tint: 0x00ffff,
        emitting: false
    });

    // Instrukce
    this.add.text(centerX, this.scale.height - 50, 'Šipky = pohyb | MEZERNÍK = drift při zatáčení', {
        fontSize: '16px',
        fill: '#fff',
        backgroundColor: '#000',
        padding: { x: 10, y: 5 }
    }).setOrigin(0.5);
}

function update() {
    if (gameOver) {
        // Restartování hry po stisknutí mezerníku (od levelu 1)
        if (Phaser.Input.Keyboard.JustDown(spaceKey)) {
            restartGame(this);
        }
        // Pokračování v aktuálním levelu po stisknutí R
        if (Phaser.Input.Keyboard.JustDown(rKey)) {
            restartCurrentLevel(this);
        }
        return;
    }

    const speed = 0.096; // Zvýšeno 12x (bylo 0.008, pak 0.016, pak 0.032, teď 0.096)
    let turnSpeed = 0.1; // Zvýšeno 2x (bylo 0.05)

    let moving = false;
    let turning = false;

    // Pohyb vpřed
    if (cursors.up.isDown) {
        const angle = car.rotation;
        const speedMultiplier = isDrifting ? 1.2 : 1.0; // Mírně rychlejší během driftu
        const totalSpeedMultiplier = speedMultiplier * (1 + driftBoost) * (1 + driftSpeedBoost);
        car.setVelocity(
            Math.sin(angle) * speed * 100 * totalSpeedMultiplier,
            -Math.cos(angle) * speed * 100 * totalSpeedMultiplier
        );
        moving = true;
        currentSpeed = Math.min(currentSpeed + 24, 1200 + driftBoost * 50); // Zvýšeno 3x (bylo +8, max 400)
    }
    // Pohyb vzad
    else if (cursors.down.isDown) {
        const angle = car.rotation;
        car.setVelocity(
            -Math.sin(angle) * speed * 60,
            Math.cos(angle) * speed * 60
        );
        moving = true;
        currentSpeed = Math.min(currentSpeed + 12, 600); // Zvýšeno 3x (bylo +4, max 200)
    }

    // Detekce zatáčení
    if (cursors.left.isDown || cursors.right.isDown) {
        turning = true;
    }

    // DRIFT MECHANIKA
    const wasDrifting = isDrifting;

    // Aktivace driftu: mezerník + pohyb vpřed + zatáčení + minimální rychlost
    if (spaceKey.isDown && cursors.up.isDown && turning && currentSpeed > 50) {
        if (!isDrifting) {
            isDrifting = true;
            driftTime = 0;
            car.setFrictionAir(0.05); // Snížená friction pro sklouznutí
        }

        // Zvýšený turnSpeed během driftu
        turnSpeed = 0.18;
        driftTime += 0.016; // Delta time (přibližně)

        // Aktualizace drift textu
        const driftLevel = Math.floor(driftTime * 10);
        let driftMessage = 'DRIFT! ';
        if (driftLevel > 20) driftMessage = 'MEGA DRIFT! ';
        else if (driftLevel > 10) driftMessage = 'SUPER DRIFT! ';
        driftText.setText(`${driftMessage}${driftLevel}`);
        driftText.setStyle({ fill: driftLevel > 20 ? '#ff00ff' : driftLevel > 10 ? '#ffff00' : '#00ffff' });

        // Částicový efekt
        driftParticles.setPosition(car.x, car.y);
        driftParticles.emitting = true;

    } else {
        // Ukončení driftu
        if (isDrifting) {
            isDrifting = false;
            car.setFrictionAir(0.15); // Obnovení normální friction

            // Výpočet boost bonusu podle délky driftu
            if (driftTime > 0.3) { // Minimální drift 0.3s
                driftBoost = Math.min(driftTime * 0.2, 0.5); // Sníženo: Max boost 0.5 (bylo 1.0)

                // Aplikace okamžitého speed boostu - sníženo
                const angle = car.rotation;
                const boostPower = 8 * driftBoost; // Sníženo z 30 na 8
                car.applyForce({
                    x: Math.sin(angle) * boostPower,
                    y: -Math.cos(angle) * boostPower
                });

                // Aktivuj 20% speed boost na 10 sekund
                driftSpeedBoost = 0.2; // 20% boost
                driftSpeedBoostTime = 10; // 10 sekund

                driftText.setText(`SUPER BOOST! +20% na 10s`);
                driftText.setStyle({ fill: '#ffff00' });
            } else {
                driftText.setText('');
            }

            driftTime = 0;

            // Postupné snižování boostu
            setTimeout(() => {
                const fadeBoost = setInterval(() => {
                    driftBoost = Math.max(0, driftBoost - 0.05);
                    if (driftBoost <= 0) {
                        clearInterval(fadeBoost);
                        if (!isDrifting) {
                            // Nezruš text, pokud je aktivní speed boost
                            if (driftSpeedBoostTime <= 0) {
                                driftText.setText('');
                            }
                        }
                    }
                }, 50);
            }, 500);
        }

        driftParticles.emitting = false;
    }

    // Otáčení doleva
    if (cursors.left.isDown && moving) {
        car.setAngularVelocity(-turnSpeed);
    }
    // Otáčení doprava
    else if (cursors.right.isDown && moving) {
        car.setAngularVelocity(turnSpeed);
    }
    else {
        car.setAngularVelocity(0);
    }

    // Zpomalení při nepohybu
    if (!moving) {
        currentSpeed = Math.max(currentSpeed - 3, 0);
        car.setVelocity(car.body.velocity.x * 0.9, car.body.velocity.y * 0.9);
        driftBoost = Math.max(0, driftBoost - 0.01); // Pomalé mizení boostu i při zastavení
    }

    // Aktualizace časovače
    gameTime += 1/60; // Přibližně 60 FPS
    const minutes = Math.floor(gameTime / 60);
    const seconds = Math.floor(gameTime % 60);
    timerText.setText(`Čas: ${minutes}:${seconds.toString().padStart(2, '0')}`);

    // Odpočítávání drift speed boostu
    if (driftSpeedBoostTime > 0) {
        driftSpeedBoostTime -= 1/60;

        // Zobrazení zbývajícího času
        if (driftSpeedBoostTime > 0) {
            driftText.setText(`SUPER BOOST! +20% (${Math.ceil(driftSpeedBoostTime)}s)`);
            driftText.setStyle({ fill: '#ffff00' });
        } else {
            driftSpeedBoost = 0;
            driftSpeedBoostTime = 0;
            if (!isDrifting && driftBoost <= 0) {
                driftText.setText('');
            }
        }
    }

    // Odpočítávání času zmatení policie
    if (policeConfusedTime > 0) {
        policeConfusedTime -= 1/60;
        if (policeConfusedTime < 0) {
            policeConfusedTime = 0;
        }

        // Zobrazení upozornění, že je policie zmatená
        levelText.setText(`Level: ${currentLevel} | Policie zmatená: ${Math.ceil(policeConfusedTime)}s`);
        levelText.setStyle({ fill: '#ff00ff' }); // Fialová barva pro upozornění
    } else {
        // Normální zobrazení levelu
        levelText.setText(`Level: ${currentLevel}`);
        levelText.setStyle({ fill: '#00ff00' }); // Zelená barva
    }

    // Pohyb policejních aut - 1/6 rychlosti formule (sníženo na 1/2), používá stejný engine
    const policeBaseSpeed = 0.016; // Základní rychlost - 1/6 rychlosti formule (0.096)
    const policeSpeed = policeBaseSpeed * policeSpeedMultiplier; // Aplikuj multiplier
    const policeTurnSpeed = 0.05; // Rychlost otáčení

    obstacles.forEach((obstacle) => {
        const bounds = this.scale;

        // Kontrola, zda je na okraji herní plochy
        const atEdge = (obstacle.x < 80 || obstacle.x > bounds.width - 80 ||
                       obstacle.y < 80 || obstacle.y > bounds.height - 80);

        // Pokud je na okraji a ještě necouvá, začni couvat a otáčet se
        if (atEdge && !obstacle.isReversing) {
            obstacle.isReversing = true;
            obstacle.reversingTime = 60; // Couvej 1 sekundu
            // Otoč se o 180°
            obstacle.targetAngle = obstacle.angle + 180;
            if (obstacle.targetAngle > 360) obstacle.targetAngle -= 360;
        }

        // Pokud couvá
        if (obstacle.isReversing) {
            obstacle.reversingTime--;

            // Plynulé otáčení o 180°
            let angleDiff = Phaser.Math.Angle.ShortestBetween(obstacle.angle, obstacle.targetAngle);
            if (Math.abs(angleDiff) > 2) {
                if (angleDiff > 0) {
                    obstacle.setAngularVelocity(policeTurnSpeed * 2); // Rychlejší otáčení
                } else {
                    obstacle.setAngularVelocity(-policeTurnSpeed * 2);
                }
            } else {
                obstacle.setAngularVelocity(0);
            }

            // Couvání (pohyb vzad)
            const angle = obstacle.rotation;
            obstacle.setVelocity(
                -Math.sin(angle) * policeSpeed * 80,
                Math.cos(angle) * policeSpeed * 80
            );

            // Konec couvání
            if (obstacle.reversingTime <= 0) {
                obstacle.isReversing = false;
            }
        } else {
            // Normální režim

            let targetAngleDeg;

            // Pokud je policie zmatená (sebrána pneumatika), jede náhodně
            if (policeConfusedTime > 0) {
                // ZMATENÝ REŽIM - náhodný pohyb
                // Změna směru občas
                obstacle.changeDirectionTime--;
                if (obstacle.changeDirectionTime <= 0) {
                    // Nový náhodný cílový úhel
                    targetAngleDeg = Phaser.Math.Between(0, 360);
                    obstacle.targetAngle = targetAngleDeg;
                    obstacle.changeDirectionTime = Phaser.Math.Between(60, 120); // Častější změna směru
                } else {
                    targetAngleDeg = obstacle.targetAngle;
                }
            } else {
                // NORMÁLNÍ REŽIM - sledování hráče s vyhýbáním se pneumatikám

                // Zkontroluj, zda je nějaká pneumatika nebezpečně blízko
                let avoidAngle = null;
                const avoidDistance = 120; // Vzdálenost pro vyhýbání

                bonuses.forEach((bonus) => {
                    const distanceToBonus = Phaser.Math.Distance.Between(
                        obstacle.x, obstacle.y,
                        bonus.x, bonus.y
                    );

                    if (distanceToBonus < avoidDistance) {
                        // Vypočítej úhel PRYČ od pneumatiky
                        const angleToBonus = Phaser.Math.Angle.Between(
                            obstacle.x, obstacle.y,
                            bonus.x, bonus.y
                        );

                        // Otoč se opačným směrem (přidej 180°)
                        avoidAngle = angleToBonus + Math.PI;
                    }
                });

                if (avoidAngle !== null) {
                    // PRIORITA: Vyhni se pneumatice
                    targetAngleDeg = Phaser.Math.RadToDeg(avoidAngle) + 90;
                } else {
                    // Sleduj hráče
                    const angleToPlayer = Phaser.Math.Angle.Between(
                        obstacle.x, obstacle.y,
                        car.x, car.y
                    );
                    targetAngleDeg = Phaser.Math.RadToDeg(angleToPlayer) + 90;
                }
            }

            // Normalizuj úhel
            if (targetAngleDeg < 0) targetAngleDeg += 360;
            if (targetAngleDeg > 360) targetAngleDeg -= 360;

            obstacle.targetAngle = targetAngleDeg;

            // Plynulé otáčení k cíli
            let angleDiff = Phaser.Math.Angle.ShortestBetween(obstacle.angle, obstacle.targetAngle);
            if (Math.abs(angleDiff) > 2) {
                if (angleDiff > 0) {
                    obstacle.setAngularVelocity(policeTurnSpeed);
                } else {
                    obstacle.setAngularVelocity(-policeTurnSpeed);
                }
            } else {
                obstacle.setAngularVelocity(0);
            }

            // Pohyb vpřed (stejný systém jako hráčovo auto)
            const angle = obstacle.rotation;
            obstacle.setVelocity(
                Math.sin(angle) * policeSpeed * 100,
                -Math.cos(angle) * policeSpeed * 100
            );
        }
    });

    // Udržíme auto v hranicích herní plochy - dynamické hranice podle velikosti okna
    const bounds = this.scale;
    if (car.x < 20) car.x = 20;
    if (car.x > bounds.width - 20) car.x = bounds.width - 20;
    if (car.y < 35) car.y = 35;
    if (car.y > bounds.height - 35) car.y = bounds.height - 35;
}

function endGame(scene) {
    gameOver = true;

    // Zastavíme auto
    car.setVelocity(0, 0);
    car.setAngularVelocity(0);

    // Zastavíme policejní auta
    obstacles.forEach((obstacle) => {
        obstacle.setVelocity(0, 0);
        obstacle.setAngularVelocity(0);
        obstacle.setStatic(true);
    });

    // Vytvoříme overlay - dynamická velikost podle okna
    const centerX = scene.scale.width / 2;
    const centerY = scene.scale.height / 2;
    const overlay = scene.add.rectangle(centerX, centerY, scene.scale.width, scene.scale.height, 0x000000, 0.7);

    // Text Game Over
    gameOverText = scene.add.text(centerX, centerY - 80, 'GAME OVER!', {
        fontSize: '64px',
        fill: '#ff0000',
        fontStyle: 'bold',
        stroke: '#fff',
        strokeThickness: 4
    }).setOrigin(0.5);

    // Text o levelu
    scene.add.text(centerX, centerY - 10, `Dosáhli jste levelu ${currentLevel}`, {
        fontSize: '28px',
        fill: '#00ff00',
        fontStyle: 'bold'
    }).setOrigin(0.5);

    // Text o kolizi
    scene.add.text(centerX, centerY + 30, 'Narazili jste do policejního auta!', {
        fontSize: '22px',
        fill: '#fff'
    }).setOrigin(0.5);

    // Zobraz čas
    const minutes = Math.floor(gameTime / 60);
    const seconds = Math.floor(gameTime % 60);
    scene.add.text(centerX, centerY + 60, `Čas: ${minutes}:${seconds.toString().padStart(2, '0')}`, {
        fontSize: '20px',
        fill: '#fff'
    }).setOrigin(0.5);

    // Text pro restart od začátku
    const restartText1 = scene.add.text(centerX, centerY + 100, 'MEZERNÍK - Restart od levelu 1', {
        fontSize: '18px',
        fill: '#ffff00'
    }).setOrigin(0.5);

    // Text pro pokračování v levelu
    restartText = scene.add.text(centerX, centerY + 130, 'R - Zkusit znovu level ' + currentLevel, {
        fontSize: '18px',
        fill: '#00ff00'
    }).setOrigin(0.5);

    // Blikání obou textů
    scene.tweens.add({
        targets: [restartText1, restartText],
        alpha: 0.3,
        duration: 500,
        yoyo: true,
        repeat: -1
    });
}

function nextLevel(scene) {
    // Zvýšíme level
    currentLevel++;
    obstacleCount++;
    bonusCount++;
    collectedBonuses = 0;

    // Resetujeme rychlost policejních aut na default
    policeSpeedMultiplier = 1.0;
    policeConfusedTime = 0;

    // Resetujeme drift proměnné
    isDrifting = false;
    driftTime = 0;
    driftBoost = 0;
    driftSpeedBoost = 0;
    driftSpeedBoostTime = 0;

    // Restartujeme scénu s novým levelem
    scene.scene.restart();
}

function restartCurrentLevel(scene) {
    gameOver = false;
    currentSpeed = 0;

    // Zachováme currentLevel, ale resetujeme bonusy
    collectedBonuses = 0;

    // Resetujeme rychlost policejních aut na default pro tento level
    policeSpeedMultiplier = 1.0;
    policeConfusedTime = 0;

    // Reset drift proměnných
    isDrifting = false;
    driftTime = 0;
    driftBoost = 0;
    driftSpeedBoost = 0;
    driftSpeedBoostTime = 0;

    // Restartujeme scénu s aktuálním levelem
    scene.scene.restart();
}

function restartGame(scene) {
    gameOver = false;
    currentSpeed = 0;
    gameTime = 0;

    // Reset levelu na začátek
    currentLevel = 1;
    obstacleCount = 3;
    bonusCount = 3;
    collectedBonuses = 0;

    // Resetujeme rychlost policejních aut na default
    policeSpeedMultiplier = 1.0;
    policeConfusedTime = 0;

    // Reset drift proměnných
    isDrifting = false;
    driftTime = 0;
    driftBoost = 0;
    driftSpeedBoost = 0;
    driftSpeedBoostTime = 0;

    // Resetujeme hru
    scene.scene.restart();
}

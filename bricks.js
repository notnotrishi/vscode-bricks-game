(() => {
  const isDark = typeof THEME !== "undefined" ? THEME === "dark" : true;

  const COLORS = {
    text: isDark ? "#0aae5cff" : "#006644",
    boxBg: isDark ? "rgba(17,17,17,0.82)" : "rgba(255,255,255,0.82)",
    boxBorder: isDark ? "#0aae5cff" : "#006644",
    launcherBg: isDark ? "#111" : "#ddd",
    launcherText: isDark ? "#0aae5cff" : "#006644"
  };

  const launcher = document.createElement("div");
  launcher.textContent = "🎮";
  Object.assign(launcher.style, {
    position: "fixed",
    bottom: "10px",
    left: "10px",
    background: COLORS.launcherBg,
    color: COLORS.launcherText,
    padding: "6px 10px",
    borderRadius: "8px",
    cursor: "pointer",
    zIndex: 999999,
    fontFamily: "Consolas, Courier New, monospace",
    fontSize: "14px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
    userSelect: "none"
  });
  document.body.appendChild(launcher);

  let canvas, ctx, w, h, score, over, paddle, brick, animationId;
  let gameActive = false;
  let keys = {};
  let particles = [];
  let closeBtn, countdownTimer, countdown = 3;
  let level = 1;

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const audioCtx = new AudioCtx();

  const playTone = (freq, duration = 0.1, type = "sine") => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.stop(audioCtx.currentTime + duration);
  };

  const playCatchSound = () => {
    playTone(600, 0.07, "square");
    setTimeout(() => playTone(800, 0.07, "square"), 50);
  };

  const playGameOverSound = () => {
    playTone(300, 0.15, "triangle");
    setTimeout(() => playTone(200, 0.15, "triangle"), 100);
  };

  const playStartChime = () => {
    playTone(400, 0.1, "sine");
    setTimeout(() => playTone(600, 0.1, "sine"), 100);
    setTimeout(() => playTone(800, 0.15, "sine"), 200);
  };

  const createCloseButton = () => {
    closeBtn = document.createElement("div");
    closeBtn.textContent = "✖️";
    Object.assign(closeBtn.style, {
      position: "fixed",
      top: "10px",
      right: "10px",
      fontSize: "20px",
      background: "none",
      color: COLORS.text,
      padding: "4px 8px",
      borderRadius: "6px",
      cursor: "pointer",
      zIndex: 999999,
      userSelect: "none",
      fontFamily: "Consolas, Courier New, monospace",
      transition: "opacity 0.2s ease"
    });
    closeBtn.onmouseover = () => (closeBtn.style.opacity = "0.7");
    closeBtn.onmouseout = () => (closeBtn.style.opacity = "1");
    closeBtn.onclick = stopGame;
    document.body.appendChild(closeBtn);
  };

  const removeCloseButton = () => closeBtn?.remove();

  const drawTextBox = (textLines) => {
    const boxWidth = 340;
    const boxHeight = 120;
    const boxX = (w - boxWidth) / 2;
    const boxY = (h - boxHeight) / 2 - 20;

    ctx.fillStyle = COLORS.boxBg;
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    ctx.strokeStyle = COLORS.boxBorder;
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

    ctx.fillStyle = COLORS.text;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    textLines.forEach((line, i) => {
      ctx.font = i === 0 ? "bold 36px Consolas, Courier New, monospace" : "18px Consolas, Courier New, monospace";
      ctx.fillText(line.toUpperCase(), w / 2, boxY + 35 + i * 30);
    });
  };

  const showCountdown = () => {
    ctx.clearRect(0, 0, w, h);
    drawTextBox([String(countdown), "PRESS ESC OR ✖️ TO EXIT"]);
  };

  const startGame = () => {
    if (gameActive) return;
    gameActive = true;

    canvas = document.createElement("canvas");
    Object.assign(canvas.style, {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      background: "rgba(0,0,0,0.01)",
      zIndex: 999998
    });
    document.body.appendChild(canvas);
    ctx = canvas.getContext("2d");

    const resize = () => {
      w = canvas.width = innerWidth;
      h = canvas.height = innerHeight;
      paddle = { x: w / 2 - 60, y: h - 50, width: 120, height: 24, speed: 15 };
      brick = { x: Math.random() * (w - 20), y: 0, size: 20, speed: 4 };
    };
    resize();
    addEventListener("resize", resize);

    createCloseButton();

    score = 0;
    level = 1;
    over = false;
    particles = [];

    countdown = 3;
    showCountdown();

    countdownTimer = setInterval(() => {
      countdown--;
      if (countdown > 0) {
        showCountdown();
      } else {
        clearInterval(countdownTimer);
        playStartChime();
        startGameplay();
      }
    }, 1000);
  };

  const startGameplay = () => {
    keys = {};
    window.addEventListener("keydown", e => {
      keys[e.key] = true;
      if (e.key === "Escape") stopGame();
    });
    window.addEventListener("keyup", e => keys[e.key] = false);

    const makeParticles = (x, y, color = "#a84637") => {
      for (let i = 0; i < 15; i++) {
        particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 5,
          vy: -Math.random() * 4,
          life: 30,
          color
        });
      }
    };

    const loop = () => {
      ctx.clearRect(0, 0, w, h);

      if (keys["ArrowLeft"]) paddle.x -= paddle.speed;
      if (keys["ArrowRight"]) paddle.x += paddle.speed;
      paddle.x = Math.max(0, Math.min(w - paddle.width, paddle.x));

      if (!over) {
        brick.y += brick.speed;

        if (
          brick.y + brick.size > paddle.y &&
          brick.x + brick.size > paddle.x &&
          brick.x < paddle.x + paddle.width
        ) {
          score++;
          playCatchSound();
          launcher.textContent = `🏆 ${score}`;
          makeParticles(brick.x + brick.size / 2, paddle.y, "#a84637");
          brick.y = 0;
          brick.x = Math.random() * (w - brick.size);

          if (score % 10 === 0) {
            brick.speed += 0.7;
            level++;
          }
        }

        if (brick.y > h) {
          over = true;
          playGameOverSound();
          launcher.textContent = "🎮"; // reset launcher icon when game ends
        }

        ctx.fillStyle = "#a84637"; // brick
        ctx.fillRect(brick.x, brick.y, brick.size, brick.size);

        ctx.fillStyle = "#00FFFF"; // cyan paddle
        ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);

        ctx.font = "bold 13px Consolas, Courier New, monospace";
        ctx.fillStyle = "#000000";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`LVL ${level}`.toUpperCase(), paddle.x + paddle.width / 2, paddle.y + paddle.height / 2);

        particles = particles.filter(p => p.life > 0);
        for (const p of particles) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.2;
          p.life--;
          ctx.fillStyle = `rgba(168,70,55,${p.life / 30})`;
          ctx.fillRect(p.x, p.y, 3, 3);
        }

        animationId = requestAnimationFrame(loop);
      } else {
        drawTextBox([`Game Over`, `Score: ${score}`, `Click 🎮 to Restart`]);
      }
    };
    loop();
  };

  const stopGame = () => {
    gameActive = false;
    launcher.textContent = "🎮";
    cancelAnimationFrame(animationId);
    clearInterval(countdownTimer);
    removeCloseButton();
    canvas?.remove();
  };

  launcher.onclick = () => {
    if (gameActive) stopGame();
    else startGame();
  };
})();
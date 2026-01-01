/**
 * Confetti Celebration Utility
 * Lightweight confetti animation without external dependencies
 */

export function triggerConfetti() {
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const confettiPieces = [];
  const confettiCount = 150;
  const colors = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  // Create confetti pieces
  for (let i = 0; i < confettiCount; i++) {
    confettiPieces.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      size: Math.random() * 8 + 4,
      speedY: Math.random() * 3 + 2,
      speedX: Math.random() * 2 - 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: Math.random() * 10 - 5
    });
  }

  // Animation loop
  let animationFrame;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let stillFalling = false;

    confettiPieces.forEach((confetti) => {
      // Update position
      confetti.y += confetti.speedY;
      confetti.x += confetti.speedX;
      confetti.rotation += confetti.rotationSpeed;

      // Draw confetti
      ctx.save();
      ctx.translate(confetti.x, confetti.y);
      ctx.rotate((confetti.rotation * Math.PI) / 180);
      ctx.fillStyle = confetti.color;
      ctx.fillRect(-confetti.size / 2, -confetti.size / 2, confetti.size, confetti.size);
      ctx.restore();

      // Check if still visible
      if (confetti.y < canvas.height + 10) {
        stillFalling = true;
      }
    });

    if (stillFalling) {
      animationFrame = requestAnimationFrame(animate);
    } else {
      // Clean up
      cancelAnimationFrame(animationFrame);
      document.body.removeChild(canvas);
    }
  }

  animate();
}

export function triggerSuccessConfetti() {
  // Trigger confetti burst from bottom
  triggerConfetti();

  // Add a second burst after a short delay for extra celebration
  setTimeout(() => {
    triggerConfetti();
  }, 300);
}

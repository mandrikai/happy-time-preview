(() => {
  const phone = document.querySelector('.hero-phone');
  if (!phone || !phone.animate) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!matchMedia('(max-width: 740px)').matches) return;

  const $ = s => phone.querySelector(s);
  const body = $('.hp-body');
  const buzz = $('.hp-buzz');
  const lock = $('.hp-lock');
  const push = $('.hp-push');
  const photo = $('.hp-photo');
  const bubble = $('.hp-bubble');
  const head = $('.hp-head');

  const OUT = 'cubic-bezier(.23, 1, .32, 1)';
  const SETTLE = 'cubic-bezier(.24, 1.12, .44, 1)';

  const vibrate = (delay = 0) => buzz.animate(
    [
      { transform: 'rotate(0)' },
      { transform: 'rotate(-1.4deg)', easing: 'ease-in-out' },
      { transform: 'rotate(1.3deg)', easing: 'ease-in-out' },
      { transform: 'rotate(-.8deg)', easing: 'ease-in-out' },
      { transform: 'rotate(.4deg)', easing: 'ease-out' },
      { transform: 'rotate(0)' },
    ],
    { duration: 560, delay, easing: 'ease-out' }
  );

  const play = () => {
    // 1. The phone lands: already almost there, settles with a small bounce.
    body.animate(
      [
        { opacity: 0, transform: 'translateY(18px) rotate(-3deg) scale(.98)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 950, easing: SETTLE, fill: 'backwards' }
    );

    // 2. Night lock screen, then gone once the chat opens.
    lock.animate(
      [{ opacity: 1 }, { opacity: 1, offset: .86 }, { opacity: 0 }],
      { duration: 3500, easing: 'ease', fill: 'backwards' }
    );

    // 3. Push drops in with a double buzz, then lifts away into the chat.
    push.animate(
      [
        { opacity: 0, transform: 'translateY(-130%)' },
        { opacity: 1, transform: 'translateY(0)', offset: .24 },
        { opacity: 1, transform: 'translateY(0)', offset: .8 },
        { opacity: 0, transform: 'translateY(-30%) scale(.96)' },
      ],
      { duration: 2000, delay: 1300, easing: OUT, fill: 'backwards' }
    );
    vibrate(1550);

    // 4. Reveal the photo inside its slot, then bring in the message.
    head.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: 450, delay: 3050, easing: 'ease', fill: 'backwards' }
    );
    photo.animate(
      [
        { opacity: 0, transform: 'scale(1.025)' },
        { opacity: 1, transform: 'scale(1)' },
      ],
      { duration: 1300, delay: 3150, easing: OUT, fill: 'backwards' }
    );
    bubble.animate(
      [
        { opacity: 0, transform: 'translateY(10px) scale(.94)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 500, delay: 4250, easing: OUT, fill: 'backwards' }
    );
  };

  const start = () => requestAnimationFrame(play);
  photo.complete ? start() : photo.addEventListener('load', start, { once: true });

  // Tap the phone and it buzzes again.
  const again = () => vibrate();
  phone.addEventListener('click', again);
  phone.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); again(); }
  });
})();

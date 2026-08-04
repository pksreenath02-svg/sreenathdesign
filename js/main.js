(function () {
  var els = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window) || !els.length) {
    els.forEach(function (el) { el.classList.add("in-view"); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  els.forEach(function (el) { io.observe(el); });
})();

(function () {
  var track = document.getElementById("heroTicker");
  if (!track) return;

  // Continuous right-to-left loop, never pauses (not even on hover — the
  // hover interaction is pure CSS opacity/pill, it doesn't touch this).
  // Content is duplicated once in build.py, so translating exactly -50%
  // loops seamlessly.
  if (window.gsap) {
    gsap.to(track, { xPercent: -50, duration: 34, ease: "none", repeat: -1, force3D: true });
  } else {
    track.style.animation = "hmTickerFallback 34s linear infinite";
  }
})();

(function () {
  var ring = document.getElementById("heroDragCarousel");
  if (!ring) return;

  var items = Array.prototype.slice.call(ring.querySelectorAll(".hm-dc-item"));
  var baseAngles = items.map(function (el) { return parseFloat(el.dataset.angle); });

  var rotation = 0;
  var dragging = false;
  var lastX = 0;
  var movedDistance = 0;
  var autoSpeed = 0.3;
  var DRAG_THRESHOLD = 6; // px of total movement before a gesture counts as a drag, not a tap

  // Whichever card's effective angle (its own base angle + the ring's
  // current rotation) is closest to 0 is the one facing the camera — scale
  // it up, brighten it, and show its caption for a real coverflow feel
  // instead of every card looking the same regardless of position.
  function updateFrontCard() {
    var bestIndex = -1;
    var bestDiff = Infinity;
    for (var i = 0; i < items.length; i++) {
      var eff = ((baseAngles[i] + rotation) % 360 + 360) % 360;
      var diff = Math.min(eff, 360 - eff);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIndex = i;
      }
    }
    items.forEach(function (el, i) {
      var isFront = i === bestIndex;
      el.classList.toggle("is-front", isFront);
      el.style.setProperty("--dc-scale", isFront ? "1.1" : "1");
    });
  }

  function render() {
    ring.style.transform = "rotateY(" + rotation + "deg)";
    updateFrontCard();
  }

  var pointerDownLink = null;

  ring.addEventListener("pointerdown", function (e) {
    dragging = true;
    lastX = e.clientX;
    movedDistance = 0;
    pointerDownLink = e.target.closest("a");
    ring.classList.add("dragging");
    // setPointerCapture retargets every subsequent pointer event (including
    // pointerup) to the ring itself, so the card's own <a> never receives a
    // pointerup/click and its native navigation never fires — that's why a
    // tap looked like it did nothing. Navigation is triggered manually from
    // the ring's pointerup handler below instead of relying on the anchor.
    ring.setPointerCapture && ring.setPointerCapture(e.pointerId);
  });
  ring.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    var dx = e.clientX - lastX;
    lastX = e.clientX;
    movedDistance += Math.abs(dx);
    rotation += dx * 0.4;
    render();
  });
  function stopDrag() {
    dragging = false;
    ring.classList.remove("dragging");
  }
  ring.addEventListener("pointerup", function () {
    if (movedDistance <= DRAG_THRESHOLD && pointerDownLink) {
      window.location.href = pointerDownLink.href;
    }
    stopDrag();
  });
  ring.addEventListener("pointerleave", stopDrag);

  function tick() {
    if (!dragging) {
      rotation -= autoSpeed;
      render();
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();

(function () {
  var cards = document.querySelectorAll(".project-card[data-disciplines]");
  var tags = document.querySelectorAll(".topic-tag");
  if (!cards.length || !tags.length) return;

  cards.forEach(function (card) {
    var disciplines = card.dataset.disciplines.split("|");
    card.addEventListener("mouseenter", function () {
      tags.forEach(function (tag) {
        tag.classList.toggle("active", disciplines.indexOf(tag.dataset.topic) !== -1);
      });
    });
    card.addEventListener("mouseleave", function () {
      tags.forEach(function (tag) { tag.classList.remove("active"); });
    });
  });
})();

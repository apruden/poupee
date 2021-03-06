import './app.css'
import Hammer from 'hammerjs'
import axios from 'axios'
import Vue from 'vue/dist/vue.js' // for webpack
import VueMaterial from 'vue-material'
import 'vue-material/dist/vue-material.min.css'
import 'vue-material/dist/theme/default.css'

Vue.use(VueMaterial)

// polyfill
var reqAnimationFrame = (function () {
  return (
    window[Hammer.prefixed(window, "requestAnimationFrame")] ||
    function (callback) {
      window.setTimeout(callback, 1000 / 60);
    }
  );
})();

var screen = document.querySelector(".device-screen");
var el = document.querySelector("#hitarea");

var START_X = Math.round((screen.offsetWidth - el.offsetWidth) / 2);
var START_Y = Math.round((screen.offsetHeight - el.offsetHeight) / 2);

var ticking = false;
var transform;
var timer;

var mc = new Hammer.Manager(el);

mc.add(new Hammer.Pan({ threshold: 0, pointers: 0 }));

mc.add(new Hammer.Swipe()).recognizeWith(mc.get("pan"));
mc.add(new Hammer.Rotate({ threshold: 0 })).recognizeWith(mc.get("pan"));
mc.add(new Hammer.Pinch({ threshold: 0 })).recognizeWith([
  mc.get("pan"),
  mc.get("rotate"),
]);

mc.add(new Hammer.Tap({ event: "doubletap", taps: 2 }));
mc.add(new Hammer.Tap());

mc.on("panstart panmove", onPan);
mc.on("rotatestart rotatemove", onRotate);
mc.on("pinchstart pinchmove", onPinch);
mc.on("swipe", onSwipe);
mc.on("tap", onTap);
mc.on("doubletap", onDoubleTap);

mc.on("hammer.input", function (ev) {
  if (ev.isFinal) {
    resetElement();
    console.log("final");
  }
});

function logEvent(ev) {
  //el.innerText = ev.type;
  console.log(ev);
  //axios.post('/api/v1/page/events', ev);
}

function resetElement() {
  el.className = "animate";
  transform = {
    translate: { x: START_X, y: START_Y },
    scale: 1,
    angle: 0,
    rx: 0,
    ry: 0,
    rz: 0,
  };
  requestElementUpdate();
}

function updateElementTransform() {
  var value = [
    "translate3d(" +
      transform.translate.x +
      "px, " +
      transform.translate.y +
      "px, 0)",
    "scale(" + transform.scale + ", " + transform.scale + ")",
    "rotate3d(" +
      transform.rx +
      "," +
      transform.ry +
      "," +
      transform.rz +
      "," +
      transform.angle +
      "deg)",
  ];

  value = value.join(" ");
  el.style.webkitTransform = value;
  el.style.mozTransform = value;
  el.style.transform = value;
  ticking = false;
}

function requestElementUpdate() {
  if (!ticking) {
    reqAnimationFrame(updateElementTransform);
    ticking = true;
  }
}

function onPan(ev) {
  el.className = "";
  transform.translate = {
    x: START_X + ev.deltaX,
    y: START_Y + ev.deltaY,
  };

  const foo = ev.deltaX * Math.abs(ev.velocityX);
  const deltaX = (foo >= 0 ? 1 : -1) * Math.min(Math.abs(foo), 5);
  const bar = ev.deltaY * Math.abs(ev.velocityY);
  const deltaY = (bar >= 0 ? 1 : -1) * Math.min(Math.abs(bar), 5);

  axios.get("/api/v1/browser/mouse", {
    params: { deltaX: deltaX, deltaY: deltaY },
  });

  logEvent(ev);
  requestElementUpdate();
}

var initScale = 1;
function onPinch(ev) {
  if (ev.type == "pinchstart") {
    initScale = transform.scale || 1;
  }

  el.className = "";
  transform.scale = initScale * ev.scale;

  const deltaY = Math.min(ev.deltaY * ev.velocityY, 5);
  axios.get("/api/v1/browser/scroll", { params: { deltaY: deltaY } });

  logEvent(ev);
  requestElementUpdate();
}

var initAngle = 0;
function onRotate(ev) {
  if (ev.type == "rotatestart") {
    initAngle = transform.angle || 0;
  }

  el.className = "";
  transform.rz = 1;
  transform.angle = initAngle + ev.rotation;

  logEvent(ev);
  requestElementUpdate();
}

function onSwipe(ev) {
  //var angle = 50;
  //transform.ry = (ev.direction & Hammer.DIRECTION_HORIZONTAL) ? 1 : 0;
  //transform.rx = (ev.direction & Hammer.DIRECTION_VERTICAL) ? 1 : 0;
  //transform.angle = (ev.direction & (Hammer.DIRECTION_RIGHT | Hammer.DIRECTION_UP)) ? angle : -angle;
  logEvent(ev);
  requestElementUpdate();
}

function onTap(ev) {
  transform.rx = 1;

  logEvent(ev);
  requestElementUpdate();

  axios.get("/api/v1/browser/mouse", { params: { click: "true" } });
}

function onDoubleTap(ev) {
  transform.rx = 1;

  logEvent(ev);
  requestElementUpdate();

  axios.get("/api/v1/browser/mouse", { params: { click: "true" } });
}

resetElement();

document.querySelector(".device-button").addEventListener(
  "click",
  function () {
    document.querySelector(".device").classList.toggle("hammertime");
  },
  false
);

var poupee = new Vue({
  el: "#poupee",
  data: {
      text: '',
      provider: 'youtube',
      options: [
          {text: 'youtube', value: 'youtube'},
          {text: 'disneyplus', value: 'disneyplus'},
          {text: 'netflix', value: 'netflix'},
      ]
  },
  methods: {
    async back () {
      await axios.get("/api/v1/browser/back")
    },
    async forward () {
      await axios.get("/api/v1/browser/forward")
    },
    async go () {
      await axios.get("/api/v1/browser/app", {
        params: { name: poupee.provider },
      })
    },
    async enter () {
      await axios.get("/api/v1/browser/enter")
    },
    async escape () {
      await axios.get("/api/v1/browser/escape")
    },
    async type () {
      await axios.get("/api/v1/browser/type", { params: { text: poupee.text } })
    },
  },
})

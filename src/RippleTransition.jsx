import { useEffect, useRef } from "react";

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
precision mediump float;
uniform vec2 u_res;
uniform float u_t;
uniform vec2 u_origin;
uniform float u_freq;
uniform float u_speed;
uniform float u_peak;
void main() {
  vec2 uv = gl_FragCoord.xy / u_res - 0.5;
  uv.x *= u_res.x / u_res.y;
  uv -= u_origin;
  float d = length(uv);
  float front = u_t * u_speed;
  float diff = front - d;
  if (diff < 0.0) { gl_FragColor = vec4(0.0); return; }
  float wave = sin(diff * u_freq) * exp(-diff * 3.5);
  float a = max(0.0, wave) * u_peak * (1.0 - u_t);
  gl_FragColor = vec4(1.0, 1.0, 1.0, a);
}
`;

function setupGL(gl, canvas) {
  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, VERT); gl.compileShader(vs);
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, FRAG); gl.compileShader(fs);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs);
  gl.linkProgram(prog); gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "a_pos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.viewport(0, 0, canvas.width, canvas.height);

  return {
    prog, buf, aPos,
    uRes:    gl.getUniformLocation(prog, "u_res"),
    uT:      gl.getUniformLocation(prog, "u_t"),
    uOrigin: gl.getUniformLocation(prog, "u_origin"),
    uFreq:   gl.getUniformLocation(prog, "u_freq"),
    uSpeed:  gl.getUniformLocation(prog, "u_speed"),
    uPeak:   gl.getUniformLocation(prog, "u_peak"),
  };
}

export default function RippleTransition({ trigger }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const gl = canvas.getContext("webgl", { premultipliedAlpha: false })
            || canvas.getContext("experimental-webgl", { premultipliedAlpha: false });
    if (!gl) return;

    const glObjs = setupGL(gl, canvas);
    stateRef.current = { gl, ...glObjs, raf: null };

    function onResize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      Object.assign(stateRef.current, setupGL(gl, canvas));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!trigger || !stateRef.current) return;
    const { gl, uRes, uT, uOrigin, uFreq, uSpeed, uPeak } = stateRef.current;
    const canvas = canvasRef.current;

    cancelAnimationFrame(stateRef.current.raf);

    const rand = (lo, hi) => lo + Math.random() * (hi - lo);
    const ox    = rand(-0.25, 0.25);
    const oy    = rand(-0.18, 0.18);
    const freq  = rand(12, 22);
    const speed = rand(1.6, 2.2);
    const peak  = rand(0.45, 0.7);
    const DURATION = rand(90, 130);

    gl.uniform2f(uOrigin, ox, oy);
    gl.uniform1f(uFreq,   freq);
    gl.uniform1f(uSpeed,  speed);
    gl.uniform1f(uPeak,   peak);

    const t0 = performance.now();

    function frame(now) {
      const t = Math.min((now - t0) / DURATION, 1.0);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uT, t);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (t < 1.0) stateRef.current.raf = requestAnimationFrame(frame);
    }

    stateRef.current.raf = requestAnimationFrame(frame);
  }, [trigger]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 5 }}
    />
  );
}

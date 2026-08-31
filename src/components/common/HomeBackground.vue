<template>
  <div class="home-background">
    <div class="solid-background-layer"></div>
    <div class="ambient-glow-layer" aria-hidden="true">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 710 710"
        width="100%"
        height="100%"
        class="ambient-glow-svg"
      >
        <defs>
          <radialGradient
            id="ambient-rg"
            cx="122.13"
            cy="-77.56"
            r="704.74"
            fx="122.13"
            fy="-77.56"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stop-color="rgb(4, 213, 255)" stop-opacity="0.6">
              <animate
                attributeName="stop-color"
                values="rgb(4, 213, 255); rgb(4, 38, 255); rgb(255, 54, 141); rgb(4, 213, 255)"
                dur="6s"
                repeatCount="indefinite"
                keySplines="0.65 0 0.35 1; 0.65 0 0.35 1; 0.65 0 0.35 1"
                keyTimes="0; 0.333; 0.667; 1"
                calcMode="spline"
              />
              <animate
                attributeName="stop-opacity"
                values="0.6; 0.6; 1; 0.6"
                dur="6s"
                repeatCount="indefinite"
                keySplines="0.65 0 0.35 1; 0.65 0 0.35 1; 0.65 0 0.35 1"
                keyTimes="0; 0.333; 0.667; 1"
                calcMode="spline"
              />
            </stop>
            <stop offset="50%" stop-color="rgb(61, 139, 255)" stop-opacity="0.8">
              <animate
                attributeName="stop-color"
                values="rgb(61, 139, 255); rgb(165, 61, 255); rgb(61, 139, 255); rgb(61, 139, 255)"
                dur="6s"
                repeatCount="indefinite"
                keySplines="0.65 0 0.35 1; 0.65 0 0.35 1; 0.65 0 0.35 1"
                keyTimes="0; 0.333; 0.667; 1"
                calcMode="spline"
              />
            </stop>
            <stop offset="100%" stop-color="rgb(255, 54, 141)" stop-opacity="1">
              <animate
                attributeName="stop-color"
                values="rgb(255, 54, 141); rgb(255, 0, 111); rgb(4, 213, 255); rgb(255, 54, 141)"
                dur="6s"
                repeatCount="indefinite"
                keySplines="0.65 0 0.35 1; 0.65 0 0.35 1; 0.65 0 0.35 1"
                keyTimes="0; 0.333; 0.667; 1"
                calcMode="spline"
              />
              <animate
                attributeName="stop-opacity"
                values="1; 1; 0.6; 1"
                dur="6s"
                repeatCount="indefinite"
                keySplines="0.65 0 0.35 1; 0.65 0 0.35 1; 0.65 0 0.35 1"
                keyTimes="0; 0.333; 0.667; 1"
                calcMode="spline"
              />
            </stop>
          </radialGradient>
          <linearGradient
            id="ambient-lg"
            x1="88.75"
            y1="0"
            x2="332.81"
            y2="465.94"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stop-color="rgb(74, 255, 54)">
              <animate
                attributeName="stop-color"
                values="rgb(74, 255, 54); rgb(255, 218, 54); rgb(255, 0, 183); rgb(74, 255, 54)"
                dur="6s"
                repeatCount="indefinite"
                keySplines="0.65 0 0.35 1; 0.65 0 0.35 1; 0.65 0 0.35 1"
                keyTimes="0; 0.333; 0.667; 1"
                calcMode="spline"
              />
            </stop>
            <stop offset="100%" stop-color="rgb(255, 216, 40)">
              <animate
                attributeName="stop-color"
                values="rgb(255, 216, 40); rgb(255, 94, 40); rgb(255, 171, 54); rgb(255, 216, 40)"
                dur="6s"
                repeatCount="indefinite"
                keySplines="0.65 0 0.35 1; 0.65 0 0.35 1; 0.65 0 0.35 1"
                keyTimes="0; 0.333; 0.667; 1"
                calcMode="spline"
              />
            </stop>
          </linearGradient>
        </defs>
        <g>
          <g transform="matrix(1, 0, 0, 1, 0, 0)">
            <path
              fill="url(#ambient-lg)"
              fill-opacity="1"
              d="M436.13,0 L510.06,0 C510.19,0 510.29,0.12 510.26,0.24 L388.32,554.53 C388.3,554.62 388.3,554.69 388.21,554.69 C384.82,554.69 267.1,554.69 183.42,554.69 C120.92,554.69 74.73,544.05 44.84,522.77 C14.95,500.92 0,467.56 0,422.7 C0,363.29 22.19,244.06 22.19,244.06 L66.53,0.16 C66.55,0.06 66.63,0 66.73,0 L260.86,0 C382.73,0 370.91,0 436.13,0 Z"
            />
          </g>
          <g transform="matrix(1, 0, 0, 1, 177.5, 177.5)">
            <path
              fill="url(#ambient-rg)"
              fill-opacity="1"
              d="M455.09,0 L532.25,0 C532.38,0 532.48,0.12 532.45,0.24 L458.49,339.54 C452.82,366.04 444.6,390.89 433.83,414.08 C423.05,437.27 407.46,457.69 387.04,475.36 C367.19,493.03 341.39,507.1 309.63,517.59 C277.87,527.53 238.46,532.5 191.39,532.5 C126.17,532.5 77.98,522.29 46.79,501.86 C15.6,480.88 0,448.85 0,405.79 C0,386.47 2.56,361.9 7.66,332.09 C12.76,302.28 19.28,269.97 27.22,235.19 L79.07,0.16 C79.09,0.07 79.18,0 79.27,0 L272.2,0 C399.37,0 387.04,0 455.09,0 Z"
            />
          </g>
        </g>
      </svg>
    </div>
    <div class="glass-layer"></div>
    <div class="texture-layer"></div>
  </div>
</template>

<style scoped>
/* --- Base & Background --- */
.home-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: -2; /* Lower z-index to be behind App.vue's background */
}

.solid-background-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #232323; /* --color-bg-solid */
}

.ambient-glow-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: clamp(400px, 50vw, 600px);
  height: clamp(400px, 50vw, 600px);
  pointer-events: none;
}

.ambient-glow-svg {
  display: block;
  width: 100%;
  height: 100%;
}

@media (prefers-reduced-motion: reduce) {
  .ambient-glow-svg animate {
    animation-play-state: paused !important;
  }
}

.glass-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  backdrop-filter: blur(160px) saturate(180%) brightness(1.1);
  -webkit-backdrop-filter: blur(160px) saturate(180%);
  background: linear-gradient(135deg, rgba(18, 18, 18, 0.1) 0%, rgba(18, 18, 18, 0.3) 100%);
}

.texture-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url('@/assets/ui/bg.svg');
  background-repeat: no-repeat;
  background-position: right center;
  background-size: auto 100%;
}

@media (max-width: 600px) {
  .texture-layer {
    background-size: auto 75%;
    background-position: right -70px center;
  }
}
</style>

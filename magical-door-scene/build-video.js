#!/usr/bin/env node
/* =========================================
   MAGICAL GOLDEN DOOR
   Offline cinematic renderer

   Turns the generated keyframes in
   assets/keyframes/ into a real 10 second
   vertical 9:16 MP4.

   Two stages:

     1. compose-frames.py
        Renders every frame with exact bezier
        eased camera moves, sub-pixel Lanczos
        sampling, cross-dissolves, the growing
        golden light bloom and three parallax
        layers of twinkling sparkles.

        (ffmpeg's crop filter cannot animate its
        width/height per frame, so the camera
        moves are computed here instead.)

     2. ffmpeg
        Applies the cinematic grade - soft-focus
        bloom, vignette, warm balance, curves and
        fine film grain - and encodes H.264.

   No API key and no credits required.

   Usage:
     node build-video.js               render the video
     node build-video.js --status      show what is ready
     node build-video.js --dry-run     print the plan only
     node build-video.js --keep-frames keep the jpg frame cache

   Environment:
     GS_FFMPEG         path to ffmpeg
     GS_PYTHON         path to python3 with Pillow + numpy
     GS_KEYFRAMES      alternative keyframe folder
     GS_RENDER_WORKERS parallel frame workers (default 2)
========================================= */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");

const SCENE = require("./scene");

/* =========================================
   PATHS
========================================= */

const SCENE_DIR = __dirname;

const ASSET_DIR =
    path.join(SCENE_DIR, "assets");

/*
   GS_KEYFRAMES lets you point the renderer at a
   different folder of stills (useful for tests
   and for keeping alternate character takes).
*/

const KEYFRAME_DIR =
    process.env.GS_KEYFRAMES
        ? path.resolve(process.env.GS_KEYFRAMES)
        : path.join(ASSET_DIR, "keyframes");

const CACHE_DIR =
    path.join(ASSET_DIR, "cache");

const FRAMES_DIR =
    path.join(CACHE_DIR, "frames");

const OUTPUT_DIR =
    path.join(SCENE_DIR, "output");

const OUTPUT_FILE =
    path.join(OUTPUT_DIR, "magical-door-10s-9x16.mp4");

const PLAN_FILE =
    path.join(CACHE_DIR, "plan.json");

[
    CACHE_DIR,
    OUTPUT_DIR,
    KEYFRAME_DIR,
    FRAMES_DIR
].forEach(
    (dir) => fs.mkdirSync(dir, { recursive: true })
);

/* =========================================
   CLI FLAGS
========================================= */

const ARGS =
    process.argv.slice(2);

const FLAG_STATUS =
    ARGS.includes("--status");

const FLAG_DRY_RUN =
    ARGS.includes("--dry-run");

const FLAG_NO_TEXTURES =
    ARGS.includes("--no-textures");

const FLAG_KEEP_FRAMES =
    ARGS.includes("--keep-frames");

/* =========================================
   TOOL DISCOVERY
========================================= */

function findTool(envValue, names, probeArgs) {

    const candidates = [];

    if (envValue) {
        candidates.push(envValue);
    }

    candidates.push(...names);

    candidates.push(
        path.join(process.cwd(), "bin", names[0])
    );

    candidates.push(
        path.join(os.homedir(), "bin", names[0])
    );

    candidates.push(
        path.join(SCENE_DIR, "bin", names[0])
    );

    for (const candidate of candidates) {

        const probe =
            spawnSync(candidate, probeArgs, { stdio: "ignore" });

        if (probe.status === 0) {
            return candidate;
        }

    }

    return null;

}

function findFfmpeg() {

    return findTool(
        process.env.GS_FFMPEG,
        ["ffmpeg"],
        ["-version"]
    );

}

function findPython() {

    return findTool(
        process.env.GS_PYTHON,
        ["python3", "python", "/tmp/venv/bin/python"],
        ["-c", "import PIL, numpy"]
    );

}

/* =========================================
   MATH HELPERS
========================================= */

function round3(value) {

    return Number(Number(value).toFixed(3));

}

function round6(value) {

    return Number(Number(value).toFixed(6));

}

/* =========================================
   TIMELINE
   Every shot overlaps its neighbour by that
   transition's duration, so the rendered length
   is sum(shots) - sum(transitions).
========================================= */

function buildTimeline() {

    const fps = SCENE.fps;

    const shots = SCENE.shots;

    const transitions = SCENE.transitions;

    if (transitions.length !== shots.length - 1) {

        throw new Error(
            `scene.js needs ${shots.length - 1} transitions, found ${transitions.length}`
        );

    }

    const toFrames = (seconds) =>
        Math.round(seconds * fps);

    const entries = [];

    const blends = [];

    let cursor = 0;

    shots.forEach(
        (shot, index) => {

            const frames = toFrames(shot.duration);

            entries.push({
                shotIndex: index,
                id: shot.id,
                startFrame: cursor,
                endFrame: cursor + frames,
                duration: shot.duration
            });

            const transition = transitions[index];

            if (transition) {

                const overlap = toFrames(transition.duration);

                blends.push({
                    type: transition.type,
                    fromShot: index,
                    toShot: index + 1,
                    fromStartFrame: cursor,
                    toStartFrame: cursor + frames - overlap,
                    startFrame: cursor + frames - overlap,
                    endFrame: cursor + frames
                });

                cursor += frames - overlap;

            } else {

                cursor += frames;

            }

        }
    );

    const totalFrames = cursor;

    const target = SCENE.targetDuration;

    if (target && Math.abs(totalFrames / fps - target) > 0.2) {

        console.log(
            `  WARNING: timeline is ${round3(totalFrames / fps)}s ` +
            `but scene.js targets ${target}s`
        );

    }

    return { entries, blends, totalFrames, seconds: round3(totalFrames / fps) };

}

/* =========================================
   KEYFRAMES
========================================= */

function listKeyframes() {

    if (!fs.existsSync(KEYFRAME_DIR)) {
        return [];
    }

    return fs
        .readdirSync(KEYFRAME_DIR)
        .filter(
            (file) => /\.(png|jpe?g|webp)$/i.test(file)
        )
        .sort()
        .map(
            (file) => path.join(KEYFRAME_DIR, file)
        );

}

/* =========================================
   TEXTURES
========================================= */

function buildTextures() {

    const glowPath =
        path.join(CACHE_DIR, "golden-glow.png");

    const sparklePaths =
        SCENE.sparkles.layers.map(
            (layer) =>
                path.join(CACHE_DIR, `sparkles-${layer.name}.png`)
        );

    const allExist =
        fs.existsSync(glowPath) &&
        sparklePaths.every((file) => fs.existsSync(file));

    if (allExist) {

        console.log("  textures: cached ✓");

        return { glowPath, sparklePaths };

    }

    const python = findPython();

    if (!python) {

        throw new Error(
            "No Python interpreter with Pillow + numpy was found. " +
            "Install them (pip install pillow numpy) or set GS_PYTHON."
        );

    }

    const layerSpec =
        SCENE.sparkles.layers
            .map(
                (layer) =>
                    `${layer.name}:${layer.count}:${layer.minRadius}:${layer.maxRadius}`
            )
            .join(",");

    console.log("  textures: generating...");

    execFileSync(
        python,
        [
            path.join(SCENE_DIR, "particles.py"),
            "--out", CACHE_DIR,
            "--width", String(SCENE.width),
            "--height", String(SCENE.height),
            "--tile", String(SCENE.height * 2),
            "--seed", "7",
            "--glow-x", String(SCENE.glow.x),
            "--glow-y", String(SCENE.glow.y),
            "--glow-radius", String(SCENE.glow.radius),
            "--layers", layerSpec
        ],
        { stdio: "inherit" }
    );

    return { glowPath, sparklePaths };

}

/* =========================================
   RENDER PLAN  (handed to compose-frames.py)
========================================= */

function buildPlan(timeline, keyframes, textures) {

    return {

        fps: SCENE.fps,

        totalFrames: timeline.totalFrames,

        framesDir: FRAMES_DIR,

        frame: {
            width: SCENE.width,
            height: SCENE.height
        },

        canvas: {
            width: Math.round(SCENE.width * SCENE.canvasScale),
            height: Math.round(SCENE.height * SCENE.canvasScale)
        },

        keyframes: keyframes.slice(0, SCENE.shots.length),

        shots: SCENE.shots.map(
            (shot) => ({
                id: shot.id,
                duration: shot.duration,
                camera: {
                    zoomFrom: shot.camera.zoomFrom,
                    zoomTo: shot.camera.zoomTo,
                    driftY: shot.camera.driftY || 0,
                    ease: shot.camera.ease || "inOut"
                }
            })
        ),

        timeline: timeline.entries,

        transitions: timeline.blends,

        glow: {
            keyframes: SCENE.glow.keyframes.map(
                (point) => ({
                    time: point.time,
                    value: point.opacity
                })
            )
        },

        sparkles: {
            layers: SCENE.sparkles.layers,
            boost: SCENE.sparkles.boost
        },

        textures: {
            glow: textures.glowPath,
            sparkles: textures.sparklePaths
        }

    };

}

/* =========================================
   GRADE FILTERGRAPH  (ffmpeg stage 2)
========================================= */

function buildGradeFiltergraph() {

    const grade = SCENE.grade;

    return [

        `[0:v]split=2[main][softsrc]`,

        `[softsrc]gblur=sigma=${grade.softFocus},format=rgb24[soft]`,

        `[main]format=rgb24[mainRgb]`,

        `[mainRgb][soft]blend=all_expr='A+(B-A)*${grade.softFocusMix}',format=yuv420p[bloomed]`,

        `[bloomed]vignette=angle=PI/5:mode=forward,` +
        `eq=saturation=${grade.saturation}:brightness=0.012,` +
        `colorbalance=rs=${grade.warmth}` +
        `:gs=${round3(grade.warmth * 0.35)}` +
        `:bs=${round3(-grade.warmth)}` +
        `:rm=${round3(grade.warmth * 0.6)}` +
        `:bm=${round3(-grade.warmth * 0.6)}` +
        `:rh=${round3(grade.warmth * 0.3)}` +
        `:bh=${round3(-grade.warmth * 0.3)},` +
        `curves=preset=lighter,` +
        `noise=alls=${grade.grain}:allf=t+u,` +
        `fps=${SCENE.fps},` +
        `format=yuv420p[out]`

    ].join(";");

}

/* =========================================
   RENDER
========================================= */

function render() {

    console.log("");
    console.log("================================");
    console.log(" MAGICAL GOLDEN DOOR RENDERER");
    console.log("================================");

    const ffmpeg = findFfmpeg();

    if (!ffmpeg) {

        throw new Error(
            "ffmpeg was not found. Set GS_FFMPEG=/path/to/ffmpeg " +
            "or put a binary in ./bin/ffmpeg"
        );

    }

    const python = findPython();

    if (!python) {

        throw new Error(
            "python3 with Pillow + numpy was not found. " +
            "Run: pip install pillow numpy   (or set GS_PYTHON)"
        );

    }

    console.log("  ffmpeg:", ffmpeg);
    console.log("  python:", python);

    const keyframes = listKeyframes();

    if (keyframes.length < SCENE.shots.length) {

        console.log("");
        console.log(`  EXPECTING ${SCENE.shots.length} KEYFRAMES in:`);
        console.log(`  ${KEYFRAME_DIR}`);
        console.log("");

        SCENE.shots.forEach(
            (shot, index) => {

                const found = keyframes[index];

                console.log(
                    `   ${String(index + 1).padStart(2, " ")}. ` +
                    `${found ? "✓" : "✗"} ${shot.id}` +
                    `${found ? `  ->  ${path.basename(found)}` : "  (missing)"}`
                );

            }
        );

        console.log("");
        console.log("  See keyframe-prompts.md for the exact");
        console.log("  prompts used to generate each still.");
        console.log("");

        throw new Error(
            `Need ${SCENE.shots.length} keyframes, found ${keyframes.length}`
        );

    }

    const timeline = buildTimeline();

    console.log("  shots:", SCENE.shots.length);
    console.log("  keyframes:", keyframes.length);
    console.log("  timeline:", `${timeline.seconds}s / ${timeline.totalFrames} frames`);
    console.log("  output:", `${SCENE.width}x${SCENE.height} @ ${SCENE.fps}fps`);

    const textures =
        FLAG_NO_TEXTURES
            ? null
            : buildTextures();

    const plan =
        buildPlan(
            timeline,
            keyframes,
            textures || {
                glowPath: path.join(CACHE_DIR, "golden-glow.png"),
                sparklePaths: SCENE.sparkles.layers.map(
                    (layer) => path.join(CACHE_DIR, `sparkles-${layer.name}.png`)
                )
            }
        );

    fs.writeFileSync(PLAN_FILE, JSON.stringify(plan, null, 2));

    console.log("  plan:", PLAN_FILE);

    /* -----------------------------------------
       stage 1 - compose every frame
    ----------------------------------------- */

    if (FLAG_DRY_RUN) {

        console.log("");
        console.log("  DRY RUN — stage 1:");
        console.log(`    ${python} compose-frames.py ${PLAN_FILE}`);
        console.log("");
        console.log("  DRY RUN — stage 2 grade filtergraph:");
        console.log("");
        console.log(buildGradeFiltergraph());
        console.log("");

        return;

    }

    console.log("");
    console.log("  stage 1/2 — composing frames...");

    const composeStarted = Date.now();

    const composeResult =
        spawnSync(
            python,
            [path.join(SCENE_DIR, "compose-frames.py"), PLAN_FILE],
            { cwd: SCENE_DIR, stdio: "inherit" }
        );

    if (composeResult.status !== 0) {

        throw new Error(
            `compose-frames.py exited with code ${composeResult.status}`
        );

    }

    console.log(
        `  frames composed in ${((Date.now() - composeStarted) / 1000).toFixed(1)}s`
    );

    /* -----------------------------------------
       stage 2 - grade + encode
    ----------------------------------------- */

    console.log("");
    console.log("  stage 2/2 — grading and encoding...");

    const gradeFile =
        path.join(CACHE_DIR, "grade.txt");

    fs.writeFileSync(gradeFile, buildGradeFiltergraph());

    const encodeStarted = Date.now();

    const encodeArgs = [

        "-hide_banner",
        "-y",

        "-framerate", String(SCENE.fps),
        "-i", path.join(FRAMES_DIR, "frame_%05d.jpg"),

        "-filter_complex_script", gradeFile,
        "-map", "[out]",

        "-frames:v", String(timeline.totalFrames),
        "-t", String(timeline.seconds),
        "-r", String(SCENE.fps),

        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "18",
        "-profile:v", "high",
        "-pix_fmt", "yuv420p",
        "-g", String(SCENE.fps * 2),
        "-movflags", "+faststart",
        "-an",

        OUTPUT_FILE

    ];

    const encodeResult =
        spawnSync(ffmpeg, encodeArgs, { cwd: SCENE_DIR, stdio: "inherit" });

    if (encodeResult.status !== 0) {

        throw new Error(
            `ffmpeg exited with code ${encodeResult.status}`
        );

    }

    console.log(
        `  encoded in ${((Date.now() - encodeStarted) / 1000).toFixed(1)}s`
    );

    /* -----------------------------------------
       cleanup
    ----------------------------------------- */

    if (!FLAG_KEEP_FRAMES) {

        try {

            fs.readdirSync(FRAMES_DIR).forEach(
                (file) => fs.unlinkSync(path.join(FRAMES_DIR, file))
            );

        } catch (cleanupError) {

            console.log(
                "Frame cleanup skipped:",
                cleanupError.message
            );

        }

    }

    const stats = fs.statSync(OUTPUT_FILE);

    console.log("");
    console.log("================================");
    console.log(" VIDEO READY ✅");
    console.log("================================");
    console.log("  file:", OUTPUT_FILE);
    console.log("  size:", `${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log("  length:", `${timeline.seconds}s`, `${SCENE.width}x${SCENE.height}`, `${SCENE.fps}fps`);
    console.log("================================");
    console.log("");

}

/* =========================================
   STATUS
========================================= */

function status() {

    const keyframes = listKeyframes();

    const ffmpeg = findFfmpeg();

    const python = findPython();

    let timeline = null;

    try {
        timeline = buildTimeline();
    } catch (error) {
        timeline = { seconds: 0, totalFrames: 0 };
    }

    console.log("");
    console.log("================================");
    console.log(" MAGICAL DOOR SCENE STATUS");
    console.log("================================");
    console.log("  ffmpeg:        ", ffmpeg || "MISSING");
    console.log("  python+PIL:    ", python || "MISSING");
    console.log("  keyframe dir:  ", KEYFRAME_DIR);
    console.log("  keyframes:     ", `${keyframes.length}/${SCENE.shots.length}`);
    console.log("  timeline:      ", `${timeline.seconds}s / ${timeline.totalFrames} frames`);
    console.log("  output:        ", fs.existsSync(OUTPUT_FILE)
        ? OUTPUT_FILE
        : "not rendered yet");
    console.log("");

    SCENE.shots.forEach(
        (shot, index) => {

            const found = keyframes[index];

            console.log(
                `   ${String(index + 1).padStart(2, " ")}. ` +
                `${found ? "✓" : "✗"} ${shot.id.padEnd(28, " ")}` +
                `${shot.duration}s  zoom ${shot.camera.zoomFrom}->${shot.camera.zoomTo}  ${shot.camera.ease}`
            );

        }
    );

    console.log("================================");
    console.log("");

}

/* =========================================
   MAIN
========================================= */

try {

    if (FLAG_STATUS) {

        status();

    } else {

        render();

    }

} catch (error) {

    console.error("");
    console.error("RENDER FAILED:", error.message);
    console.error("");

    process.exit(1);

}

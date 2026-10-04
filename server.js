const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const os = require("os");
const multer = require("multer");
const { execFile } = require("child_process");

require("dotenv").config();

const { Client } = require("magic-hour");

const app = express();

const PORT =
    process.env.PORT || 3000;

/* =========================================
   MAGIC HOUR CLIENT
========================================= */

const magicHour =
    new Client({
        token: process.env.MAGIC_HOUR_API_KEY
    });

/* =========================================
   CONSTANTS
========================================= */

const ASPECT_RATIOS = [
    "16:9",
    "9:16",
    "1:1"
];

const RESOLUTIONS = [
    "360p",
    "480p",
    "720p",
    "1080p",
    "4k"
];

/*
   Models that accept character
   reference images on text-to-video
   (`references` field).
*/

const REFERENCE_TEXT_MODELS = [
    "seedance-2.5",
    "seedance-2.0",
    "seedance-2.0-mini",
    "minimax-h3",
    "kling-3.0"
];

/*
   Models that accept a start image
   on image-to-video.
*/

const IMAGE_TO_VIDEO_MODELS = [
    "seedance-2.5",
    "seedance-2.0",
    "seedance-2.0-mini",
    "seedance-1.5",
    "kling-3.0",
    "kling-2.6",
    "ltx-2.5",
    "minimax-h3",
    "gemini-omni-1.1",
    "veo3.1",
    "veo3.1-lite",
    "wan-3.0",
    "wan-2.2"
];

const TEXT_MODELS = [
    "default",
    "seedance-2.5",
    "seedance-2.0",
    "seedance-2.0-mini",
    "seedance-1.5",
    "kling-3.0",
    "kling-2.6",
    "ltx-2.5",
    "minimax-h3",
    "gemini-omni-1.1",
    "veo3.1",
    "veo3.1-lite",
    "wan-3.0",
    "wan-2.2",
    "sora-2"
];

const MAX_UPLOAD_BYTES =
    25 * 1024 * 1024;

const OUTPUT_DIR =
    path.join(__dirname, "output");

const UPLOAD_DIR =
    path.join(os.tmpdir(), "gs-ai-studio-uploads");

const SCENE_DIR =
    path.join(__dirname, "magical-door-scene");

const KEYFRAME_DIR =
    path.join(SCENE_DIR, "assets", "keyframes");

const REFERENCE_DIR =
    path.join(SCENE_DIR, "assets", "reference");

[
    OUTPUT_DIR,
    UPLOAD_DIR,
    KEYFRAME_DIR,
    REFERENCE_DIR
].forEach(
    (dir) => {
        fs.mkdirSync(
            dir,
            { recursive: true }
        );
    }
);

/* =========================================
   MIDDLEWARE
========================================= */

app.use(cors());

app.use(
    express.json({
        limit: "10mb"
    })
);

const upload =
    multer({
        dest: UPLOAD_DIR,
        limits: {
            fileSize: MAX_UPLOAD_BYTES,
            files: 8
        }
    });

app.use(
    express.static(__dirname)
);

/* =========================================
   SCENE PRESETS
   Ready-made cinematic prompts.
========================================= */

const SCENE_PRESETS = {

    "magical-door": {

        name:
            "Magical Golden Door",

        aspectRatio: "9:16",

        orientation: "portrait",

        duration: 10,

        resolution: "1080p",

        model: "seedance-2.5",

        prompt: [

            "High-quality 3D animated movie style, vertical 9:16 cinematic shot.",

            "A cute little girl with big brown eyes, pink curly hair, a pink hair bow and a pink sparkly dress stands in a warm pastel magical playroom filled with soft toys and fairy lights.",

            "A tiny glowing golden door appears on the wall in front of her.",

            "She looks surprised and excited, slowly walks toward the door, reaches out and opens it.",

            "Bright colorful magical light shines from inside, revealing a beautiful miniature fantasy world with glowing flowers, floating butterflies and sparkling particles.",

            "She smiles with wonder and takes one small step toward the magical world.",

            "Camera: smooth cinematic slow push-in, gentle camera movement, soft depth of field, warm lighting, magical sparkles.",

            "Style: cute, dreamy, colorful, soft lighting, polished details.",

            "Keep the girl's face, hair, bow, dress and body proportions exactly consistent with the reference image.",

            "No text, no subtitles, no logos, no watermark, no character changes, no extra fingers, no distorted hands."

        ].join(" ")

    }

};

/* =========================================
   HELPERS
========================================= */

function hasApiKey() {

    return Boolean(
        process.env.MAGIC_HOUR_API_KEY
    );

}

function requireApiKey(res) {

    if (!hasApiKey()) {

        res.status(500).json({
            success: false,
            message:
                "MAGIC_HOUR_API_KEY is missing in .env"
        });

        return false;

    }

    return true;

}

function pick(value, allowed, fallback) {

    return allowed.includes(value)
        ? value
        : fallback;

}

function clampDuration(value, min, max, fallback) {

    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
        return fallback;
    }

    return Math.min(
        max,
        Math.max(min, Math.round(parsed))
    );

}

function validatePrompt(prompt) {

    return typeof prompt === "string" &&
        prompt.trim().length > 0;

}

function slugify(value) {

    return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40) || "video";

}

function buildOutputDir(prefix) {

    const stamp =
        new Date()
            .toISOString()
            .replace(/[:.]/g, "-")
            .slice(0, 19);

    const dir =
        path.join(
            OUTPUT_DIR,
            `${slugify(prefix)}-${stamp}`
        );

    fs.mkdirSync(dir, { recursive: true });

    return dir;

}

/*
   Upload a local file (or pass a URL /
   already-uploaded api-assets path through)
   and return a Magic Hour file path.
*/

async function uploadAsset(input) {

    if (!input) {
        return null;
    }

    if (
        typeof input === "string" &&
        (
            input.startsWith("http://") ||
            input.startsWith("https://") ||
            input.startsWith("api-assets")
        )
    ) {
        return input;
    }

    return await magicHour.v1.files.uploadFile(input);

}

/*
   Move an uploaded multer file into a
   predictable path with its real extension.
*/

function normalizeUpload(file) {

    if (!file) {
        return null;
    }

    const ext =
        path.extname(file.originalname || "") ||
        (file.mimetype === "image/png" ? ".png" : ".jpg");

    const target =
        path.join(
            UPLOAD_DIR,
            `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`
        );

    fs.renameSync(file.path, target);

    return {
        path: target,
        originalName: file.originalname,
        size: file.size
    };

}

function cleanupUploads(files) {

    (files || []).forEach(
        (file) => {
            try {
                if (file && file.path && fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            } catch (cleanupError) {
                console.log(
                    "Upload cleanup skipped:",
                    cleanupError.message
                );
            }
        }
    );

}

/*
   Take a completed Magic Hour result,
   download / copy the video into the
   output folder and build the response.
*/

function finalizeVideo({
    result,
    dir,
    meta
}) {

    let downloadedFile = null;

    if (
        result.downloadedPaths &&
        result.downloadedPaths.length > 0
    ) {
        downloadedFile =
            result.downloadedPaths[0];
    }

    const outputPath =
        path.join(dir, "video.mp4");

    if (downloadedFile) {

        if (
            path.resolve(downloadedFile) !==
            path.resolve(outputPath)
        ) {
            fs.copyFileSync(
                downloadedFile,
                outputPath
            );
        }

    } else {

        /*
           Nothing was downloaded locally —
           fall back to the remote URL.
        */

        const downloads =
            result.downloads || [];

        const remoteUrl =
            downloads.length > 0
                ? downloads[0].url
                : null;

        return {
            success: true,
            message:
                "Video generated successfully!",
            data: Object.assign(
                {
                    id: result.id || null,
                    status: result.status || "complete",
                    videoURL: remoteUrl,
                    creditsCharged:
                        result.creditsCharged || 0
                },
                meta
            )
        };

    }

    if (!fs.existsSync(outputPath)) {

        throw new Error(
            "Video was generated, but the output file was not found."
        );

    }

    const stats =
        fs.statSync(outputPath);

    const relative =
        path
            .relative(__dirname, outputPath)
            .split(path.sep)
            .join("/");

    return {
        success: true,
        message:
            "Video generated successfully!",
        data: Object.assign(
            {
                id: result.id || null,
                status: result.status || "complete",
                videoURL: `/${relative}`,
                file: outputPath,
                bytes: stats.size,
                creditsCharged:
                    result.creditsCharged || 0
            },
            meta
        )
    };

}

function errorMessage(error) {

    let message =
        error.message ||
        "Video generation failed.";

    const status =
        error.status || error.statusCode;

    if (status === 402) {
        message =
            "Magic Hour credits are not enough for this generation.";
    }

    if (status === 401 || status === 403) {
        message =
            "Magic Hour rejected the API key. Check MAGIC_HOUR_API_KEY in .env";
    }

    if (status === 429) {
        message =
            "Magic Hour rate limit reached. Try again in a moment.";
    }

    return message;

}

function logRequest(title, fields) {

    console.log("");
    console.log("================================");
    console.log(` ${title}`);
    console.log("================================");

    Object.entries(fields).forEach(
        ([key, value]) => {
            console.log(`${key}:`, value);
        }
    );

    console.log("================================");

}

/* =========================================
   FRONTEND
========================================= */

app.get("/", (req, res) => {

    res.sendFile(
        path.join(__dirname, "index.html")
    );

});

/* =========================================
   BACKEND STATUS
========================================= */

app.get("/api/status", (req, res) => {

    res.json({
        success: true,
        status: hasApiKey() ? "connected" : "missing-key",
        message: hasApiKey()
            ? "GS AI Studio backend is connected!"
            : "Backend is running, but MAGIC_HOUR_API_KEY is missing in .env",
        capabilities: {
            textToVideo: true,
            textToVideoWithReferences: true,
            imageToVideo: true,
            scenePresets: Object.keys(SCENE_PRESETS),
            offlineCinematicRender: fs.existsSync(
                path.join(SCENE_DIR, "build-video.js")
            )
        },
        models: {
            text: TEXT_MODELS,
            referenceText: REFERENCE_TEXT_MODELS,
            imageToVideo: IMAGE_TO_VIDEO_MODELS
        },
        aspectRatios: ASPECT_RATIOS,
        resolutions: RESOLUTIONS
    });

});

/* =========================================
   SCENE PRESETS
========================================= */

app.get("/api/presets", (req, res) => {

    res.json({
        success: true,
        presets: SCENE_PRESETS
    });

});

/* =========================================
   TEXT TO VIDEO
   (optionally with character reference
    images -> `references`)
========================================= */

app.post(
    "/api/generate",
    upload.array("references", 6),
    async (req, res) => {

        const files = req.files || [];

        try {

            /* -----------------------------------------
               READ INPUTS
               (JSON body or multipart form)
            ----------------------------------------- */

            const prompt = req.body.prompt;

            const duration = req.body.duration;

            const aspectRatio = req.body.aspectRatio;

            const model = req.body.model;

            const resolution = req.body.resolution;

            const audio =
                req.body.audio === true ||
                req.body.audio === "true";

            const referenceUrls =
                typeof req.body.referenceImage === "string"
                    ? [req.body.referenceImage]
                    : [];

            /* -----------------------------------------
               PROMPT CHECK
            ----------------------------------------- */

            if (!validatePrompt(prompt)) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Please enter a video prompt."
                });

            }

            if (!requireApiKey(res)) {
                return;
            }

            /* -----------------------------------------
               NORMALIZE OPTIONS
            ----------------------------------------- */

            const videoDuration =
                clampDuration(duration, 1, 15, 5);

            const videoAspectRatio =
                pick(aspectRatio, ASPECT_RATIOS, "16:9");

            const videoResolution =
                pick(resolution, RESOLUTIONS, "720p");

            /*
               Only reference-capable models
               may receive `references`.
            */

            const hasReferences =
                files.length > 0 ||
                referenceUrls.length > 0;

            const videoModel =
                hasReferences
                    ? pick(model, REFERENCE_TEXT_MODELS, "seedance-2.5")
                    : pick(model, TEXT_MODELS, "default");

            logRequest("GS AI VIDEO REQUEST", {
                Prompt: prompt,
                Duration: videoDuration,
                "Aspect Ratio": videoAspectRatio,
                Resolution: videoResolution,
                Model: videoModel,
                References: hasReferences
                    ? files.length + referenceUrls.length
                    : 0
            });

            /* -----------------------------------------
               UPLOAD REFERENCE IMAGES
            ----------------------------------------- */

            const references = [];

            for (const file of files) {

                const local = normalizeUpload(file);

                if (!local) continue;

                const filePath =
                    await uploadAsset(local.path);

                references.push({
                    filePath: filePath,
                    name: local.originalName || "character-reference"
                });

            }

            for (const url of referenceUrls) {

                const filePath =
                    await uploadAsset(url);

                references.push({
                    filePath: filePath,
                    name: "character-reference"
                });

            }

            /* -----------------------------------------
               MAGIC HOUR GENERATION
            ----------------------------------------- */

            const dir =
                buildOutputDir("text-to-video");

            const request = {
                endSeconds: videoDuration,
                aspectRatio: videoAspectRatio,
                model: videoModel,
                resolution: videoResolution,
                name: "GS AI Studio Video",
                audio: audio,
                style: {
                    prompt: prompt
                }
            };

            if (references.length > 0) {
                request.references = references;
            }

            console.log("Starting Magic Hour generation...");

            const result =
                await magicHour.v1.textToVideo.generate(
                    request,
                    {
                        waitForCompletion: true,
                        downloadOutputs: true,
                        downloadDirectory: dir
                    }
                );

            /* -----------------------------------------
               RESULT CHECK
            ----------------------------------------- */

            if (!result) {

                throw new Error(
                    "No response from Magic Hour."
                );

            }

            if (result.status === "error") {

                throw new Error(
                    result.error_message ||
                    result.error ||
                    "Magic Hour generation failed."
                );

            }

            const payload =
                finalizeVideo({
                    result: result,
                    dir: dir,
                    meta: {
                        mode: hasReferences
                            ? "text-to-video+references"
                            : "text-to-video",
                        model: videoModel,
                        duration: videoDuration,
                        aspectRatio: videoAspectRatio,
                        resolution: videoResolution,
                        references: references.length
                    }
                });

            console.log("");
            console.log("================================");
            console.log(" VIDEO READY ✅");
            console.log("================================");
            console.log("Video URL:", payload.data.videoURL);
            console.log("");

            return res.json(payload);

        } catch (error) {

            console.error("MAGIC HOUR ERROR", error);

            return res.status(500).json({
                success: false,
                message: errorMessage(error)
            });

        } finally {

            cleanupUploads(files);

        }

    }
);

/* =========================================
   IMAGE TO VIDEO
   Animate an uploaded character image.
========================================= */

app.post(
    "/api/image-to-video",
    upload.fields([
        { name: "image", maxCount: 1 },
        { name: "endImage", maxCount: 1 }
    ]),
    async (req, res) => {

        const uploaded = req.files || {};

        const allFiles = [
            ...(uploaded.image || []),
            ...(uploaded.endImage || [])
        ];

        try {

            const prompt =
                req.body.prompt;

            const duration =
                req.body.duration;

            const model =
                req.body.model;

            const resolution =
                req.body.resolution;

            const imageUrl =
                typeof req.body.imageFilePath === "string"
                    ? req.body.imageFilePath
                    : null;

            const endImageUrl =
                typeof req.body.endImageFilePath === "string"
                    ? req.body.endImageFilePath
                    : null;

            const audio =
                req.body.audio === true ||
                req.body.audio === "true";

            if (!validatePrompt(prompt)) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Please enter a video prompt."
                });

            }

            if (!requireApiKey(res)) {
                return;
            }

            const imageFile =
                (uploaded.image || [])[0];

            if (!imageFile && !imageUrl) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Please upload a character image (field name: image)."
                });

            }

            const videoDuration =
                clampDuration(duration, 1, 15, 10);

            const videoResolution =
                pick(resolution, RESOLUTIONS, "1080p");

            const videoModel =
                pick(model, IMAGE_TO_VIDEO_MODELS, "seedance-2.5");

            logRequest("GS AI IMAGE-TO-VIDEO REQUEST", {
                Prompt: prompt,
                Duration: videoDuration,
                Resolution: videoResolution,
                Model: videoModel,
                "Start Image": imageFile
                    ? imageFile.originalname
                    : imageUrl,
                "End Image": (uploaded.endImage || [])[0]
                    ? (uploaded.endImage || [])[0].originalname
                    : (endImageUrl || "none")
            });

            /* -----------------------------------------
               UPLOAD IMAGES
            ----------------------------------------- */

            const startLocal =
                normalizeUpload(imageFile);

            const endLocal =
                normalizeUpload((uploaded.endImage || [])[0]);

            const imageFilePath =
                await uploadAsset(
                    startLocal ? startLocal.path : imageUrl
                );

            const assets = {
                imageFilePath: imageFilePath
            };

            if (endLocal || endImageUrl) {

                assets.endImageFilePath =
                    await uploadAsset(
                        endLocal ? endLocal.path : endImageUrl
                    );

            }

            /* -----------------------------------------
               MAGIC HOUR GENERATION
            ----------------------------------------- */

            const dir =
                buildOutputDir("image-to-video");

            const result =
                await magicHour.v1.imageToVideo.generate(
                    {
                        assets: assets,
                        endSeconds: videoDuration,
                        model: videoModel,
                        resolution: videoResolution,
                        name: "GS AI Studio Image To Video",
                        audio: audio,
                        style: {
                            prompt: prompt
                        }
                    },
                    {
                        waitForCompletion: true,
                        downloadOutputs: true,
                        downloadDirectory: dir
                    }
                );

            if (!result) {

                throw new Error(
                    "No response from Magic Hour."
                );

            }

            if (result.status === "error") {

                throw new Error(
                    result.error_message ||
                    result.error ||
                    "Magic Hour generation failed."
                );

            }

            const payload =
                finalizeVideo({
                    result: result,
                    dir: dir,
                    meta: {
                        mode: "image-to-video",
                        model: videoModel,
                        duration: videoDuration,
                        resolution: videoResolution
                    }
                });

            console.log("");
            console.log("================================");
            console.log(" VIDEO READY ✅");
            console.log("================================");
            console.log("");

            return res.json(payload);

        } catch (error) {

            console.error("MAGIC HOUR ERROR", error);

            return res.status(500).json({
                success: false,
                message: errorMessage(error)
            });

        } finally {

            cleanupUploads(allFiles);

        }

    }
);

/* =========================================
   SCENE GENERATION
   One-shot preset (magical golden door).
   Accepts an optional character reference
   image so the girl stays consistent.
========================================= */

app.post(
    "/api/scene/:sceneId",
    upload.array("references", 6),
    async (req, res) => {

        const files = req.files || [];

        try {

            const sceneId = req.params.sceneId;

            const preset =
                SCENE_PRESETS[sceneId];

            if (!preset) {

                return res.status(404).json({
                    success: false,
                    message:
                        `Unknown scene preset: ${sceneId}`
                });

            }

            if (!requireApiKey(res)) {
                return;
            }

            const prompt =
                validatePrompt(req.body.prompt)
                    ? req.body.prompt
                    : preset.prompt;

            const videoDuration =
                clampDuration(
                    req.body.duration,
                    1,
                    15,
                    preset.duration
                );

            const videoAspectRatio =
                pick(req.body.aspectRatio, ASPECT_RATIOS, preset.aspectRatio);

            const videoResolution =
                pick(req.body.resolution, RESOLUTIONS, preset.resolution);

            const videoModel =
                pick(req.body.model, REFERENCE_TEXT_MODELS, preset.model);

            logRequest(`GS AI SCENE: ${sceneId}`, {
                Duration: videoDuration,
                "Aspect Ratio": videoAspectRatio,
                Resolution: videoResolution,
                Model: videoModel,
                "Reference Images": files.length
            });

            const references = [];

            for (let index = 0; index < files.length; index++) {

                const local = normalizeUpload(files[index]);

                if (!local) continue;

                /*
                   Keep a copy of the first reference
                   image inside the scene folder so the
                   offline ffmpeg renderer uses the
                   exact same character reference.
                */

                if (index === 0) {

                    try {

                        const target =
                            path.join(
                                REFERENCE_DIR,
                                `character${path.extname(local.path) || ".png"}`
                            );

                        fs.copyFileSync(local.path, target);

                        console.log(
                            "Character reference saved:",
                            target
                        );

                    } catch (saveError) {

                        console.log(
                            "Reference save skipped:",
                            saveError.message
                        );

                    }

                }

                references.push({
                    filePath: await uploadAsset(local.path),
                    name: local.originalName || "character-reference"
                });

            }

            const dir =
                buildOutputDir(sceneId);

            const request = {
                endSeconds: videoDuration,
                aspectRatio: videoAspectRatio,
                orientation: preset.orientation,
                model: videoModel,
                resolution: videoResolution,
                name: `GS AI Studio - ${preset.name}`,
                style: {
                    prompt: prompt
                }
            };

            if (references.length > 0) {
                request.references = references;
            }

            const result =
                await magicHour.v1.textToVideo.generate(
                    request,
                    {
                        waitForCompletion: true,
                        downloadOutputs: true,
                        downloadDirectory: dir
                    }
                );

            if (!result) {

                throw new Error(
                    "No response from Magic Hour."
                );

            }

            if (result.status === "error") {

                throw new Error(
                    result.error_message ||
                    result.error ||
                    "Magic Hour generation failed."
                );

            }

            const payload =
                finalizeVideo({
                    result: result,
                    dir: dir,
                    meta: {
                        mode: "scene-preset",
                        scene: sceneId,
                        model: videoModel,
                        duration: videoDuration,
                        aspectRatio: videoAspectRatio,
                        resolution: videoResolution,
                        references: references.length
                    }
                });

            return res.json(payload);

        } catch (error) {

            console.error("MAGIC HOUR ERROR", error);

            return res.status(500).json({
                success: false,
                message: errorMessage(error)
            });

        } finally {

            cleanupUploads(files);

        }

    }
);

/* =========================================
   OFFLINE CINEMATIC RENDER
   Builds the 10s 9:16 magical-door video from
   local keyframes with ffmpeg. No API key or
   credits needed.
========================================= */

app.post("/api/render/local", async (req, res) => {

    const builderPath =
        path.join(SCENE_DIR, "build-video.js");

    if (!fs.existsSync(builderPath)) {

        return res.status(500).json({
            success: false,
            message:
                "magical-door-scene/build-video.js is missing."
        });

    }

    const keyframes =
        fs
            .readdirSync(KEYFRAME_DIR)
            .filter(
                (file) => /\.(png|jpe?g|webp)$/i.test(file)
            )
            .sort();

    if (keyframes.length === 0) {

        return res.status(400).json({
            success: false,
            message:
                "No keyframes found in magical-door-scene/assets/keyframes. Generate them first."
        });

    }

    logRequest("GS AI OFFLINE CINEMATIC RENDER", {
        Keyframes: keyframes.length,
        Builder: builderPath
    });

    execFile(
        process.execPath,
        [builderPath],
        {
            cwd: SCENE_DIR,
            timeout: 20 * 60 * 1000,
            maxBuffer: 10 * 1024 * 1024,
            env: Object.assign({}, process.env, {
                GS_FFMPEG: process.env.GS_FFMPEG || ""
            })
        },
        (error, stdout, stderr) => {

            console.log(stdout);

            if (stderr) {
                console.error(stderr);
            }

            if (error) {

                return res.status(500).json({
                    success: false,
                    message:
                        error.message ||
                        "Local cinematic render failed.",
                    logs: String(stderr || "").slice(-2000)
                });

            }

            const output =
                path.join(SCENE_DIR, "output", "magical-door-10s-9x16.mp4");

            if (!fs.existsSync(output)) {

                return res.status(500).json({
                    success: false,
                    message:
                        "Render finished but the MP4 was not found."
                });

            }

            const relative =
                path
                    .relative(__dirname, output)
                    .split(path.sep)
                    .join("/");

            return res.json({
                success: true,
                message:
                    "Offline cinematic render complete!",
                data: {
                    mode: "offline-cinematic",
                    keyframes: keyframes.length,
                    duration: 10,
                    aspectRatio: "9:16",
                    bytes: fs.statSync(output).size,
                    videoURL: `/${relative}`,
                    file: output
                }
            });

        }
    );

});

/* =========================================
   OUTPUTS + SCENE ASSETS
========================================= */

app.use(
    "/output",
    express.static(OUTPUT_DIR)
);

app.use(
    "/magical-door-scene/assets",
    express.static(path.join(SCENE_DIR, "assets"))
);

/* =========================================
   SERVER
========================================= */

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log("");
        console.log("================================");
        console.log(" GS AI STUDIO SERVER");
        console.log("================================");
        console.log(`Server running at http://localhost:${PORT}`);
        console.log(
            "Magic Hour:",
            hasApiKey() ? "ENABLED" : "MISSING API KEY"
        );
        console.log("Video output: /output");
        console.log("================================");
        console.log("");

    }
);

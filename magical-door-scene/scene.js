/* =========================================
   MAGICAL GOLDEN DOOR
   Scene definition (10s / 9:16 / cinematic)

   Each keyframe is one generated still that
   keeps the character identical to the
   reference image. build-video.js turns these
   stills into a real MP4 with animated camera
   moves, magical light and drifting sparkles.
========================================= */

const SCENE = {

    id: "magical-door",

    name: "Magical Golden Door",

    /* -----------------------------------------
       OUTPUT
    ----------------------------------------- */

    width: 1080,

    height: 1920,

    fps: 30,

    /*
       Target length. build-video.js derives the
       real timeline from the shots and the
       cross-dissolve overlaps, and warns if the
       two drift apart.
    */

    targetDuration: 10,

    /* -----------------------------------------
       RENDER CANVAS
       Keyframes are upscaled to this size before
       the camera move, so push-ins never lose
       detail. 1.5x the output frame.
    ----------------------------------------- */

    canvasScale: 1.3,

    /* -----------------------------------------
       GLOBAL STYLE BLOCK
       Appended to every keyframe prompt so all
       stills share one look and one character.
    ----------------------------------------- */

    characterLock: [

        "The exact same character as the reference image:",

        "a cute little girl with big brown eyes,",

        "pink curly hair,",

        "a pink hair bow,",

        "a pink sparkly dress,",

        "identical face, identical hairstyle, identical bow,",

        "identical dress, identical body proportions,",

        "correct hands with five fingers, no distortion."

    ].join(" "),

    styleLock: [

        "High-quality 3D animated movie style,",

        "vertical 9:16 portrait composition,",

        "warm pastel magical playroom filled with soft toys and fairy lights,",

        "cute, dreamy, colorful, soft lighting, polished details,",

        "cinematic soft depth of field, gentle volumetric light,",

        "magical golden sparkles floating in the air.",

        "No text, no subtitles, no captions, no logos,",

        "no watermark, no signature, no border,",

        "no extra characters, no character changes."

    ].join(" "),

    /* -----------------------------------------
       SHOTS
       Each shot overlaps its neighbour by the
       matching transition duration, so the
       rendered timeline is:

         sum(shots) - sum(transitions) = 10.0s
    ----------------------------------------- */

    shots: [

        {

            id: "01-playroom",

            duration: 2.40,

            prompt: [

                "Wide establishing shot, full body.",

                "The little girl stands in the center of the playroom,",

                "looking slightly to her right with a soft calm smile,",

                "hands relaxed at her sides.",

                "Behind her: plush toys, pastel blocks, a small rocking horse,",

                "warm fairy lights strung across the wall,",

                "a plain pastel wall in front of her with no door yet.",

                "Camera at her eye level, centered, medium-wide framing",

                "with head room and floor visible."

            ].join(" "),

            camera: {
                zoomFrom: 1.0,
                zoomTo: 1.08,
                driftY: -0.01,
                ease: "inOut"
            }

        },

        {

            id: "02-door-appears",

            duration: 2.20,

            prompt: [

                "Same playroom, same framing, one moment later.",

                "A tiny glowing golden door has just appeared on the wall",

                "in front of her, about knee height,",

                "ornate golden frame, warm light leaking around its edges,",

                "small golden sparkles drifting out of the seam.",

                "The girl's eyes are wide with surprise,",

                "mouth slightly open, hands lifted a little,",

                "body turned toward the glowing door.",

                "Camera at her eye level, medium-wide framing."

            ].join(" "),

            camera: {
                zoomFrom: 1.04,
                zoomTo: 1.12,
                driftY: 0.01,
                ease: "inOut"
            }

        },

        {

            id: "03-walking-closer",

            duration: 2.05,

            prompt: [

                "Medium shot, camera closer, slightly lower angle.",

                "The girl is mid-step walking toward the tiny golden door",

                "on the wall in front of her,",

                "one foot forward, sparkly pink dress swaying gently,",

                "expression excited and curious, warm smile,",

                "the golden door glowing brighter,",

                "fairy lights softly blurred behind her,",

                "plush toys out of focus in the background.",

                "Camera at her chest height, she fills the middle of the frame."

            ].join(" "),

            camera: {
                zoomFrom: 1.02,
                zoomTo: 1.16,
                driftY: 0.02,
                ease: "in"
            }

        },

        {

            id: "04-reach-and-open",

            duration: 1.85,

            prompt: [

                "Close-up over-the-shoulder shot.",

                "Her small hand reaches out and touches the tiny golden door,",

                "the door is just cracking open,",

                "a brilliant beam of warm colorful magical light",

                "spilling out around the edges and across her fingers,",

                "her face turned toward the light in three-quarter profile,",

                "eyes sparkling, lips parted in wonder,",

                "glowing dust motes in the light beam,",

                "very shallow depth of field, background melted into soft bokeh."

            ].join(" "),

            camera: {
                zoomFrom: 1.0,
                zoomTo: 1.14,
                driftY: -0.015,
                ease: "inOut"
            }

        },

        {

            id: "05-fantasy-world-revealed",

            duration: 1.95,

            prompt: [

                "The tiny golden door is now fully open.",

                "Inside it: a beautiful miniature fantasy world —",

                "glowing flowers, floating butterflies, sparkling particles,",

                "tiny waterfalls of light, candy-colored hills,",

                "bright colorful magical light shining out of the doorway",

                "and washing over the girl's face and dress.",

                "She is seen from behind and slightly to the side,",

                "silhouetted with a warm golden rim light,",

                "head tilted up in wonder.",

                "Camera just behind her shoulder, push-in framing,",

                "the open golden door is the bright focal point."

            ].join(" "),

            camera: {
                zoomFrom: 1.02,
                zoomTo: 1.2,
                driftY: -0.02,
                ease: "out"
            }

        },

        {

            id: "06-step-toward-wonder",

            duration: 2.35,

            prompt: [

                "Final shot, tighter framing.",

                "The girl smiles with pure wonder and takes one small step",

                "toward the open golden door and the miniature fantasy world",

                "glowing inside it,",

                "one foot lifted in a small step forward,",

                "warm magical light bathing her face, hair and sparkly pink dress,",

                "glowing flowers and floating butterflies visible in the doorway,",

                "golden sparkles swirling around her.",

                "Camera at her eye level, medium close-up,",

                "she is centered, the glowing door in front of her.",

                "Soft dreamy bloom, cinematic depth of field."

            ].join(" "),

            camera: {
                zoomFrom: 1.06,
                zoomTo: 1.22,
                driftY: -0.025,
                ease: "out"
            }

        }

    ],

    /* -----------------------------------------
       TRANSITIONS
    ----------------------------------------- */

    transitions: [

        /* between shot 1 and 2 */
        { type: "fade", duration: 0.6 },

        /* between shot 2 and 3 */
        { type: "fade", duration: 0.5 },

        /* between shot 3 and 4 */
        { type: "fade", duration: 0.45 },

        /* the magical reveal — white bloom */
        { type: "fadewhite", duration: 0.7 },

        /* between shot 5 and 6 */
        { type: "fade", duration: 0.55 }

    ],

    /* -----------------------------------------
       MAGICAL LIGHT
       A warm golden bloom that grows as the door
       opens and peaks at the reveal.
       x / y are fractions of the frame.
    ----------------------------------------- */

    glow: {

        x: 0.5,

        y: 0.44,

        radius: 0.75,

        keyframes: [

            { time: 0.0, opacity: 0.1 },
            { time: 2.2, opacity: 0.16 },
            { time: 3.6, opacity: 0.3 },
            { time: 5.4, opacity: 0.45 },
            { time: 6.8, opacity: 1.0 },
            { time: 7.6, opacity: 0.7 },
            { time: 10.0, opacity: 0.55 }

        ]

    },

    /* -----------------------------------------
       SPARKLES
       Three parallax particle layers that drift
       upward and twinkle. `screen` blended.
    ----------------------------------------- */

    sparkles: {

        layers: [

            { name: "far", count: 90, minRadius: 1.2, maxRadius: 3.0, speed: 26, opacity: 0.5, twinkleHz: 0.7 },
            { name: "mid", count: 55, minRadius: 2.4, maxRadius: 5.5, speed: 48, opacity: 0.7, twinkleHz: 1.1 },
            { name: "near", count: 26, minRadius: 5.0, maxRadius: 11.0, speed: 82, opacity: 0.85, twinkleHz: 1.6 }

        ],

        /* boost sparkle density once the door opens */
        boost: { from: 5.6, to: 10.0, strength: 0.45 }

    },

    /* -----------------------------------------
       CINEMATIC GRADE
    ----------------------------------------- */

    grade: {

        saturation: 1.09,

        warmth: 0.045,

        vignette: 0.34,

        /* dreamy soft-focus bloom: blur amount in px */
        softFocus: 9,

        softFocusMix: 0.26,

        grain: 5

    }

};

module.exports = SCENE;

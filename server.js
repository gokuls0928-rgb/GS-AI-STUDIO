const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const { Client } = require("magic-hour");

const app = express();
const PORT = process.env.PORT || 3000;

/* =========================================
   MAGIC HOUR CLIENT
========================================= */

const magicHour = new Client({
    token: process.env.MAGIC_HOUR_API_KEY
});


/* =========================================
   MIDDLEWARE
========================================= */

app.use(cors());

app.use(
    express.json({
        limit: "10mb"
    })
);


/* =========================================
   FRONTEND
========================================= */

app.use(express.static(__dirname));


/*
   IMPORTANT:
   output.mp4 will be available at:

   http://localhost:3000/output/output.mp4
*/

app.use(
    "/output",
    express.static(__dirname)
);


app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "index.html"
        )
    );

});


/* =========================================
   BACKEND STATUS
========================================= */

app.get("/api/status", (req, res) => {

    res.json({

        success: true,

        status: "connected",

        message:
            "GS AI Studio backend is connected!"

    });

});


/* =========================================
   VIDEO GENERATION
========================================= */

app.post(
    "/api/generate",
    async (req, res) => {

        const {
            prompt,
            duration,
            aspectRatio
        } = req.body;


        /* -----------------------------------------
           PROMPT CHECK
        ----------------------------------------- */

        if (
            !prompt ||
            !prompt.trim()
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Please enter a video prompt."

            });

        }


        /* -----------------------------------------
           API KEY CHECK
        ----------------------------------------- */

        if (
            !process.env.MAGIC_HOUR_API_KEY
        ) {

            return res.status(500).json({

                success: false,

                message:
                    "MAGIC_HOUR_API_KEY is missing in .env"

            });

        }


        try {

            console.log("");

            console.log(
                "================================"
            );

            console.log(
                " GS AI VIDEO REQUEST"
            );

            console.log(
                "================================"
            );

            console.log(
                "Prompt:",
                prompt
            );

            console.log(
                "Duration:",
                duration
            );

            console.log(
                "Aspect Ratio:",
                aspectRatio
            );

            console.log(
                "================================"
            );


            /* -----------------------------------------
               DURATION
            ----------------------------------------- */

            let videoDuration =
                Number(duration) || 5;


            /*
               Keep duration safe.
            */

            if (videoDuration < 1) {
                videoDuration = 5;
            }


            if (videoDuration > 10) {
                videoDuration = 10;
            }


            /* -----------------------------------------
               ASPECT RATIO
            ----------------------------------------- */

            let videoAspectRatio =
                aspectRatio || "16:9";


            if (
                ![
                    "16:9",
                    "9:16",
                    "1:1"
                ].includes(
                    videoAspectRatio
                )
            ) {

                videoAspectRatio =
                    "16:9";

            }


            /* -----------------------------------------
               DELETE OLD OUTPUT
            ----------------------------------------- */

            const fs =
                require("fs");


            const outputPath =
                path.join(
                    __dirname,
                    "output.mp4"
                );


            try {

                if (
                    fs.existsSync(
                        outputPath
                    )
                ) {

                    fs.unlinkSync(
                        outputPath
                    );

                    console.log(
                        "Old output.mp4 deleted."
                    );

                }

            } catch (deleteError) {

                console.log(
                    "Old output delete skipped:",
                    deleteError.message
                );

            }


            /* -----------------------------------------
               MAGIC HOUR GENERATION
            ----------------------------------------- */

            console.log("");

            console.log(
                "Starting Magic Hour generation..."
            );


            const result =
                await magicHour.v1.textToVideo.generate({

                    endSeconds:
                        videoDuration,

                    aspectRatio:
                        videoAspectRatio,

                    model:
                        "ltx-2.3",

                    resolution:
                        "480p",

                    name:
                        "GS AI Studio Video",

                    style: {

                        prompt:
                            prompt

                    },

                    waitForCompletion:
                        true

                });


            console.log("");

            console.log(
                "Magic Hour result:",
                result
            );


            /* -----------------------------------------
               RESULT CHECK
            ----------------------------------------- */

            if (!result) {

                throw new Error(
                    "No response from Magic Hour."
                );

            }


            if (
                result.status === "error"
            ) {

                throw new Error(

                    result.error_message ||
                    result.error ||
                    "Magic Hour generation failed."

                );

            }


            /* -----------------------------------------
               CHECK DOWNLOADED FILE
            ----------------------------------------- */

            let downloadedFile =
                null;


            if (
                result.downloadedPaths &&
                result.downloadedPaths.length > 0
            ) {

                downloadedFile =
                    result.downloadedPaths[0];

            }


            console.log("");

            console.log(
                "Downloaded file:",
                downloadedFile
            );


            /* -----------------------------------------
               COPY / RENAME OUTPUT
            ----------------------------------------- */

            if (downloadedFile) {

                try {

                    if (
                        path.resolve(
                            downloadedFile
                        ) !==
                        path.resolve(
                            outputPath
                        )
                    ) {

                        fs.copyFileSync(
                            downloadedFile,
                            outputPath
                        );

                    }


                    console.log(
                        "Video copied to:"
                    );

                    console.log(
                        outputPath
                    );


                } catch (copyError) {

                    console.error(
                        "Video copy error:",
                        copyError
                    );

                    throw new Error(
                        "Video generated but could not prepare output.mp4"
                    );

                }

            }


            /* -----------------------------------------
               VERIFY OUTPUT FILE
            ----------------------------------------- */

            if (
                !fs.existsSync(
                    outputPath
                )
            ) {

                throw new Error(
                    "Video was generated, but output.mp4 was not found."
                );

            }


            const fileStats =
                fs.statSync(
                    outputPath
                );


            console.log("");

            console.log(
                "Output file size:",
                fileStats.size,
                "bytes"
            );


            /* -----------------------------------------
               VIDEO URL
            ----------------------------------------- */

            const videoURL =
                "/output/output.mp4";


            console.log("");

            console.log(
                "Video URL:",
                videoURL
            );


            console.log("");

            console.log(
                "================================"
            );

            console.log(
                " VIDEO READY ✅"
            );

            console.log(
                "================================"
            );

            console.log("");


            /* -----------------------------------------
               SEND SUCCESS RESPONSE
            ----------------------------------------- */

            return res.json({

                success: true,

                message:
                    "Video generated successfully!",

                data: {

                    id:
                        result.id || null,

                    status:
                        result.status ||
                        "complete",

                    duration:
                        videoDuration,

                    aspectRatio:
                        videoAspectRatio,

                    videoURL:
                        videoURL,

                    creditsCharged:
                        result.creditsCharged ||
                        0

                }

            });


        } catch (error) {

            console.log("");

            console.error(
                "================================"
            );

            console.error(
                " MAGIC HOUR ERROR"
            );

            console.error(
                "================================"
            );

            console.error(error);

            console.error("");


            let message =
                error.message ||
                "Video generation failed.";


            /* -----------------------------------------
               CREDIT ERROR
            ----------------------------------------- */

            if (
                error.status === 402 ||
                error.statusCode === 402
            ) {

                message =
                    "Magic Hour credits are not enough for this generation.";

            }


            /* -----------------------------------------
               ERROR RESPONSE
            ----------------------------------------- */

            return res.status(500).json({

                success: false,

                message:
                    message

            });

        }

    }
);


/* =========================================
   SERVER
========================================= */

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log("");

        console.log(
            "================================"
        );

        console.log(
            " GS AI STUDIO SERVER"
        );

        console.log(
            "================================"
        );

        console.log(
            `Server running at http://localhost:${PORT}`
        );

        console.log(
            "Magic Hour: ENABLED"
        );

        console.log(
            "Video output: /output/output.mp4"
        );

        console.log(
            "================================"
        );

        console.log("");

    }
);
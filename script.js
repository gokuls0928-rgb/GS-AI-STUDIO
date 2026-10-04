/* =========================================
   GS AI STUDIO
   MAIN SCRIPT
========================================= */


/* =========================================
   BACKEND URL
========================================= */

/*
   Relative by default so the browser talks to the
   SAME origin that served the page. That keeps the
   app working behind a dev preview proxy, on Render,
   and on localhost without any CORS surprises.

   To point at a remote backend instead, set
   window.GS_API_URL before script.js loads, e.g.:

       <script>window.GS_API_URL = "https://my-backend.onrender.com";</script>
*/

const API_URL =
    (typeof window !== "undefined" && window.GS_API_URL)
        ? String(window.GS_API_URL).replace(/\/+$/, "")
        : "";


let credits = 100;
let uploadedFile = null;


/* =========================================
   DOM READY
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "%c GS AI STUDIO 🚀 ",
            "background:#8b5cf6;color:white;padding:8px;border-radius:6px;font-weight:bold;"
        );

        console.log(
            "GS AI Studio loaded 🚀"
        );


        updateCredits();

        setupNavigation();

        setupMobileNavigation();

        setupStartButton();

        setupBackButtons();

        setupPromptCounter();

        setupUpload();

        setupModeControls();

        setupSceneButtons();

        setupGenerateButton();

        setupEditorButtons();

        setupModal();

        checkBackend();

    }
);


/* =========================================
   CREDIT SYSTEM
========================================= */

function updateCredits() {

    document
        .querySelectorAll(".credit-count")
        .forEach(element => {

            element.textContent =
                credits;

        });

}


/* =========================================
   BACKEND CHECK
========================================= */

async function checkBackend() {

    try {

        console.log(
            "Checking backend... 🚀"
        );


        const response =
            await fetch(
                `${API_URL}/api/status`,
                {
                    method: "GET"
                }
            );


        console.log(
            "Backend status:",
            response.status
        );


        if (!response.ok) {

            throw new Error(
                "Backend unavailable"
            );

        }


        const data =
            await response.json();


        console.log(
            "Backend response:",
            data
        );


        backendStatus = data;

        applyBackendCapabilities(data);

        if (data.status === "missing-key") {

            showToast(
                "Backend is up but MAGIC_HOUR_API_KEY is missing — the offline ffmpeg render still works 🎞️"
            );

        }
        else {

            showToast(
                "GS AI backend connected ✅"
            );

        }

    }
    catch (error) {

        console.error(
            "Backend error:",
            error
        );


        showToast(
            "Backend not connected ❌"
        );

    }

}


function applyBackendCapabilities(data) {

    const modelSelect =
        document.getElementById(
            "modelSelect"
        );


    if (
        !modelSelect ||
        !data.models
    ) {
        return;
    }


    const wanted = modelSelect.value;


    const groups = [
        ["Character reference models", data.models.referenceText],
        ["Image to video models", data.models.imageToVideo],
        ["Text to video models", data.models.text]
    ];


    modelSelect.innerHTML = "";


    groups.forEach(
        ([label, models]) => {

            if (!models || !models.length) {
                return;
            }

            const group =
                document.createElement("optgroup");

            group.label = label;

            models.forEach(
                (name) => {

                    const option =
                        document.createElement("option");

                    option.value = name;
                    option.textContent = name;
                    group.appendChild(option);

                }
            );

            modelSelect.appendChild(group);

        }
    );


    modelSelect.value = wanted;

}


/* =========================================
   NAVIGATION
========================================= */

function setupNavigation() {

    document
        .querySelectorAll(
            "[data-page]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const page =
                        button.dataset.page;


                    if (page) {

                        showPage(page);

                    }

                }
            );

        });

}


function showPage(pageName) {

    document
        .querySelectorAll(
            ".page"
        )
        .forEach(page => {

            page.classList.add(
                "hidden"
            );

        });


    const target =
        document.getElementById(
            pageName
        );


    if (target) {

        target.classList.remove(
            "hidden"
        );

    }


    document
        .querySelectorAll(
            "[data-page]"
        )
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.page ===
                pageName
            );

        });


    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}


/* =========================================
   START BUTTON
========================================= */

function setupStartButton() {

    document
        .querySelectorAll(
            ".start-btn"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    showPage(
                        "creator"
                    );

                }
            );

        });

}


/* =========================================
   BACK BUTTON
========================================= */

function setupBackButtons() {

    document
        .querySelectorAll(
            ".back-btn, .back-editor-btn"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    showPage(
                        "home"
                    );

                }
            );

        });

}


/* =========================================
   MOBILE NAVIGATION
========================================= */

function setupMobileNavigation() {

    document
        .querySelectorAll(
            ".mobile-nav button"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const page =
                        button.dataset.page;


                    if (page) {

                        showPage(page);

                    }

                }
            );

        });

}


/* =========================================
   TOOL CARDS
========================================= */

document.addEventListener(
    "click",
    event => {

        const card =
            event.target.closest(
                ".tool-card"
            );


        if (!card) return;


        const tool =
            card.dataset.tool;


        if (!tool) return;


        if (
            tool === "Text to Video"
        ) {

            showPage(
                "creator"
            );

        }
        else if (
            tool === "Text to Image"
        ) {

            showPage(
                "image"
            );

        }
        else if (
            tool === "AI Playground"
        ) {

            showPage(
                "playground"
            );

        }
        else if (
            tool === "Model Hub"
        ) {

            showPage(
                "models"
            );

        }

    }
);


/* =========================================
   PROMPT COUNTER
========================================= */

function setupPromptCounter() {

    const textarea =
        document.getElementById(
            "prompt"
        );


    const counter =
        document.getElementById(
            "promptCount"
        );


    if (!textarea) {

        console.warn(
            "Prompt textarea not found."
        );

        return;

    }


    function updateCounter() {

        if (counter) {

            counter.textContent =
                `${textarea.value.length}/1000`;

        }

    }


    textarea.addEventListener(
        "input",
        updateCounter
    );


    updateCounter();

}


/* =========================================
   FILE UPLOAD
========================================= */

function setupUpload() {

    const uploadArea =
        document.querySelector(
            ".upload-area"
        );


    const fileInput =
        document.getElementById(
            "fileInput"
        );


    if (
        !uploadArea ||
        !fileInput
    ) {

        return;

    }


    uploadArea.addEventListener(
        "click",
        event => {

            if (
                event.target.closest(
                    ".remove-file-btn"
                )
            ) {

                return;

            }


            fileInput.click();

        }
    );


    fileInput.addEventListener(
        "change",
        event => {

            const file =
                event.target.files[0];


            if (!file) return;


            handleFile(file);

        }
    );

}


function handleFile(file) {

    uploadedFile = file;


    console.log(
        "Uploaded:",
        file.name
    );


    const uploadArea =
        document.querySelector(
            ".upload-area"
        );


    if (!uploadArea) return;


    const url =
        URL.createObjectURL(
            file
        );


    const isVideo =
        file.type.startsWith(
            "video/"
        );


    uploadArea.innerHTML = `

        <div class="upload-preview">

            ${
                isVideo
                ?
                `
                <video
                    src="${url}"
                    controls
                    playsinline
                    style="max-width:100%;">
                </video>
                `
                :
                `
                <img
                    src="${url}"
                    alt="Uploaded file"
                    style="max-width:100%;">
                `
            }

            <div class="upload-file-name">

                ${escapeHTML(
                    file.name
                )}

            </div>

            <div class="upload-file-size">

                ${formatFileSize(
                    file.size
                )}

            </div>

            <button
                type="button"
                class="remove-file-btn"
                id="removeFileBtn">

                Remove File

            </button>

        </div>

    `;


    const removeButton =
        document.getElementById(
            "removeFileBtn"
        );


    if (removeButton) {

        removeButton.addEventListener(
            "click",
            removeUploadedFile
        );

    }

}


function removeUploadedFile(event) {

    event.stopPropagation();


    uploadedFile = null;


    const fileInput =
        document.getElementById(
            "fileInput"
        );


    if (fileInput) {

        fileInput.value = "";

    }


    const uploadArea =
        document.querySelector(
            ".upload-area"
        );


    if (uploadArea) {

        uploadArea.innerHTML = `

            <div>

                📁

                <p>
                    Click to upload
                </p>

                <small>
                    Image or video
                </small>

            </div>

        `;

    }


    updateUploadHint();

}


/* =========================================
   GENERATION MODE CONTROLS
========================================= */

let backendStatus = null;


function setupModeControls() {

    const modeSelect =
        document.getElementById(
            "genMode"
        );


    if (!modeSelect) {
        return;
    }


    modeSelect.addEventListener(
        "change",
        () => updateUploadHint()
    );


    updateUploadHint();

}


function currentMode() {

    const modeSelect =
        document.getElementById(
            "genMode"
        );


    return modeSelect
        ? modeSelect.value
        : "text";

}


function updateUploadHint() {

    const mode = currentMode();


    const fileInput =
        document.getElementById(
            "fileInput"
        );


    if (fileInput) {

        fileInput.accept =
            mode === "imageToVideo"
                ? "image/*,video/*"
                : "image/*";

    }


    const hint =
        document.querySelector(
            ".upload-area small"
        );


    if (hint && !uploadedFile) {

        hint.textContent =
            mode === "text"
                ? "Optional reference image"
                : mode === "reference"
                    ? "Character reference image (keeps her identical)"
                    : "The still image to animate";

    }

}


/* =========================================
   SCENE PRESET + OFFLINE RENDER BUTTONS
========================================= */

function setupSceneButtons() {

    const loadBtn =
        document.getElementById(
            "loadMagicalDoorBtn"
        );


    if (loadBtn) {

        loadBtn.addEventListener(
            "click",
            loadMagicalDoorPreset
        );

    }


    const renderBtn =
        document.getElementById(
            "renderLocalBtn"
        );


    if (renderBtn) {

        renderBtn.addEventListener(
            "click",
            renderOfflineCinematic
        );

    }

}


async function loadMagicalDoorPreset() {

    try {

        const response =
            await fetch(
                `${API_URL}/api/presets`
            );


        const data =
            await response.json();


        const preset =
            data.presets &&
            data.presets["magical-door"];


        if (!preset) {

            throw new Error(
                "Preset not found."
            );

        }


        const promptInput =
            document.getElementById(
                "prompt"
            );

        const durationInput =
            document.getElementById(
                "duration"
            );

        const aspectInput =
            document.getElementById(
                "aspectRatio"
            );

        const resolutionInput =
            document.getElementById(
                "resolution"
            );

        const modelInput =
            document.getElementById(
                "modelSelect"
            );

        const modeInput =
            document.getElementById(
                "genMode"
            );


        if (promptInput) {
            promptInput.value = preset.prompt;
            promptInput.dispatchEvent(
                new Event("input")
            );
        }

        if (durationInput) durationInput.value = String(preset.duration);
        if (aspectInput) aspectInput.value = preset.aspectRatio;
        if (resolutionInput) resolutionInput.value = preset.resolution;
        if (modelInput) modelInput.value = preset.model;
        if (modeInput) {
            modeInput.value = "reference";
            updateUploadHint();
        }


        showToast(
            "Magical Golden Door scene loaded ✨ upload her reference image, then generate!"
        );

    }
    catch (error) {

        console.error(error);

        showToast(
            error.message ||
            "Could not load the scene preset ❌"
        );

    }

}


async function renderOfflineCinematic() {

    const button =
        document.getElementById(
            "renderLocalBtn"
        );


    if (button) {
        button.disabled = true;
        button.dataset.oldText = button.innerHTML;
        button.innerHTML = "Rendering... ⏳";
    }


    showLoading();


    try {

        const response =
            await fetch(
                `${API_URL}/api/render/local`,
                {
                    method: "POST"
                }
            );


        const data =
            await response.json();


        if (!response.ok || !data.success) {

            throw new Error(
                data.message ||
                "Offline render failed."
            );

        }


        hideLoading();

        showResult(data);

        showToast(
            "Offline cinematic render complete! 🎞️"
        );

    }
    catch (error) {

        console.error(error);

        hideLoading();

        showToast(
            error.message ||
            "Offline render failed ❌"
        );

    }
    finally {

        if (button) {
            button.disabled = false;
            button.innerHTML =
                button.dataset.oldText ||
                button.innerHTML;
        }

    }

}


/* =========================================
   GENERATE BUTTON
========================================= */

function setupGenerateButton() {

    const button =
        document.getElementById(
            "generateVideoBtn"
        );


    if (!button) {

        console.error(
            "Generate button NOT FOUND ❌"
        );

        return;

    }


    console.log(
        "Generate button connected ✅"
    );


    button.addEventListener(
        "click",
        event => {

            event.preventDefault();

            console.log(
                "GENERATE BUTTON CLICKED ✅"
            );


            generateVideo();

        }
    );

}


/* =========================================
   GENERATE VIDEO
========================================= */

async function generateVideo() {

    console.log(
        "generateVideo() started 🚀"
    );


    /* -----------------------------------------
       GET ELEMENTS
    ----------------------------------------- */

    const promptInput =
        document.getElementById(
            "prompt"
        );


    const durationInput =
        document.getElementById(
            "duration"
        );


    const aspectInput =
        document.getElementById(
            "aspectRatio"
        );


    const button =
        document.getElementById(
            "generateVideoBtn"
        );


    /* -----------------------------------------
       PROMPT CHECK
    ----------------------------------------- */

    if (!promptInput) {

        console.error(
            "ERROR: #prompt not found ❌"
        );


        showToast(
            "Prompt box not found ❌"
        );


        return;

    }


    const prompt =
        promptInput.value.trim();


    if (!prompt) {

        showToast(
            "Please enter a video prompt ✍️"
        );


        promptInput.focus();


        return;

    }


    /* -----------------------------------------
       CREDIT CHECK
    ----------------------------------------- */

    if (credits <= 0) {

        showToast(
            "No credits remaining ❌"
        );


        return;

    }


    /* -----------------------------------------
       VALUES
    ----------------------------------------- */

    const duration =
        durationInput
        ? durationInput.value
        : "5";


    const aspectRatio =
        aspectInput
        ? aspectInput.value
        : "16:9";


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
        "Backend URL:",
        API_URL
    );


    /* -----------------------------------------
       BUTTON LOADING
    ----------------------------------------- */

    if (button) {

        button.disabled =
            true;


        button.dataset.oldText =
            button.innerHTML;


        button.innerHTML =
            "Generating... ⏳";

    }


    showLoading();


    try {

        console.log(
            "Sending request to backend... 🚀"
        );


        /* -----------------------------------------
           BACKEND REQUEST
        ----------------------------------------- */

        /* -----------------------------------------
           BACKEND REQUEST
           mode-aware: text, character reference
           or image-to-video
        ----------------------------------------- */
        const mode =
            typeof currentMode === "function"
                ? currentMode()
                : "text";

        const modelSelect =
            document.getElementById(
                "modelSelect"
            );

        const resolutionSelect =
            document.getElementById(
                "resolution"
            );

        const model =
            modelSelect
                ? modelSelect.value
                : "default";

        const resolution =
            resolutionSelect
                ? resolutionSelect.value
                : "720p";

        let endpoint =
            `${API_URL}/api/generate`;

        let fetchOptions;

        if (
            (mode === "reference" || mode === "imageToVideo") &&
            !uploadedFile
        ) {

            showToast(
                "This mode needs an uploaded image 📁"
            );

            hideLoading();

            if (button) {
                button.disabled = false;
                button.innerHTML =
                    button.dataset.oldText ||
                    "🎬 Generate Video";
            }

            return;

        }

        if (mode === "imageToVideo" && uploadedFile) {

            endpoint =
                `${API_URL}/api/image-to-video`;

            const form = new FormData();

            form.append("image", uploadedFile);
            form.append("prompt", prompt);
            form.append("duration", duration);
            form.append("model", model);
            form.append("resolution", resolution);

            fetchOptions = {
                method: "POST",
                body: form
            };

        }
        else if (mode === "reference" && uploadedFile) {

            const form = new FormData();

            form.append("references", uploadedFile);
            form.append("prompt", prompt);
            form.append("duration", duration);
            form.append("aspectRatio", aspectRatio);
            form.append("model", model);
            form.append("resolution", resolution);

            fetchOptions = {
                method: "POST",
                body: form
            };

        }
        else {

            fetchOptions = {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body: JSON.stringify({
                    prompt: prompt,
                    duration: duration,
                    aspectRatio: aspectRatio,
                    model: model,
                    resolution: resolution
                })
            };

        }

        console.log(
            "Endpoint:",
            endpoint,
            "mode:",
            mode
        );

        const response =
            await fetch(
                endpoint,
                fetchOptions
            );


        console.log(
            "Backend HTTP status:",
            response.status
        );


        /* -----------------------------------------
           RESPONSE TEXT
        ----------------------------------------- */

        const responseText =
            await response.text();


        console.log(
            "Raw backend response:",
            responseText
        );


        let data;


        try {

            data =
                JSON.parse(
                    responseText
                );

        }
        catch (jsonError) {

            throw new Error(
                "Backend returned an invalid response."
            );

        }


        console.log(
            "Backend response:",
            data
        );


        /* -----------------------------------------
           ERROR CHECK
        ----------------------------------------- */

        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(

                data.message ||
                data.error ||
                "Video generation failed."

            );

        }


        /* -----------------------------------------
           CREDIT
        ----------------------------------------- */

        credits--;

        updateCredits();


        /* -----------------------------------------
           RESULT
        ----------------------------------------- */

        hideLoading();


        showResult(
            data
        );


        showToast(
            "Video generated successfully! 🎬"
        );


        console.log(
            "VIDEO GENERATED SUCCESSFULLY ✅"
        );

    }
    catch (error) {

        console.error(
            "Generate error:",
            error
        );


        hideLoading();


        showToast(
            error.message ||
            "Generation failed ❌"
        );

    }
    finally {

        if (button) {

            button.disabled =
                false;


            button.innerHTML =
                button.dataset.oldText ||
                "🎬 Generate Video";

        }

    }

}


/* =========================================
   LOADING
========================================= */

function showLoading() {

    const loading =
        document.querySelector(
            ".loading"
        );


    const result =
        document.querySelector(
            ".result"
        );


    if (loading) {

        loading.classList.remove(
            "hidden"
        );


        loading.innerHTML = `

            <div class="spinner"></div>

            <h3>
                Generating your video...
            </h3>

            <p>
                Magic Hour is creating your video.
                Please wait...
            </p>

        `;

    }


    if (result) {

        result.classList.add(
            "hidden"
        );

    }

}


function hideLoading() {

    const loading =
        document.querySelector(
            ".loading"
        );


    if (loading) {

        loading.classList.add(
            "hidden"
        );

    }

}


/* =========================================
   VIDEO URL HELPER
========================================= */

function getFullVideoURL(videoURL) {

    if (!videoURL) {

        return "";

    }


    /* Already complete URL */

    if (
        videoURL.startsWith(
            "http://"
        ) ||
        videoURL.startsWith(
            "https://"
        ) ||
        videoURL.startsWith(
            "blob:"
        ) ||
        videoURL.startsWith(
            "data:"
        )
    ) {

        return videoURL;

    }


    /* Backend-relative URL */

    if (
        videoURL.startsWith("/")
    ) {

        return (
            API_URL +
            videoURL
        );

    }


    return (
        API_URL +
        "/" +
        videoURL
    );

}


/* =========================================
   SHOW RESULT
========================================= */

function showResult(data) {

    const result =
        document.querySelector(
            ".result"
        );


    if (!result) {

        console.error(
            ".result element not found ❌"
        );


        return;

    }


    result.classList.remove(
        "hidden"
    );


    let videoURL =
        data &&
        data.data &&
        data.data.videoURL
            ? data.data.videoURL
            : "";


    videoURL =
        getFullVideoURL(
            videoURL
        );


    const duration =
        data &&
        data.data &&
        data.data.duration
            ? data.data.duration
            : 5;


    const aspectRatio =
        data &&
        data.data &&
        data.data.aspectRatio
            ? data.data.aspectRatio
            : "16:9";


    if (!videoURL) {

        console.error(
            "Video URL missing ❌",
            data
        );


        result.innerHTML = `

            <div class="generated-box">

                <h3>
                    ⚠️ Video Generated
                </h3>

                <p>
                    Backend completed the request,
                    but no video URL was returned.
                </p>

                <p>
                    Check Render backend logs.
                </p>

            </div>

        `;


        return;

    }


    result.innerHTML = `

        <div class="generated-box">

            <h3>
                🎬 Your AI Video
            </h3>


            <div
                class="video-player-wrapper"
                style="
                    width:100%;
                    margin-top:15px;
                "
            >

                <video
                    id="generatedVideo"
                    controls
                    playsinline
                    preload="metadata"
                    style="
                        width:100%;
                        max-width:900px;
                        border-radius:16px;
                        display:block;
                        background:#000;
                    "
                >

                    <source
                        src="${escapeHTML(videoURL)}"
                        type="video/mp4"
                    >

                    Your browser does not support
                    video playback.

                </video>

            </div>


            <div
                class="generated-info"
                style="
                    display:flex;
                    gap:10px;
                    flex-wrap:wrap;
                    margin-top:15px;
                "
            >

                <span>
                    Duration: ${escapeHTML(duration)}s
                </span>


                <span>
                    Ratio: ${escapeHTML(
                        aspectRatio
                    )}
                </span>


                <span>
                    Status: Ready ✅
                </span>

            </div>


            <div
                class="result-actions"
                style="
                    display:flex;
                    gap:10px;
                    flex-wrap:wrap;
                    margin-top:15px;
                "
            >

                <button
                    type="button"
                    class="download-video-btn"
                    onclick="downloadVideo('${escapeHTML(videoURL)}')"
                >

                    ⬇️ Download Video

                </button>


                <button
                    type="button"
                    class="preview-video-btn"
                    onclick="openVideoPreview('${escapeHTML(videoURL)}')"
                >

                    ▶️ Preview

                </button>

            </div>

        </div>

    `;


    const video =
        document.getElementById(
            "generatedVideo"
        );


    if (video) {

        video.addEventListener(
            "loadeddata",
            () => {

                console.log(
                    "Video loaded successfully ✅"
                );

            }
        );


        video.addEventListener(
            "error",
            event => {

                console.error(
                    "Video loading error:",
                    event
                );


                showToast(
                    "Video could not be loaded ❌"
                );

            }
        );

    }


    result.scrollIntoView({

        behavior:
            "smooth",

        block:
            "center"

    });

}


/* =========================================
   DOWNLOAD VIDEO
========================================= */

function downloadVideo(videoURL) {

    if (!videoURL) {

        showToast(
            "Video URL not found ❌"
        );


        return;

    }


    const link =
        document.createElement(
            "a"
        );


    link.href =
        videoURL;


    link.download =
        "GS-AI-Studio-Video.mp4";


    link.target =
        "_blank";


    link.rel =
        "noopener";


    document.body.appendChild(
        link
    );


    link.click();


    link.remove();

}


/* =========================================
   VIDEO PREVIEW
========================================= */

function openVideoPreview(videoURL) {

    if (!videoURL) {

        showToast(
            "Video URL not found ❌"
        );


        return;

    }


    const modal =
        document.getElementById(
            "videoPreviewModal"
        );


    if (!modal) {

        window.open(
            videoURL,
            "_blank"
        );


        return;

    }


    const container =
        modal.querySelector(
            ".modal-video-container"
        );


    if (!container) {

        window.open(
            videoURL,
            "_blank"
        );


        return;

    }


    container.innerHTML = `

        <video
            controls
            autoplay
            playsinline
            style="
                width:100%;
                max-width:900px;
                border-radius:14px;
                background:#000;
            "
        >

            <source
                src="${escapeHTML(videoURL)}"
                type="video/mp4"
            >

        </video>

    `;


    modal.classList.add(
        "open"
    );

}


/* =========================================
   MODAL
========================================= */

function setupModal() {

    const modal =
        document.getElementById(
            "videoPreviewModal"
        );


    if (!modal) return;


    const close =
        modal.querySelector(
            ".close-preview"
        );


    if (close) {

        close.addEventListener(
            "click",
            () => {

                modal.classList.remove(
                    "open"
                );

            }
        );

    }


    modal.addEventListener(
        "click",
        event => {

            if (
                event.target === modal
            ) {

                modal.classList.remove(
                    "open"
                );

            }

        }
    );

}


/* =========================================
   EDITOR BUTTONS
========================================= */

function setupEditorButtons() {

    document.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    ".editor-tools button"
                );


            if (!button) return;


            const action =
                button.dataset.action ||
                button.textContent.trim();


            console.log(
                "Editor action:",
                action
            );


            showToast(
                `${action} selected`
            );

        }
    );

}


/* =========================================
   TOAST
========================================= */

function showToast(message) {

    let container =
        document.getElementById(
            "toastContainer"
        );


    if (!container) {

        container =
            document.createElement(
                "div"
            );


        container.id =
            "toastContainer";


        container.style.position =
            "fixed";


        container.style.bottom =
            "25px";


        container.style.right =
            "25px";


        container.style.zIndex =
            "99999";


        container.style.maxWidth =
            "90vw";


        document.body.appendChild(
            container
        );

    }


    const toast =
        document.createElement(
            "div"
        );


    toast.className =
        "toast";


    toast.textContent =
        message;


    toast.style.padding =
        "12px 18px";


    toast.style.marginTop =
        "10px";


    toast.style.borderRadius =
        "10px";


    toast.style.background =
        "#111";


    toast.style.color =
        "#fff";


    toast.style.boxShadow =
        "0 10px 30px rgba(0,0,0,.3)";


    toast.style.transition =
        "all .3s ease";


    container.appendChild(
        toast
    );


    setTimeout(
        () => {

            toast.remove();

        },
        3000
    );

}


/* =========================================
   UTILITIES
========================================= */

function formatFileSize(bytes) {

    if (
        !bytes ||
        bytes === 0
    ) {

        return "0 Bytes";

    }


    const units = [

        "Bytes",
        "KB",
        "MB",
        "GB"

    ];


    const index =
        Math.floor(

            Math.log(bytes) /
            Math.log(1024)

        );


    return (

        parseFloat(

            (
                bytes /
                Math.pow(
                    1024,
                    index
                )

            ).toFixed(2)

        )

        +

        " " +

        units[index]

    );

}


/* =========================================
   ESCAPE HTML
========================================= */

function escapeHTML(value) {

    return String(value)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}


/* =========================================
   GLOBAL EXPORT
========================================= */

window.generateVideo =
    generateVideo;


window.showPage =
    showPage;


window.downloadVideo =
    downloadVideo;


window.openVideoPreview =
    openVideoPreview;


console.log(
    "GS AI Studio script ready ✅"
);

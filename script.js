"use strict";

document.addEventListener("DOMContentLoaded", function () {

    console.log("GS AI Studio loaded");

    // =========================================================
    // HELPERS
    // =========================================================

    function get(selector) {
        return document.querySelector(selector);
    }

    function getAll(selector) {
        return document.querySelectorAll(selector);
    }

    function show(element) {
        if (element) {
            element.classList.remove("hidden");
        }
    }

    function hide(element) {
        if (element) {
            element.classList.add("hidden");
        }
    }

    function scrollTop() {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }


    // =========================================================
    // TOOLS
    // =========================================================

    var tools = [
        "Text to Video",
        "Image to Video",
        "Video to Video",
        "Character Replace",
        "AI Image",
        "AI Voice",
        "Auto Caption"
    ];

    var placeholders = {
        "Text to Video":
            "Describe the video you want to create...",

        "Image to Video":
            "Describe how your image should move...",

        "Video to Video":
            "Describe how you want to transform the video...",

        "Character Replace":
            "Describe the character you want to replace...",

        "AI Image":
            "Describe the image you want to generate...",

        "AI Voice":
            "Enter the text for your AI voice...",

        "Auto Caption":
            "Enter your caption requirements..."
    };


    // =========================================================
    // VARIABLES
    // =========================================================

    var selectedFile = null;
    var fileURL = null;
    var generatedVideoURL = null;
    var controlsReady = false;


    // =========================================================
    // UPDATE PLACEHOLDER
    // =========================================================

    function updatePlaceholder(toolName) {

        var prompt = get("#prompt");

        if (!prompt) {
            return;
        }

        prompt.placeholder =
            placeholders[toolName] ||
            placeholders["Text to Video"];
    }


    // =========================================================
    // HOME
    // =========================================================

    function showHome() {

        hide(get("#creator"));
        hide(get("#editor"));

        show(get("#homeSection"));

        scrollTop();
    }


    // =========================================================
    // CREATE PAGE
    // =========================================================

    function showCreate(toolName) {

        hide(get("#homeSection"));
        hide(get("#editor"));

        show(get("#creator"));

        var title = get("#toolName");

        if (title) {
            title.textContent =
                toolName || "Text to Video";
        }

        updatePlaceholder(
            toolName || "Text to Video"
        );

        scrollTop();
    }


    // =========================================================
    // EDITOR PAGE
    // =========================================================

    function showEditor() {

        hide(get("#homeSection"));
        hide(get("#creator"));

        show(get("#editor"));

        setupEditorVideo();

        scrollTop();
    }


    // =========================================================
    // START BUTTONS
    // =========================================================

    getAll(".start-btn").forEach(function (button) {

        button.addEventListener("click", function () {

            var heading = button.querySelector("h3");

            if (heading) {
                showCreate(
                    heading.textContent.trim()
                );
            } else {
                showCreate("Text to Video");
            }

        });

    });


    // =========================================================
    // TOOL CARDS
    // =========================================================

    getAll(".tool-card").forEach(function (card) {

        card.addEventListener("click", function () {

            var heading = card.querySelector("h3");

            if (heading) {
                showCreate(
                    heading.textContent.trim()
                );
            }

        });

    });


    // =========================================================
    // SIDEBAR NAVIGATION
    // =========================================================

    getAll(".sidebar nav a").forEach(function (link, index) {

        link.addEventListener("click", function (event) {

            event.preventDefault();

            getAll(".sidebar nav a").forEach(function (item) {
                item.classList.remove("active");
            });

            link.classList.add("active");

            if (index === 0) {
                showHome();
                return;
            }

            var tool = tools[index - 1];

            if (tool) {
                showCreate(tool);
            }

        });

    });


    // =========================================================
    // NEW PROJECT
    // =========================================================

    var newProject = get(".new-project");

    if (newProject) {

        newProject.addEventListener("click", function () {

            var prompt = get("#prompt");

            if (prompt) {
                prompt.value = "";
            }

            updateCounter();

            var result = get("#result");

            if (result) {
                result.innerHTML = "";
                result.classList.add("hidden");
            }

            removeFile();

            if (generatedVideoURL) {

                URL.revokeObjectURL(
                    generatedVideoURL
                );

                generatedVideoURL = null;
            }

            showHome();

        });

    }


    // =========================================================
    // CREATOR BACK
    // =========================================================

    var creatorBack =
        get(".creator-header .back-btn");

    if (creatorBack) {

        creatorBack.addEventListener("click", function () {
            showHome();
        });

    }


    // =========================================================
    // EDITOR BACK
    // =========================================================

    var editorBack =
        get(".back-editor-btn");

    if (editorBack) {

        editorBack.addEventListener("click", function () {

            showCreate("Text to Video");

        });

    }


    // =========================================================
    // PROMPT COUNTER
    // =========================================================

    var promptInput = get("#prompt");
    var promptCounter = get("#promptCounter");

    function updateCounter() {

        if (!promptInput || !promptCounter) {
            return;
        }

        var length = promptInput.value.length;

        if (length > 1000) {
            promptInput.value =
                promptInput.value.substring(0, 1000);
        }

        promptCounter.textContent =
            promptInput.value.length + "/1000";
    }

    if (promptInput) {

        promptInput.addEventListener(
            "input",
            updateCounter
        );

    }

    updateCounter();


    // =========================================================
    // FILE UPLOAD
    // =========================================================

    function setupUpload() {

        var uploadArea = get(".upload-area");
        var fileInput = get("#fileInput");

        if (!uploadArea || !fileInput) {
            return;
        }

        uploadArea.addEventListener("click", function (event) {

            if (
                event.target.tagName === "BUTTON" ||
                event.target.closest("button")
            ) {
                return;
            }

            fileInput.click();

        });


        fileInput.addEventListener("change", function () {

            if (
                !fileInput.files ||
                fileInput.files.length === 0
            ) {
                return;
            }

            handleFile(fileInput.files[0]);

        });


        uploadArea.addEventListener("dragover", function (event) {

            event.preventDefault();

            uploadArea.classList.add("dragging");

        });


        uploadArea.addEventListener("dragleave", function () {

            uploadArea.classList.remove("dragging");

        });


        uploadArea.addEventListener("drop", function (event) {

            event.preventDefault();

            uploadArea.classList.remove("dragging");

            if (
                event.dataTransfer &&
                event.dataTransfer.files &&
                event.dataTransfer.files.length > 0
            ) {

                handleFile(
                    event.dataTransfer.files[0]
                );

            }

        });

    }


    // =========================================================
    // HANDLE FILE
    // =========================================================

    function handleFile(file) {

        if (!file) {
            return;
        }

        var allowedTypes = [
            "image/png",
            "image/jpeg",
            "image/webp",
            "video/mp4",
            "video/quicktime"
        ];

        if (allowedTypes.indexOf(file.type) === -1) {

            alert(
                "Please upload PNG, JPG, WEBP, MP4 or MOV."
            );

            return;
        }

        selectedFile = file;

        if (fileURL) {
            URL.revokeObjectURL(fileURL);
        }

        fileURL = URL.createObjectURL(file);

        var uploadArea = get(".upload-area");

        if (!uploadArea) {
            return;
        }

        uploadArea.classList.add("has-file");

        uploadArea.innerHTML = "";

        var preview =
            document.createElement("div");

        preview.className =
            "upload-preview";


        if (file.type.startsWith("image/")) {

            var image =
                document.createElement("img");

            image.src = fileURL;

            image.alt = "Uploaded image";

            preview.appendChild(image);
        }


        if (file.type.startsWith("video/")) {

            var video =
                document.createElement("video");

            video.src = fileURL;

            video.controls = true;
            video.muted = true;
            video.playsInline = true;

            preview.appendChild(video);
        }


        var name =
            document.createElement("p");

        name.textContent = file.name;

        preview.appendChild(name);


        var removeButton =
            document.createElement("button");

        removeButton.type = "button";

        removeButton.textContent = "Remove";

        removeButton.addEventListener(
            "click",
            function (event) {

                event.stopPropagation();

                removeFile();

            }
        );

        preview.appendChild(removeButton);

        uploadArea.appendChild(preview);

    }


    // =========================================================
    // REMOVE FILE
    // =========================================================

    function removeFile() {

        selectedFile = null;

        if (fileURL) {

            URL.revokeObjectURL(fileURL);

            fileURL = null;
        }

        var fileInput = get("#fileInput");

        if (fileInput) {
            fileInput.value = "";
        }

        var uploadArea = get(".upload-area");

        if (!uploadArea) {
            return;
        }

        uploadArea.classList.remove("has-file");
        uploadArea.classList.remove("dragging");

        uploadArea.innerHTML = "";

        var icon =
            document.createElement("div");

        icon.className = "upload-icon";
        icon.textContent = "↑";


        var title =
            document.createElement("h3");

        title.textContent = "Upload Reference";


        var text =
            document.createElement("p");

        text.textContent =
            "Drop an image or video here";


        var formats =
            document.createElement("span");

        formats.textContent =
            "PNG, JPG, WEBP, MP4, MOV";


        uploadArea.appendChild(icon);
        uploadArea.appendChild(title);
        uploadArea.appendChild(text);
        uploadArea.appendChild(formats);

        if (fileInput) {
            uploadArea.appendChild(fileInput);
        }

    }

    setupUpload();


    // =========================================================
    // DURATION
    // =========================================================

    var duration = get("#duration");

    if (duration) {

        duration.addEventListener(
            "change",
            function () {

                console.log(
                    "Duration:",
                    duration.value
                );

            }
        );

    }


    // =========================================================
    // ASPECT RATIO
    // =========================================================

    var aspectRatio = get("#aspectRatio");

    if (aspectRatio) {

        aspectRatio.addEventListener(
            "change",
            function () {

                console.log(
                    "Aspect Ratio:",
                    aspectRatio.value
                );

            }
        );

    }


    // =========================================================
    // REAL AI GENERATION
    // =========================================================

    var generateButton =
        get(".generate-btn");


    if (generateButton) {

        generateButton.addEventListener(
            "click",
            async function () {

                var prompt = get("#prompt");

                if (
                    !prompt ||
                    prompt.value.trim() === ""
                ) {

                    alert(
                        "Please describe what you want to create."
                    );

                    if (prompt) {
                        prompt.focus();
                    }

                    return;
                }


                var result = get("#result");

                if (!result) {
                    return;
                }


                generateButton.disabled = true;

                generateButton.textContent =
                    "Generating...";


                result.classList.remove("hidden");

                result.innerHTML = "";


                // LOADING UI

                var loadingIcon =
                    document.createElement("div");

                loadingIcon.className =
                    "loading-icon";

                loadingIcon.textContent = "✦";


                var loadingTitle =
                    document.createElement("h3");

                loadingTitle.textContent =
                    "Creating your AI video...";


                var loadingText =
                    document.createElement("p");

                loadingText.textContent =
                    "GS AI is generating your video. Please wait...";


                result.appendChild(loadingIcon);
                result.appendChild(loadingTitle);
                result.appendChild(loadingText);


                result.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });


                try {

                    console.log(
                        "Sending prompt:",
                        prompt.value.trim()
                    );


                    var response =
                        await fetch(
                            "/api/generate",
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body: JSON.stringify({

                                    prompt:
                                        prompt.value.trim(),

                                    duration:
                                        duration
                                            ? duration.value
                                            : "5",

                                    aspectRatio:
                                        aspectRatio
                                            ? aspectRatio.value
                                            : "16:9"

                                })
                            }
                        );


                    if (!response.ok) {

                        var errorMessage =
                            "Video generation failed.";

                        try {

                            var errorData =
                                await response.json();

                            if (
                                errorData &&
                                errorData.message
                            ) {

                                errorMessage =
                                    errorData.message;
                            }

                        } catch (jsonError) {

                            console.log(
                                "Error response was not JSON."
                            );
                        }

                        throw new Error(errorMessage);
                    }


                    var videoBlob =
                        await response.blob();


                    if (
                        !videoBlob ||
                        videoBlob.size === 0
                    ) {

                        throw new Error(
                            "AI returned an empty video."
                        );
                    }


                    if (generatedVideoURL) {

                        URL.revokeObjectURL(
                            generatedVideoURL
                        );
                    }


                    generatedVideoURL =
                        URL.createObjectURL(
                            videoBlob
                        );


                    // =================================================
                    // SUCCESS UI
                    // =================================================

                    result.innerHTML = "";


                    var successIcon =
                        document.createElement("div");

                    successIcon.className =
                        "success-icon";

                    successIcon.textContent = "✓";


                    var successTitle =
                        document.createElement("h3");

                    successTitle.textContent =
                        "Video Generated Successfully";


                    var successText =
                        document.createElement("p");

                    successText.textContent =
                        "Your AI video is ready.";


                    var generatedPreview =
                        document.createElement("video");

                    generatedPreview.src =
                        generatedVideoURL;

                    generatedPreview.controls = true;
                    generatedPreview.playsInline = true;

                    generatedPreview.className =
                        "generated-video";


                    var previewButton =
                        document.createElement("button");

                    previewButton.type = "button";
                    previewButton.id = "previewBtn";
                    previewButton.textContent =
                        "▶ Preview";


                    var editButton =
                        document.createElement("button");

                    editButton.type = "button";
                    editButton.id = "editBtn";
                    editButton.textContent =
                        "✎ Edit Video";


                    var exportButton =
                        document.createElement("button");

                    exportButton.type = "button";
                    exportButton.id = "exportBtn";
                    exportButton.textContent =
                        "↓ Export";


                    result.appendChild(successIcon);
                    result.appendChild(successTitle);
                    result.appendChild(successText);
                    result.appendChild(generatedPreview);
                    result.appendChild(previewButton);
                    result.appendChild(editButton);
                    result.appendChild(exportButton);


                    generateButton.disabled = false;

                    generateButton.textContent =
                        "✦ Generate";


                    previewButton.addEventListener(
                        "click",
                        previewGeneratedVideo
                    );


                    editButton.addEventListener(
                        "click",
                        showEditor
                    );


                    exportButton.addEventListener(
                        "click",
                        exportGeneratedVideo
                    );


                    console.log(
                        "AI video received successfully."
                    );

                } catch (error) {

                    console.error(
                        "Generation error:",
                        error
                    );


                    result.innerHTML = "";


                    var errorIcon =
                        document.createElement("div");

                    errorIcon.textContent = "⚠";


                    var errorTitle =
                        document.createElement("h3");

                    errorTitle.textContent =
                        "Video Generation Failed";


                    var errorText =
                        document.createElement("p");

                    errorText.textContent =
                        error.message ||
                        "Something went wrong.";


                    result.appendChild(errorIcon);
                    result.appendChild(errorTitle);
                    result.appendChild(errorText);


                    generateButton.disabled = false;

                    generateButton.textContent =
                        "✦ Generate";

                }

            }
        );

    }


    // =========================================================
    // PREVIEW GENERATED VIDEO
    // =========================================================

    function previewGeneratedVideo() {

        if (!generatedVideoURL) {

            alert(
                "Generate a video first."
            );

            return;
        }


        var overlay =
            document.createElement("div");

        overlay.className =
            "video-modal";


        var video =
            document.createElement("video");

        video.src =
            generatedVideoURL;

        video.controls = true;
        video.autoplay = true;
        video.playsInline = true;


        var closeButton =
            document.createElement("button");

        closeButton.type = "button";

        closeButton.textContent =
            "✕ Close";


        closeButton.addEventListener(
            "click",
            function () {

                video.pause();

                overlay.remove();

            }
        );


        overlay.appendChild(video);
        overlay.appendChild(closeButton);

        document.body.appendChild(overlay);

    }


    // =========================================================
    // EXPORT GENERATED VIDEO
    // =========================================================

    function exportGeneratedVideo() {

        if (!generatedVideoURL) {

            alert(
                "Generate a video first."
            );

            return;
        }


        var link =
            document.createElement("a");

        link.href =
            generatedVideoURL;

        link.download =
            "GS-AI-Generated-Video.mp4";

        document.body.appendChild(link);

        link.click();

        document.body.removeChild(link);

    }


    // =========================================================
    // EDITOR VIDEO
    // =========================================================

    function setupEditorVideo() {

        var editorVideo =
            get("#editorVideo");

        var emptyVideo =
            get(".empty-video");


        if (!editorVideo) {
            return;
        }


        // GENERATED VIDEO

        if (generatedVideoURL) {

            editorVideo.src =
                generatedVideoURL;

            editorVideo.load();

            editorVideo.style.display =
                "block";


            if (emptyVideo) {
                emptyVideo.style.display =
                    "none";
            }


            setupVideoControls();

            return;
        }


        // UPLOADED VIDEO

        if (
            selectedFile &&
            selectedFile.type.startsWith("video/") &&
            fileURL
        ) {

            editorVideo.src =
                fileURL;

            editorVideo.load();

            editorVideo.style.display =
                "block";


            if (emptyVideo) {
                emptyVideo.style.display =
                    "none";
            }


            setupVideoControls();

            return;
        }


        // NO VIDEO

        editorVideo.removeAttribute("src");

        editorVideo.style.display =
            "none";


        if (emptyVideo) {
            emptyVideo.style.display =
                "flex";
        }

    }


    // =========================================================
    // VIDEO CONTROLS
    // =========================================================

    function setupVideoControls() {

        var editorVideo =
            get("#editorVideo");

        var slider =
            get("#timelineSlider");

        var currentTime =
            get("#currentTime");

        var totalTime =
            get("#totalTime");


        if (!editorVideo) {
            return;
        }


        if (controlsReady) {
            return;
        }

        controlsReady = true;


        function formatTime(seconds) {

            if (!isFinite(seconds)) {
                return "0:00";
            }

            var minutes =
                Math.floor(seconds / 60);

            var secondsPart =
                Math.floor(seconds % 60);

            return (
                minutes +
                ":" +
                (
                    secondsPart < 10
                        ? "0"
                        : ""
                ) +
                secondsPart
            );

        }


        editorVideo.addEventListener(
            "loadedmetadata",
            function () {

                if (totalTime) {

                    totalTime.textContent =
                        formatTime(
                            editorVideo.duration
                        );
                }


                var trimEnd =
                    get("#trimEnd");


                if (
                    trimEnd &&
                    isFinite(editorVideo.duration)
                ) {

                    trimEnd.value =
                        editorVideo.duration.toFixed(1);
                }

            }
        );


        editorVideo.addEventListener(
            "timeupdate",
            function () {

                if (currentTime) {

                    currentTime.textContent =
                        formatTime(
                            editorVideo.currentTime
                        );
                }


                if (
                    slider &&
                    editorVideo.duration
                ) {

                    slider.value =
                        (
                            editorVideo.currentTime /
                            editorVideo.duration
                        ) * 100;
                }

            }
        );


        if (slider) {

            slider.addEventListener(
                "input",
                function () {

                    if (!editorVideo.duration) {
                        return;
                    }

                    editorVideo.currentTime =
                        (
                            Number(slider.value) / 100
                        ) *
                        editorVideo.duration;

                }
            );

        }

    }


    // =========================================================
    // EDITOR TOOLS
    // =========================================================

    getAll(".editor-tools button").forEach(
        function (button) {

            button.addEventListener(
                "click",
                function () {

                    var span =
                        button.querySelector("span");

                    var toolName =
                        span
                            ? span.textContent.trim()
                            : button.textContent.trim();

                    alert(
                        toolName +
                        " tool selected."
                    );

                }
            );

        }
    );


    // =========================================================
    // TRIM
    // =========================================================

    var trimButton =
        get(".trim-apply-btn");


    if (trimButton) {

        trimButton.addEventListener(
            "click",
            function () {

                var startInput =
                    get("#trimStart");

                var endInput =
                    get("#trimEnd");


                var start =
                    startInput
                        ? Number(startInput.value)
                        : 0;


                var end =
                    endInput
                        ? Number(endInput.value)
                        : 0;


                if (
                    end <= start
                ) {

                    alert(
                        "Please enter valid trim values."
                    );

                    return;
                }


                var editorVideo =
                    get("#editorVideo");


                if (
                    editorVideo &&
                    editorVideo.duration
                ) {

                    if (
                        start >=
                        editorVideo.duration
                    ) {

                        alert(
                            "Start time is beyond the video duration."
                        );

                        return;
                    }


                    editorVideo.currentTime =
                        start;
                }


                alert(
                    "Trim range selected: " +
                    start +
                    "s - " +
                    end +
                    "s"
                );

            }
        );

    }


    // =========================================================
    // EDITOR EXPORT
    // =========================================================

    var editorExport =
        get(".export-btn");


    if (editorExport) {

        editorExport.addEventListener(
            "click",
            function () {

                if (generatedVideoURL) {

                    exportGeneratedVideo();

                } else {

                    exportUploadedVideo();

                }

            }
        );

    }


    // =========================================================
    // EXPORT UPLOADED VIDEO
    // =========================================================

    function exportUploadedVideo() {

        if (
            !selectedFile ||
            !selectedFile.type.startsWith("video/")
        ) {

            alert(
                "Upload a video first."
            );

            return;
        }


        var link =
            document.createElement("a");

        link.href =
            fileURL;

        link.download =
            "GS-AI-Video.mp4";


        document.body.appendChild(link);

        link.click();

        document.body.removeChild(link);

    }


    // =========================================================
    // MOBILE NAVIGATION
    // =========================================================

    getAll(".mobile-nav button").forEach(
        function (button, index) {

            button.addEventListener(
                "click",
                function () {

                    getAll(
                        ".mobile-nav button"
                    ).forEach(
                        function (item) {

                            item.classList.remove(
                                "active"
                            );

                        }
                    );


                    button.classList.add("active");


                    if (index === 0) {

                        showHome();

                    } else if (index === 1) {

                        showCreate(
                            "Text to Video"
                        );

                    } else if (index === 2) {

                        showEditor();

                    } else if (index === 3) {

                        openSettings();

                    }

                }
            );

        }
    );


    // =========================================================
    // SETTINGS
    // =========================================================

    function openSettings() {

        var modal =
            get("#settingsModal");


        if (modal) {

            modal.classList.add("open");

        } else {

            alert(
                "GS AI Studio Settings"
            );

        }

    }


    var settingsButton =
        get(".settings-btn");


    if (settingsButton) {

        settingsButton.addEventListener(
            "click",
            openSettings
        );

    }


    // =========================================================
    // HELP
    // =========================================================

    var helpButton =
        get(".help-btn");


    if (helpButton) {

        helpButton.addEventListener(
            "click",
            function () {

                alert(
                    "Choose an AI tool and start creating your project."
                );

            }
        );

    }


    // =========================================================
    // INITIAL PAGE
    // =========================================================

    showHome();

});
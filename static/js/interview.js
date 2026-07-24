/* =========================================================
   INTERVUE AI — PREMIUM INTERVIEW FLOW CONTROLLER
   ========================================================= */
// ==================================================
// TAB SWITCH DETECTION
// ==================================================
let webcamStream = null;
let multipleFaceWarningShown = false;
let multipleFaceTimer = null;
let tabSwitchCount = 0;
let faceCheckInterval = null;
const MAX_TAB_SWITCHES = 3;

let interviewSubmitted = false;
// ==================================================
// FULLSCREEN ENFORCEMENT
// ==================================================

let fullscreenExitCount = 0;
const MAX_FULLSCREEN_EXITS = 3;


// Enter fullscreen
function enterFullscreen() {

    const element =
        document.documentElement;

    if (!element.requestFullscreen) {

        alert("Fullscreen is not supported in this browser.");

        return Promise.reject(
            new Error("Fullscreen not supported")
        );

    }

    return element.requestFullscreen();

}
function showFullscreenWarning() {

    const existingWarning =
        document.getElementById("fullscreenWarning");

    if (existingWarning) {
        return;
    }

    document.body.insertAdjacentHTML("beforeend", `

        <div id="fullscreenWarning" class="fullscreen-warning">

            <div class="warning-box">

                <h2>Fullscreen Required</h2>

                <p>
                    You cannot continue the interview outside fullscreen mode.
                </p>

                <button
                    class="btn"
                    onclick="returnToFullscreen()">

                    Return to Fullscreen

                </button>

            </div>

        </div>

    `);

}
async function returnToFullscreen() {

    try {

        await document.documentElement.requestFullscreen();

        const warning =
            document.getElementById("fullscreenWarning");

        if (warning) {
            warning.remove();
        }

    } catch (error) {

        console.log("Fullscreen request failed:", error);

    }

}

// Detect when user exits fullscreen
document.addEventListener("fullscreenchange", function () {

    if (!document.fullscreenElement && !interviewSubmitted) {

        fullscreenExitCount++;

        if (fullscreenExitCount < MAX_FULLSCREEN_EXITS) {

            showFullscreenWarning();

        } else {

            interviewSubmitted = true;

            submitInterviewAutomatically();

        }

    }

});

document.addEventListener("visibilitychange", function () {

    if (document.hidden && !interviewSubmitted) {

        tabSwitchCount++;

        if (tabSwitchCount < MAX_TAB_SWITCHES) {

            Swal.fire({
    icon: "warning",
    title: `Tab Switch Warning (${tabSwitchCount}/${MAX_TAB_SWITCHES})`,
    text: "Please do not switch tabs during the interview.",
    timer: 2000,
    showConfirmButton: false
});

        }

        else {

            interviewSubmitted = true;

            Swal.fire({
    icon: "error",
    title: "Interview Terminated",
    text: "You switched tabs too many times. Your interview will now be submitted.",
    allowOutsideClick: false,
    allowEscapeKey: false,
    confirmButtonText: "OK"
}).then(() => {
        if (!isSubmitting) {
        submitInterviewAutomatically();
    }

});
    }
}
}); 

function submitInterviewAutomatically() {

        interviewSubmitted = true;

    submitAnswer();

}
let currentIndex = 0;

let currentQuestion = null;

let questionStartTime = null;

let timerInterval = null;

let elapsedSeconds = 0;

let codeEditor = null;

let recognition = null;

let micState = "idle";

let finalTranscript = "";

let isSubmitting = false;


const mainCard = document.getElementById("mainCard");

const progressFill = document.getElementById("progressFill");

const qCounter = document.getElementById("qCounter");

const timerDisplay = document.getElementById("timerDisplay");



/* =========================================================
   SPEECH RECOGNITION
   ========================================================= */


function initRecognition() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


    if (!SpeechRecognition) {

        return null;

    }


    const rec = new SpeechRecognition();


    rec.continuous = true;

    rec.interimResults = true;

    rec.lang = "en-US";


    rec.onstart = function () {

        micState = "listening";

        updateMicUI();

    };


    rec.onresult = function (event) {

        let interimTranscript = "";


        for (
            let i = event.resultIndex;
            i < event.results.length;
            i++
        ) {

            const transcript =
                event.results[i][0].transcript;


            if (event.results[i].isFinal) {

                finalTranscript += transcript + " ";

            } else {

                interimTranscript += transcript;

            }

        }


        const answerBox =
            document.getElementById("answerBox");


        const liveTranscript =
            document.getElementById("liveTranscript");


        if (answerBox) {

            answerBox.value =
                (finalTranscript + interimTranscript).trim();

        }


        if (liveTranscript) {

            liveTranscript.textContent =
                interimTranscript
                    ? `Hearing: "${interimTranscript}"`
                    : "";

        }

    };


    rec.onerror = function (event) {

        console.log("Speech recognition:", event.error);


        if (
            event.error === "not-allowed" ||
            event.error === "service-not-allowed"
        ) {

            micState = "idle";

            const status =
                document.getElementById("micStatus");


            if (status) {

                status.textContent =
                    "Microphone permission denied.";

            }

        }

    };


    rec.onend = function () {

        if (micState === "listening") {

            micState = "idle";

            updateMicUI();

        }

    };


    return rec;

}



/* =========================================================
   MICROPHONE UI
   ========================================================= */


function updateMicUI() {

    const micButton =
        document.getElementById("micBtn");


    const status =
        document.getElementById("micStatus");


    const waveform =
        document.querySelectorAll(".wave-bar");


    if (!micButton) {

        return;

    }


    if (micState === "listening") {

        micButton.classList.add("listening");


        if (status) {

            status.textContent =
                "Listening…";

        }


        waveform.forEach(function (bar) {

            bar.classList.add("active");

        });

    } else {

        micButton.classList.remove("listening");


        if (status) {

            status.textContent =
                "Tap to speak";

        }


        waveform.forEach(function (bar) {

            bar.classList.remove("active");

            bar.style.height = "4px";

        });

    }

}


function startInterviewFullscreen() {

    enterFullscreen()

        .then(function () {

            document
                .getElementById("fullscreenStart")
                .style
                .display = "none";

            loadQuestion(0);
            startWebcam();

        })

        .catch(function (error) {

            console.log(
                "Fullscreen could not be entered:",
                error
            );

            Swal.fire({
    icon: "warning",
    title: "Fullscreen Required",
    text: "Please allow fullscreen mode to begin the interview."
});

        });

}

/* =========================================================
   START MICROPHONE
   ========================================================= */


function startMic() {


    if (!recognition) {

        recognition =
            initRecognition();

    }


    if (!recognition) {

        const status =
            document.getElementById("micStatus");


        if (status) {

            status.textContent =
                "Voice input is not supported in this browser.";

        }


        return;

    }


    if (
        micState === "listening" ||
        micState === "starting"
    ) {

        return;

    }


    const answerBox =
        document.getElementById("answerBox");


    finalTranscript =
        answerBox
            ? answerBox.value + " "
            : "";


    micState = "starting";


    updateMicUI();


    try {

        recognition.start();

    } catch (error) {

        console.log(error);

        micState = "idle";

        updateMicUI();

    }

}



/* =========================================================
   STOP MICROPHONE
   ========================================================= */


function stopMic() {


    if (!recognition) {

        return;

    }


    if (micState === "idle") {

        return;

    }


    micState = "stopping";


    try {

        recognition.stop();

    } catch (error) {

        console.log(error);

    }


    micState = "idle";


    updateMicUI();

}



/* =========================================================
   TOGGLE MICROPHONE
   ========================================================= */


function toggleMic() {

    if (micState === "listening") {

        stopMic();

    } else {

        startMic();

    }

}



/* =========================================================
   TIMER
   ========================================================= */


function startTimer() {


    elapsedSeconds = 0;


    questionStartTime =
        Date.now();


    clearInterval(timerInterval);


    timerDisplay.textContent =
        "00:00";


    timerInterval =
        setInterval(function () {


            elapsedSeconds =
                Math.floor(
                    (Date.now() - questionStartTime) / 1000
                );


            const minutes =
                String(
                    Math.floor(elapsedSeconds / 60)
                ).padStart(2, "0");


            const seconds =
                String(
                    elapsedSeconds % 60
                ).padStart(2, "0");


            timerDisplay.textContent =
                `${minutes}:${seconds}`;


        }, 1000);

}



/* =========================================================
   STOP TIMER
   ========================================================= */


function stopTimer() {

    clearInterval(timerInterval);

}



/* =========================================================
   LOAD QUESTION
   ========================================================= */


async function loadQuestion(index) {


    try {


        stopMic();

        stopTimer();


        showQuestionLoading();


        const response =
            await fetch(
                `/api/question/${window.INTERVIEW_ID}/${index}`
            );


        if (!response.ok) {

            throw new Error(
                "Unable to load question."
            );

        }


        const data =
            await response.json();


        if (data.done) {
            if (webcamStream) {
                webcamStream.getTracks().forEach(track => track.stop());
}
            window.location.href =
                `/result/${window.INTERVIEW_ID}`;


            return;

        }


        currentQuestion =
            data.question;


        currentIndex =
            index;


        qCounter.textContent =
            `Question ${index + 1} of ${data.total}`;


        progressFill.style.width =
    `${((index + 1) / data.total) * 100}%`;


        renderQuestion(currentQuestion);


        startTimer();


    } catch (error) {


        mainCard.innerHTML = `

            <div class="evaluating">

                <div style="font-size:40px;">⚠</div>

                <h3>Unable to load question</h3>

                <p style="color:var(--text-muted);">

                    Please check your connection and try again.

                </p>

                <button
                    class="btn"
                    onclick="loadQuestion(${index})">

                    Try Again

                </button>

            </div>

        `;

    }

}



/* =========================================================
   QUESTION LOADING UI
   ========================================================= */


function showQuestionLoading() {

    mainCard.innerHTML = `

        <div class="evaluating loading-center">

            <div class="spinner"></div>

            <div style="font-weight:600;">

                Preparing your question…

            </div>

            <div style="font-size:13px;color:var(--text-muted);">

                AI Interview Engine is getting ready

            </div>

        </div>

    `;

}



/* =========================================================
   RENDER QUESTION
   ========================================================= */


function renderQuestion(question) {


    const isCoding =
        question.type === "coding";


    mainCard.innerHTML = `

        <div class="question-animation">


            <span class="q-type-badge ${question.type}">

                ${isCoding ? "CODING CHALLENGE" : "TECHNICAL QUESTION"}

            </span>


            <div class="q-text">

                ${escapeHtml(question.question)}

            </div>


            ${

                isCoding

                    ? renderCodingArea(question)

                    : renderTheoryArea()

            }


            <div class="actions-row">


                <span style="font-size:13px;color:var(--text-muted)">

                    ${

                        isCoding

                            ? "Write your solution and submit when ready."

                            : "Type your answer or use voice input."

                    }

                </span>


                <button

                    class="btn"

                    id="submitBtn"

                    onclick="submitAnswer()">


                    Submit Answer →

                </button>


            </div>


        </div>

    `;


    if (isCoding) {

        setupCodeEditor(
            question.starter_code || ""
        );

    } else {


        const micButton =
            document.getElementById("micBtn");


        if (micButton) {

            micButton.addEventListener(
                "click",
                toggleMic
            );

        }

    }

}



/* =========================================================
   THEORY QUESTION AREA
   ========================================================= */


function renderTheoryArea() {


    return `

        <textarea

            class="answer-box"

            id="answerBox"

            placeholder="Type your answer here, or use the microphone...">

        </textarea>


        <div class="answer-tools">


            <button

                class="mic-btn"

                id="micBtn"

                type="button">


                <svg

                    viewBox="0 0 24 24"

                    fill="none"

                    stroke-width="2"

                    stroke-linecap="round"

                    stroke-linejoin="round">


                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z">

                    </path>


                    <path d="M19 10v2a7 7 0 0 1-14 0v-2">

                    </path>


                    <line

                        x1="12"

                        y1="19"

                        x2="12"

                        y2="23">

                    </line>


                </svg>


            </button>


            <div class="waveform">


                ${

                    Array.from(
                        { length: 24 }
                    )

                    .map(

                        () =>

                        `<div class="wave-bar"></div>`

                    )

                    .join("")

                }


            </div>


            <span

                class="mic-status"

                id="micStatus">


                Tap to speak


            </span>


        </div>


        <div

            class="transcript-live"

            id="liveTranscript">


        </div>

    `;

}



/* =========================================================
   CODING AREA
   ========================================================= */


function renderCodingArea(question) {


    return `

        <div class="editor-wrap">

            <textarea id="codeArea"></textarea>

        </div>

    `;

}



/* =========================================================
   CODEMIRROR EDITOR
   ========================================================= */


function setupCodeEditor(starterCode) {


    const textarea =
        document.getElementById("codeArea");


    codeEditor =
        CodeMirror.fromTextArea(

            textarea,

            {

                mode: "python",

                theme: "neo",

                lineNumbers: true,

                indentUnit: 4,

                smartIndent: true,

                matchBrackets: true,

                autofocus: true,


                extraKeys: {


                    Tab: function (cm) {

                        cm.replaceSelection(
                            "    ",
                            "end"
                        );

                    }

                }

            }

        );


    codeEditor.setValue(
        starterCode
    );

}



/* =========================================================
   SUBMIT ANSWER
   ========================================================= */

async function submitAnswer() {

    if (isSubmitting) {
        return;
    }

    if (!currentQuestion) {
        console.error("No current question loaded.");
        return;
    }

    isSubmitting = true;

    stopMic();
    stopTimer();

    const submitButton =
        document.getElementById("submitBtn");

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Saving Answer…";
    }

    let answer = "";

    if (currentQuestion.type === "coding") {

        answer =
            codeEditor
                ? codeEditor.getValue()
                : "";

    } else {

        const answerBox =
            document.getElementById("answerBox");

        answer =
            answerBox
                ? answerBox.value.trim()
                : "";

    }

    showEvaluating();

    try {

        const response =
            await fetch(
                "/api/submit",

                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({

                        interview_id:
                            window.INTERVIEW_ID,

                        index:
                            currentIndex,

                        answer:
                            answer,

                        time_taken:
                            elapsedSeconds

                    })

                }

            );


        if (!response.ok) {

            throw new Error(
                "Answer submission failed."
            );

        }


        /*
         * IMPORTANT:
         *
         * We do NOT show the score here.
         *
         * We immediately load the next question.
         */


        if (interviewSubmitted) {
            stopMic();

    // Interview ended because of excessive tab switching
    if (webcamStream) {
                webcamStream.getTracks().forEach(track => track.stop());
}
    window.location.href =
        `/result/${window.INTERVIEW_ID}`;

}

else if (
    currentIndex + 1
    >= window.TOTAL_QUESTIONS
) {

    // All questions completed
    if (webcamStream) {
                webcamStream.getTracks().forEach(track => track.stop());
}
    window.location.href =
        `/result/${window.INTERVIEW_ID}`;

}

else {

    // Move to next question

    isSubmitting = false;

    codeEditor = null;

    loadQuestion(
        currentIndex + 1
    );

}

    } catch (error) {

        console.error(error);


        isSubmitting = false;


        mainCard.innerHTML = `

            <div class="evaluating">

                <div style="font-size:40px;">
                    ⚠
                </div>

                <h3>
                    Submission Failed
                </h3>

                <p style="color:var(--text-muted);">

                    Your answer could not be saved.

                </p>

                <button
                    class="btn"
                    onclick="loadQuestion(${currentIndex})">

                    Try Again

                </button>

            </div>

        `;

    }

}


/* =========================================================
   EVALUATION SCREEN
   ========================================================= */


function showEvaluating() {


    mainCard.innerHTML = `

        <div class="evaluating">


            <div class="spinner"></div>


            <div style="font-weight:600;font-size:16px;">

                AI is evaluating your answer…

            </div>


            <div style="font-size:13px;color:var(--text-muted);">

                Analysing accuracy, clarity and technical understanding

            </div>


        </div>

    `;

}



/* =========================================================
   SCORE REVEAL
   ========================================================= */


function showScoreReveal(result) {


    const percentage =
        result.max_score

            ? Math.round(
                (result.score / result.max_score) * 100
            )

            : 0;


    const isLastQuestion =
        currentIndex + 1 >=
        window.TOTAL_QUESTIONS;


    mainCard.innerHTML = `

        <div class="score-reveal">


            <div style="font-size:13px;color:var(--text-muted);">

                QUESTION ${currentIndex + 1} COMPLETED

            </div>


            <div

                style="font-size:48px;font-weight:700;color:var(--accent);margin-top:10px;">

                ${result.score}/${result.max_score}

            </div>


            <div

                style="font-size:15px;color:var(--text-muted);">

                ${percentage}% Performance

            </div>


            <div

                style="max-width:520px;margin:24px auto 0;padding:18px;background:#fafafa;border-radius:12px;text-align:left;">

                <strong>AI Feedback</strong>


                <p style="margin:8px 0 0;color:var(--text-muted);">

                    ${escapeHtml(result.feedback)}

                </p>

            </div>


            <button

                class="btn"

                style="margin-top:28px;"

                onclick="nextQuestion()">


                ${

                    isLastQuestion

                        ? "View Final Results →"

                        : "Continue to Next Question →"

                }


            </button>


        </div>

    `;


    progressFill.style.width =

        `${((currentIndex + 1) / window.TOTAL_QUESTIONS) * 100}%`;


    isSubmitting = false;

}



/* =========================================================
   NEXT QUESTION
   ========================================================= */


function nextQuestion() {


    isSubmitting = false;


    codeEditor = null;


    loadQuestion(
        currentIndex + 1
    );

}



/* =========================================================
   HTML ESCAPE
   ========================================================= */


function escapeHtml(value) {


    const div =
        document.createElement("div");


    div.textContent =
        value || "";


    return div.innerHTML;

}


/* =========================================================
   START APPLICATION
   ========================================================= */


document.addEventListener(
    "DOMContentLoaded",
    function () {

        // Wait for the user to click the start button

    }
);
// Disable right click
document.addEventListener("contextmenu", function(e) {
    e.preventDefault();
});

// Disable copy
document.addEventListener("copy", function(e) {
    e.preventDefault();
});

// Disable cut
document.addEventListener("cut", function(e) {
    e.preventDefault();
});

// Disable paste
document.addEventListener("paste", function(e) {
    e.preventDefault();
});

// Disable Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A
document.addEventListener("keydown", function(e) {

    if (e.ctrlKey) {

        const key = e.key.toLowerCase();

        if (
            key === "c" ||
            key === "v" ||
            key === "x" ||
            key === "a"
        ) {

            e.preventDefault();

        }

    }

});
// =====================================
// Webcam Face Detection
// =====================================
async function startWebcam() {

    try {

        const video = document.getElementById("webcam");

        webcamStream = await navigator.mediaDevices.getUserMedia({
            video: true
        });

        video.srcObject = webcamStream;

        await faceapi.nets.tinyFaceDetector.loadFromUri("/static/models");

        faceCheckInterval = setInterval(checkFaces, 1000);

    }

    catch(error){

    interviewSubmitted = true;

    Swal.fire({
        icon:"error",
        title:"Camera Required",
        text:"Camera access is mandatory for this interview.",
        allowOutsideClick:false,
        allowEscapeKey:false
    }).then(() => {

        window.location.href="/";

    });

}

async function checkFaces() {
    if (interviewSubmitted) return;
    const video = document.getElementById("webcam");

    if (video.readyState !== 4) return;

    const faces = await faceapi.detectAllFaces(
        video,
        new faceapi.TinyFaceDetectorOptions()
    );

    if (faces.length > 1) {

        if (!multipleFaceWarningShown) {

            multipleFaceWarningShown = true;

            let seconds = 5;

            Swal.fire({
                icon: "warning",
                title: "Multiple Faces Detected",
                html: `
                    <p>Please ensure only you are visible.</p>
                    <h2 id="countdown">${seconds}</h2>
                    <p>The interview will be terminated if multiple faces remain.</p>
                `,
                allowOutsideClick: false,
                allowEscapeKey: false,
                showConfirmButton: false
            });

            multipleFaceTimer = setInterval(async function () {

                seconds--;

                const timer =
                    document.getElementById("countdown");

                if (timer) {
                    timer.textContent = seconds;
                }

                const latestFaces =
                    await faceapi.detectAllFaces(
                        video,
                        new faceapi.TinyFaceDetectorOptions()
                    );

                if (latestFaces.length <= 1) {

                    clearInterval(multipleFaceTimer);

                    multipleFaceTimer = null;

                    multipleFaceWarningShown = false;

                    if (Swal.isVisible()) {
                        Swal.close();
}

                    return;

                }

                                if (seconds <= 0) {

                    clearInterval(multipleFaceTimer);
                    multipleFaceTimer = null;
                    clearInterval(faceCheckInterval);
                    if (webcamStream) {
                        webcamStream.getTracks().forEach(track => track.stop());
}                       document.getElementById("webcam").style.display = "none";
                    interviewSubmitted = true;

                    Swal.fire({
                        icon: "error",
                        title: "Interview Terminated",
                        text: "Multiple faces were detected for more than 5 seconds.",
                        allowOutsideClick: false,
                        allowEscapeKey: false,
                        confirmButtonText: "OK"
                    }).then(() => {

    if (!isSubmitting) {
        submitInterviewAutomatically();
    }

});

                }

            }, 1000);

        }

    } else {

        // Only one face (or none)
        if (multipleFaceTimer) {
            clearInterval(multipleFaceTimer);
            multipleFaceTimer = null;
        }

        multipleFaceWarningShown = false;

        if (Swal.isVisible()) {
        Swal.close();
    }

}

    }
}
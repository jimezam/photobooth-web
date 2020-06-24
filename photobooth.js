////////////////////////////////////////////////////////////////////////////////////

/**
 * Time to wait between shoots
 */

const SHOOT_TIMER = 3000;

/**
 * Time to wait between the last reminder and take the photo
 * (let the user be prepared to the photo)
 */

const SHOOT_DELAY_STANDBY = 1500;

/**
 * Delay between shoot reminders (3, 2, ...)
 */

const SHOOT_REMINDER = 1000;

/**
 * Preloaded sounds
 */

var sounds = [];

/**
 * Preloaded images
 */

var overlayImages = [];

/**
 * Startup function
 */

$(document).ready(function() {
    // Establish the buttons event handlers

    $('#start').on('click', initialize);
    $('#shoot').on('click', takePhotos);
    $('#mute').on('click', toggleMute);
    $('#pause').on('click', togglePause);
    $('#stop').on('click', shutdown);

    // Establish the loaded-video event handler to prepare the UI as soon
    // as the video metadata is received

    var display = document.getElementById("display");
    display.addEventListener("loadedmetadata", adjustDisplay.bind(null, event, display));

    // Preload sounds and images

    sounds = loadSounds();
    overlayImages = preloadOverlayImages();
});

////////////////////////////////////////////////////////////////////////////////////

/**
 * The photo session has begun
 */

const SOUND_READY = 0;

/**
 * The photo session has ended
 */

const SOUND_BYE = 1;

/**
 * The camera has shoot a new photo
 */

const SOUND_SHOOT = 2;

/**
 * Preload the sounds of the application
 */

function loadSounds() {
    var data = [];

    data.push(new Audio('sounds/_ready.wav'));
    data.push(new Audio('sounds/_end.wav'));
    data.push(new Audio('sounds/_shoot.wav'));

    return data;
}

////////////////////////////////////////////////////////////////////////////////////

/**
 * Count of photos taken up to now
 */

var photosTaken = 0;

/**
 * Interval to take multiple photos
 */

var timer = null;

/**
 * The ammount of photos to take in a session
 */

var photosCount = 3;

/**
 * Handles the process of taking all the photos
 */

function takePhotos() {
    // Check if there is video feed to work on

    if (display.srcObject == null) {
        alert("There is camera feed is off!");
        return false;
    }

    // Plays the begin photo session sound

    sounds[SOUND_READY].play();

    // Change the Take! button to spinner (session in progress)

    var shoot = document.querySelector('#shoot');
    shoot.innerHTML = "<span class=\"spinner-border spinner-border-sm\"></span> Working ...";

    // Get all the canvases available to store the photos taken

    var elements = document.querySelectorAll('#photo_row canvas');

    // Reset the amount of photos taken counter

    photosTaken = 0;

    // Show the overlay countdown previous to a photo shoot

    activateOverlay();

    // Starts the interval to make the photo session

    timer = setInterval(function() {
        // For each photo taken, plays the shoot sound

        sounds[SOUND_SHOOT].play();

        // Adjust the size of the canvas according the video feed

        adjustCanvas(display, elements[photosTaken]);

        // Takes the photo from video feed in current canvas

        takePhoto(display, elements[photosTaken]);

        // Register one more photo taken

        photosTaken++;

        // Ends the interval when all the photos are taken

        if (photosTaken == photosCount) {
            // Plays the end photo session sound

            sounds[SOUND_BYE].play();

            // Restores the label of the Take! button

            shoot.innerHTML = "Take!";

            // Destroys the interval

            clearInterval(timer);
        } else {
            // So, there are more photos to take then show the countdown overlay

            activateOverlay();
        }
    }, SHOOT_TIMER + SHOOT_DELAY_STANDBY, elements);
}

/**
 * Take one photo from video feed (source) to selected (canvas)
 * @param {HTMLVideoElement} source - video feed from webcam
 * @param {HTMLCanvasElement} canvas - canvas where the photo will be placed
 */

function takePhoto(source, canvas) {
    // Establish the scale according video feed and canvas dimensions

    var scale = Math.min(canvas.width / source.width, canvas.height / source.height);

    var x = (canvas.width / 2) - (source.width / 2) * scale;
    var y = (canvas.height / 2) - (source.height / 2) * scale;

    // "Take the picture"

    canvas.getContext('2d').drawImage(
        source,
        x, y, source.width * scale, source.height * scale);

    // canvas.getContext('2d').beginPath();
    // canvas.getContext('2d').moveTo(0, 0);
    // canvas.getContext('2d').lineTo(canvas.width, canvas.height);
    // canvas.getContext('2d').strokeStyle = 'red';
    // canvas.getContext('2d').stroke();
}

////////////////////////////////////////////////////////////////////////////////////

/**
 * Adjusts video dimensions according feed's metadata
 * 
 * @param {Event} event - LoadedMetadata event
 * @param {HTMLVideoElement} display - video feed from webcam
 */

function adjustDisplay(event, display) {
    var sourceDimension = videoDimensions(display);

    display.width = sourceDimension.width;
    display.height = sourceDimension.height;
}

/**
 * Adjusts canvas dimensions according video's feed
 * 
 * @param {HTMLVideoElement} source - video feed from webcam
 * @param {HTMLCanvasElement} canvas - canvas where photo will be stored
 */

function adjustCanvas(source, canvas) {

    ratio = source.width / source.height;

    canvas.style.width = '100%';
    canvas.width = canvas.offsetWidth; // ...then set the internal size to match

    canvas.style.height = canvas.width / ratio;
    canvas.height = canvas.width / ratio;
}

/**
 * Establish the real dimensions of the video feed
 * Read on: https://stackoverflow.com/questions/17056654/getting-the-real-html5-video-width-and-height
 * 
 * @param {HTMLVideoElement} video - video feed from webcam
 */

function videoDimensions(video) {
    // Ratio of the video's intrisic dimensions
    var videoRatio = video.videoWidth / video.videoHeight;
    // The width and height of the video element
    var width = video.offsetWidth,
        height = video.offsetHeight;
    // The ratio of the element's width to its height
    var elementRatio = width / height;
    // If the video element is short and wide
    if (elementRatio > videoRatio) width = height * videoRatio;
    // It must be tall and thin, or exactly equal to the original ratio
    else height = width / videoRatio;
    return {
        width: width,
        height: height
    };
}

////////////////////////////////////////////////////////////////////////////////////

/**
 * Video feed constraints
 */

constraints = {
    audio: false,
    video: true
};

/**
 * Starts the video feed from the webcam
 */

async function initialize() {
    // Check if there is a previous video feed active

    if (display.srcObject != null) {
        alert("There is camera feed is already on!");
        return false;
    }

    // Starts the video feed from the webcam using MediaDevice

    await navigator.mediaDevices.getUserMedia(constraints)
        .then(function(stream) {
            var display = document.querySelector('#display');
            display.srcObject = stream;
        })
        .catch(function(err) {
            alert("ERROR: " + err.toString());
        });
}

////////////////////////////////////////////////////////////////////////////////////

/**
 * Mutes/unmutes the video feed
 */

function toggleMute() {
    // Check if there is an active video feed to work on

    if (display.srcObject == null) {
        alert("There is camera feed is off!");
        return false;
    }

    // Updates the button's label accordingly

    var mute = document.querySelector('#mute');

    mute.textContent = (mute.textContent == "Mute") ? "Unmute" : "Mute";

    // Get the media stream tracks from feed

    var mediaStreamTracks = display.srcObject.getVideoTracks();

    // Mutes/unmutes the tracks found from feed

    mediaStreamTracks.forEach((element, index) => {
        element.enabled = !element.enabled;
    });
}

////////////////////////////////////////////////////////////////////////////////////

/**
 * Pauses/unpauses the video feed
 */

function togglePause() {
    // Check if there is an active video feed to work on

    if (display.srcObject == null) {
        alert("There is camera feed is off!");
        return false;
    }

    var pause = document.querySelector('#pause');

    // Pauses/unpauses the video feed

    if (pause.textContent == "Pause")
        display.pause();
    else
        display.play();

    // Updates the button's label accordingly

    pause.textContent = (pause.textContent == "Pause") ? "Unpause" : "Pause";
}

////////////////////////////////////////////////////////////////////////////////////

/**
 * Closes the video feed from webcam
 */

function shutdown() {
    // Check if there is an active video feed to work on

    if (display.srcObject == null) {
        alert("There is camera feed is off!");
        return false;
    }

    // Get the media stream tracks from feed

    var mediaStreamTracks = display.srcObject.getVideoTracks();

    // Stops the tracks found from feed

    mediaStreamTracks.forEach((element, index) => {
        element.stop();
    });

    display.srcObject = null;
}

////////////////////////////////////////////////////////////////////////////////////

/**
 * Preload required images
 */

function preloadOverlayImages() {
    var images = [];

    image = new Image();
    image.src = "images/kablam-Number-Animals-1.png";
    images.push(image);
    image = new Image();
    image.src = "images/kablam-Number-Animals-2.png";
    images.push(image);
    image = new Image();
    image.src = "images/kablam-Number-Animals-3.png";
    images.push(image);
    image = new Image();
    image.src = "images/kablam-Number-Animals-4.png";
    images.push(image);
    image = new Image();
    image.src = "images/kablam-Number-Animals-5.png";
    images.push(image);

    return images;
}


/**
 * Count of reminders shown up to now
 */

var reminderShown = 0;

/**
 * Interval to take between reminders
 */

var reminder = null;

/**
 * Activate the overlay showing the reminder's countdown
 */

function activateOverlay() {
    // window.scroll({
    //     top: 0,
    //     left: 0,
    //     behavior: 'smooth'
    // });

    // Resets the counter of reminder's shown

    reminderShown = 0;

    // Starts a new interval to show the reminders

    reminder = setInterval(function() {
        // Show the overlay with the reminder image (based on this index)

        showOverlay(SHOOT_TIMER / 1000 - reminderShown - 1);

        // Registers this reminder shown

        reminderShown++;

        // Checks if this is the last reminder to show to stop the interval

        if (reminderShown * 1000 >= SHOOT_TIMER) {
            // Hide current reminder

            hideOverlay();

            // Destroys this interval

            clearInterval(reminder);
        }
    }, SHOOT_REMINDER);
}

/**
 * Shows overlay with an image according the specified index
 * 
 * @param {int} index - position in array of image to show on overlay
 */

function showOverlay(index) {
    // Set the image to show

    var img = document.querySelector("#overlay img");
    img.src = overlayImages[index].src;

    // Show the overlay

    var overlay = document.getElementById("overlay");
    overlay.style.display = "block";
}

/**
 * Hides overlay 
 */

function hideOverlay() {
    // Hide the overlay

    var overlay = document.getElementById("overlay");
    overlay.style.display = "none";
}

////////////////////////////////////////////////////////////////////////////////////
letters = ["α","β","γ","δ","ε","ζ","η","θ","ι","κ","λ","μ","ν","ξ","ο","π","ρ","σ (ς)","τ","υ","φ","χ","ψ","ω"];
letterSoundBuffers = [];

function loadSoundBuffer(url){
	console.log("try loading url: "+url);
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';

    // Decode asynchronously
    request.onload = function(e) {
		console.log(e);
		context.decodeAudioData(request.response, function(buffer) {
			letterSoundBuffers.push(buffer);
		}, onError);
    }
    request.send();
}

//# Setup Audio Engine
var audioContext;
var bufferLoader;
function setupAudioEngine() {
    try {
		audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }catch(e){
		alert('Web Audio API is not supported in this browser');
    }

	for(var i=0;i<letters.length;i++){
		var soundURL = "./audio/"+letters[i]+".m4a";
		var soundBuffer = loadSoundBuffer(soundURL);
		letterSoundBuffers.push(soundBuffer);
	}
}

function playSound(buffer) {
    var source = context.createBufferSource(); // creates a sound source
    source.buffer = buffer;                    // tell the source which sound to play
    source.connect(context.destination);       // connect the source to the context's destination (the speakers)
    source.noteOn(0);                          // play the source now
}

function finishedLoading(bufferList) {
    // Create two sources and play them both together.
    var source1 = audioContext.createBufferSource();
    var source2 = audioContext.createBufferSource();
    source1.buffer = bufferList[0];
    source2.buffer = bufferList[1];

    source1.connect(audioContext.destination);
    source2.connect(audioContext.destination);
    source1.noteOn(0);
    source2.noteOn(0);
}


//# Make each cell into a button
const cells = document.querySelectorAll('td:not(.unclickable)');
let selectedCell = null;
cells.forEach(cell => {
	cell.addEventListener('click', () => {
		if(blockAllCells) return;
			
		if(selectedCell) selectedCell.classList.remove('selected');
		cell.classList.add('selected');
		selectedCell = cell;

		var myLetter = cell.textContent.toLowerCase();
		guessLetter(myLetter);
	});
});

function resetCellStates(){
	blockAllCells = false;
	cells.forEach(cell => {
		cell.classList.remove('selected');
		cell.classList.remove('selected-right');
		cell.classList.remove('selected-wrong');
	});	
}

//# Load UI Elements
const gameButton = document.getElementById("gameButton");
const scoreText = document.getElementById("scoreText");
const highscoreText = document.getElementById("highscoreText");
const hearAgainButton = document.getElementById("hearAgainButton");

blockAllCells = true;
blockStartButtons = true;

//# Instructions Popup
const popupInstruct = document.getElementById('popup-on-start');
document.getElementById('popup-on-start-text').innerHTML = "Start in training mode. Click a letter to hear its name.\nThen click \"Start Game\" to hear a random name,\n and click which letter you think it is.\n\nSay the letters outloud aloud to learn them faster!\n\n\n\n(click the message box to make this go away)";
popupInstruct.style.display = 'block';
popupInstruct.addEventListener('click', function() {
    this.style.display = 'none';
	blockAllCells = false;
	blockStartButtons = false;
	setupAudioEngine();
});

//# Post-Game Popup
const popup = document.getElementById('popup');
popup.style.display = 'none';
popup.addEventListener('click', function() {
    this.style.display = 'none';
	resetCellStates();
});

//# Game flow
letterToGuess = undefined;
isGameRunning = false;
function chooseNextLetter(){
	resetCellStates();
	
	// Choose new random letter, avoid immediate repeats
	var lastLetter = letterToGuess;
	do{
		letterToGuess = letters[Math.floor(Math.random()*letters.length)];
	}while(lastLetter == letterToGuess);
	console.log(`Game start! Secret letter symbol (You had better not be cheating!): ${letterToGuess}`);
	
	playLetterToGuess();
}

function onGameButton(){
	if(blockStartButtons) return;
	
	resetCellStates();
	
	if(!isGameRunning){
		isGameRunning = true;
			
		setScore(0);
		guessHistory = [];
		popup.style.display = 'none';
		
		// Swap Button States
		gameButton.textContent = "Quit Game";
		gameButton.classList.remove('start-button');
		gameButton.classList.add('quit-button');
		
		hearAgainButton.classList.remove("invalid-button");
		hearAgainButton.classList.add("hear-letter-again-button");

		// Choose letter
		chooseNextLetter();
	}else{
		gameEnd();
	}
}

function playLetterToGuess(){
	if(!isGameRunning) return;
	document.getElementById(`audio-${letterToGuess}`).play();
}

function guessLetter(letter){
	var soundID = `audio-${letter}`;
	
	if(!isGameRunning){
		document.getElementById(soundID).play();
		return;
	}
	
	const audio = document.getElementById(soundID);
	audio.letter = letter;
	
	if(letter == letterToGuess){
		setScore(score+1);
		guessHistory.push(letter);
		
		audio.addEventListener("ended", function(e){ 
			var letter = e.srcElement.letter;
			var cell = document.getElementById(letter);
			cell.classList.remove('selected');
			cell.classList.add('selected-right');
			
			const audio = document.getElementById("audio-right");
			audio.addEventListener("ended", chooseNextLetter, { once: true });
			audio.play();
		}, { once: true });
	}else{
		blockAllCells = true;
		audio.addEventListener("ended", function(e){
			var letter = e.srcElement.letter;
			var cell = document.getElementById(letter);
			cell.classList.remove('selected');
			cell.classList.add('selected-wrong');
			
			//var nextSoundID = "audio-wrong"+(1+Math.floor(Math.random()*4));
			var nextSoundID = "audio-wrong0";
			const audio = document.getElementById(nextSoundID);
			audio.addEventListener("ended", gameEnd, { once: true });
			audio.play();
		}, { once: true });
	}
	
	audio.play();
}

function gameEnd(){
	if(!isGameRunning) return;
	isGameRunning = false;

	resetCellStates();

	gameButton.textContent = "Start Game";
	gameButton.classList.remove('quit-button');
	gameButton.classList.add('start-button');

	hearAgainButton.classList.remove("hear-letter-again-button");
	hearAgainButton.classList.add("invalid-button");
	
	// Confetti every letter guessed this game
	for(var i = 0; i < guessHistory.length; i++){
		confetti({
			spread: 180,
			ticks: 200,
			gravity: 0.6,
			decay: 0.94,
			startVelocity: 18,
			particleCount: 1,
			scalar: 6,
			
			shapes: ["emoji"],
			shapeOptions: {
				emoji: {
					particles: {
						size: {
							value: 25
						}
					},
					value: [guessHistory[i]]
				},
			}
		});
	}

	//🚧 save highscore
	
	if(score > highscore){
		document.getElementById("audio-new-highscore").play();

		confetti({
			spread: 360,
			ticks: 200,
			gravity: 1,
			decay: 0.94,
			startVelocity: 30,
			particleCount: 10,
			scalar: 3,
			
			shapes: ["polygon"],
			shapeOptions: {
				polygon:{
					particles: {
						size: {
							value: 4
						}
					}
				}
			}
		});
		
		setHighscore(score);

		var popupText = `NEW HIGHSCORE!\n\nScore: ${score}\nHighscore: ${highscore}\n\nNice job, try again to get even more!`;
	}else var popupText = `Score: ${score}\nHighscore: ${highscore}\n\nTry again to get a new highscore!`;
	
	blockAllCells = true;
	popup.innerText = popupText;
	popup.style.display = "block";
}

function setScore(newScore){
	score = newScore;
	scoreText.textContent = `Score: ${score}`;
}

function setHighscore(newScore){
	highscore = newScore;
	createCookie(highscoreCookieName, highscore, 400); // 400 is max lifespan I think
	highscoreText.textContent = `Highscore: ${highscore}`;
}

//# Load Highscore
const highscoreCookieName = "greek_alphabet_trainer__highscore";
var highscoreCookie = parseInt(getCookie(highscoreCookieName));
setHighscore(isNaN(highscoreCookie) ? 0 : highscoreCookie);

function getCookie(c_name) {
	if(document.cookie.length > 0){
		c_start = document.cookie.indexOf(c_name + "=");
		if (c_start != -1) {
			c_start = c_start + c_name.length + 1;
			c_end = document.cookie.indexOf(";", c_start);
			if (c_end == -1) {
				c_end = document.cookie.length;
			}
			return unescape(document.cookie.substring(c_start, c_end));
		}
	}
	return "";
}

function createCookie(name, value, days) {
	var expires;
	if(days){
		var date = new Date();
		date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
		expires = "; expires=" + date.toGMTString();
	}else expires = "";
	
	document.cookie = name + "=" + value + expires + "; path=/";
}

// Cookie code modified from https://stackoverflow.com/questions/4825683/how-do-i-create-and-read-a-value-from-cookie-with-javascript

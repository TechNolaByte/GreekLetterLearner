blockAllCells = true;
blockStartButtons = true;

//# Instructions Popup
const popupInstruct = document.getElementById('popup-on-start');
document.getElementById('popup-on-start-text').innerHTML = "Start in training mode. Click a letter to hear its name.\nThen click \"Start Game\" to hear a random name,\n and click which letter you think it is.\n\nSay the letters outloud aloud to learn them faster!\n\n\n\n(click the message box to make this go away)";
popupInstruct.style.display = 'block';
isLoadingAudio = false;
popupInstruct.addEventListener('click', function(){
	if(isLoadingAudio) return;
	isLoadingAudio = true;
	document.getElementById('popup-on-start-text').innerHTML = "LOADING AUDIO...";
	setupAudioEngine();
});

//# Setup Audio Engine, Preload Sound files, and Pre-Parse Buffers
var audioContext;
function setupAudioEngine(){
    try {
		audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }catch(e){
		alert('Web Audio API is not supported in this browser');
    }

	for(var i=0;i<soundsToPreload.length;i++){
		loadSoundBuffer(soundsToPreload[i]);
	}
}

soundsToPreload = [
"α.m4a","β.m4a", "γ.m4a", "δ.m4a", "ε.m4a", "ζ.m4a", "η.m4a", "θ.m4a", "ι.m4a", "κ.m4a", "λ.m4a", "μ.m4a", "ν.m4a", "ξ.m4a", "ο.m4a", "π.m4a", "ρ.m4a", "σ (ς).m4a", "τ.m4a", "υ.m4a", "φ.m4a", "χ.m4a", "ψ.m4a", "ω.m4a",
"new-highscore.mp3","right.mp3",
"hit-01.m4a","hit-02.m4a","hit-03.m4a","hit-04.m4a","hit-05.m4a","hit-06.m4a",
"whole_alphabet.m4a",
"you-guessed-a-hinted-letter.m4a",
"hint-01.m4a","hint-02.m4a","hint-03.m4a","hint-04.m4a","hint-05.m4a","hint-06.m4a","hint-07.m4a","hint-08.m4a","hint-09.m4a","hint-10.m4a","hint-11.m4a","hint-12.m4a",
"no-more-hints.m4a"
];
soundCountToLoad = soundsToPreload.length;
soundBuffers = {};

isUpperCase = false;
function changeCase(){
	const cells = document.querySelectorAll('td:not(.unclickable)');
	cells.forEach(cell => {
		if(isUpperCase){
			cell.textContent = cell.textContent.toLowerCase();
			if(cell.textContent == "σ (σ)") cell.textContent = "σ (ς)";
		}else cell.textContent = cell.textContent.toUpperCase();
		
	});
	
	isUpperCase = !isUpperCase;
	
	caseButton.textContent = "Case: "+(isUpperCase ? "Upper" : "Lower");
}

function loadSoundBuffer(soundID){
	var url = "./audio/"+soundID;

    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';

	request.soundID = soundID;
    request.onload = function(e) {
		audioContext.decodeAudioData(request.response, function(buffer){
			console.log("Parsed buffer for ("+request.soundID+")");
			soundBuffers[""+request.soundID] = buffer;
			
			soundCountToLoad--;
			if(soundCountToLoad == 0) finishedLoadingAllSounds();
		}, function(e){
			console.log("Error loading buffer for soundID ("+request.soundID+")");
			console.log(e);
		});
    }
    request.send();
}

function finishedLoadingAllSounds(){
	console.log("finished loading audio!");
	popupInstruct.style.display = 'none';
	blockAllCells = false;
	blockStartButtons = false;
}

function playSound(soundID, callback){
	var buffer = soundBuffers[""+soundID];
	if(buffer == undefined){
		console.log("Tried to play invalid sound!");
		console.log("Tried to play:"+soundID);
		console.log("Valid Sounds:"+JSON.stringify(soundBuffers));
	}
	
    var source = audioContext.createBufferSource();
    source.buffer = buffer;
    if(callback) source.onended = callback;
    source.connect(audioContext.destination);
    source.start();
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
		if(myLetter == "σ (σ)") myLetter = "σ (ς)";
		guessLetter(myLetter);
	});
});

function resetCellStates(){
	blockAllCells = false;
	cells.forEach(cell => {
		cell.classList.remove('selected');
		cell.classList.remove('selected-right');
		cell.classList.remove('selected-wrong');
		cell.classList.remove('selected-hint');
	});	
}

//# Load UI Elements
const gameButton = document.getElementById("gameButton");
const scoreText = document.getElementById("scoreText");
const highscoreText = document.getElementById("highscoreText");
const hearAgainButton = document.getElementById("hearAgainButton");
const caseButton = document.getElementById("changeCaseButton");
const wholeAlphabetButton = document.getElementById("wholeAlphabet");
const giveMeAHintButton = document.getElementById("giveMeAHintButton");

//# Hide Post-Game Popup
const popup = document.getElementById('popup');
popup.style.display = 'none';
popup.addEventListener('click', function() {
    this.style.display = 'none';
	resetCellStates();
});

//# Game flow
letters = ["α","β","γ","δ","ε","ζ","η","θ","ι","κ","λ","μ","ν","ξ","ο","π","ρ","σ (ς)","τ","υ","φ","χ","ψ","ω"];
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
		hasSetNewHighscore = false;
		guessHistory = [];
		popup.style.display = 'none';
		
		// Swap Button States
		gameButton.textContent = "Quit Game";
		gameButton.classList.remove('start-button');
		gameButton.classList.add('quit-button');
		
		hearAgainButton.classList.remove("invalid-button");
		hearAgainButton.classList.add("hear-letter-again-button");
		
		giveMeAHintButton.classList.remove("invalid-button");
		giveMeAHintButton.classList.add("give-me-a-hint-button");
		
		wholeAlphabetButton.classList.remove("whole-alphabet-button");
		wholeAlphabetButton.classList.add("invalid-button");

		// Choose letter
		chooseNextLetter();
	}else{
		gameEnd();
	}
}

function playLetterToGuess(){
	if(!isGameRunning) return;
	playSound(letterToGuess+".m4a");
}

function shuffle(array){
    var currentIndex = array.length;
    var randomIndex, temp;
    while(currentIndex > 0){
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        var temp = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temp;
    }
}
hint_sound_effects = ["hint-01.m4a","hint-02.m4a","hint-03.m4a","hint-04.m4a","hint-05.m4a","hint-06.m4a","hint-07.m4a","hint-08.m4a","hint-09.m4a","hint-10.m4a","hint-11.m4a","hint-12.m4a"];
shuffle(hint_sound_effects);
hint_sound_effects_index = -1;
console.log(hint_sound_effects);
hint_is_blocked = false;
function giveAHint(){
	if(!isGameRunning) return;
	if(hint_is_blocked || blockAllCells) return;
	
	setScore(score-1);
	
	mark_cell = function(letter){ 
		var cell = document.getElementById(letter)
		cell.classList.remove('selected');
		cell.classList.add('selected-hint');
	}
	
	var not_it_letters = [];
	for(var i = 0; i < letters.length; i++){
		var try_letter = letters[i];
		if(try_letter != letterToGuess && !document.getElementById(try_letter).classList.contains('selected-hint')){
			not_it_letters.push(try_letter);
		}
	}

	shuffle(not_it_letters);
	if(not_it_letters.length > 0){
		hint_sound_effects_index++;
		if(hint_sound_effects_index > hint_sound_effects.length){
			shuffle(hint_sound_effects);
			hint_sound_effects_index = 0;
		}
		
		hint_is_blocked = true;
		blockAllCells = true;
		playSound(hint_sound_effects[hint_sound_effects_index], function(){ hint_is_blocked = false; blockAllCells = false; });
		
		mark_cell(not_it_letters.pop())
		if(not_it_letters.length > 0) mark_cell(not_it_letters.pop())
		if(not_it_letters.length > 0) mark_cell(not_it_letters.pop())
	}else{
		hint_is_blocked = true;
		blockAllCells = true;
		playSound("no-more-hints.m4a", function(){ hint_is_blocked = false; blockAllCells = false; });
	}
}

function guessLetter(letter){
	var soundID = letter+".m4a";
	
	if(!isGameRunning){
		playSound(soundID);
		return;
	}
	
	var callback;
	if(letter == letterToGuess){
		setScore(score+1);
		guessHistory.push(letter);
		
		callback = function(e){ 
			var cell = document.getElementById(letter);
			cell.classList.remove('selected');
			cell.classList.add('selected-right');
			
			playSound("right.mp3", chooseNextLetter);
		}
	}else{
		callback = function(e){ 
			var cell = document.getElementById(letter);
			cell.classList.remove('selected');
			cell.classList.add('selected-wrong');
			
			if(cell.classList.contains('selected-hint')){
				playSound("you-guessed-a-hinted-letter.m4a", function(){ blockAllCells = false; });
			}else{
				wrong_sounds = ["hit-01.m4a","hit-02.m4a","hit-03.m4a","hit-04.m4a","hit-05.m4a","hit-06.m4a"];
				shuffle(wrong_sounds);
				playSound(wrong_sounds.pop(), gameEnd);
			}
		}
	}
	
	blockAllCells = true;
	playSound(soundID, callback);
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
	
	giveMeAHintButton.classList.remove("give-me-a-hint-button");
	giveMeAHintButton.classList.add("invalid-button");
	
	wholeAlphabetButton.classList.remove("invalid-button");
	wholeAlphabetButton.classList.add("whole-alphabet-button");
	
	// Confetti every letter guessed this game
	for(var i = 0; i < guessHistory.length; i++){
		confetti({
			spread: 180,
			ticks: 200,
			gravity: 0.4,
			decay: 0.94,
			startVelocity: 18,
			particleCount: 1,
			scalar: 6,
			
			shapes: ["emoji"],
			shapeOptions: {
				emoji: {
					particles: {
						size: {
							value: 32
						}
					},
					value: [guessHistory[i]]
				},
			}
		});
	}

	if(hasSetNewHighscore){
		playSound("new-highscore.mp3");

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

		var popupText = `NEW HIGHSCORE!\n\nScore: ${score}\nHighscore: ${highscore}\n\nNice job, try again to get even more!`;
	}else var popupText = `Score: ${score}\nHighscore: ${highscore}\n\nTry again to get a new highscore!`;
	
	blockAllCells = true;
	popup.innerText = popupText;
	popup.style.display = "block";
}

hasSetNewHighscore = false;
function setScore(newScore){
	score = newScore;
	scoreText.textContent = `Score: ${score}`;
	
	if(score > highscore){
		hasSetNewHighscore = true;
		setHighscore(score, true);
	}
}

function setHighscore(newScore, updateText = true){
	highscore = newScore;
	createCookie(highscoreCookieName, highscore, 400); // 400 is max lifespan I think
	if(updateText) highscoreText.textContent = `Highscore: ${highscore}`;
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

function playWholeAlphabet(){
	if(isGameRunning) return;
	playSound("whole_alphabet.m4a");
}
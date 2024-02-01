let fieldArray = []; //"clear", "cross", "circle"
let ownPoints = 0;
let enemyPoints = 0;
let hasTurn = true;
let activeGame = false;
let ownState;
let enemyState;
let Body = document.getElementById("body")
let statusText = document.getElementById("status-text")
let peer;
let connection;
const hostState = "cross";

initializeGame();

async function initializeGame() {
    peer = await setupPeer();
    displayConnectionStatus();
    statusText.innerHTML = ""
    Body.style = "background: #212529"
}

function startGame() {
    activeGame = true;
    clearField();


}

function clearField() {
    for (let i = 0; i < 9; i++) {
        setField(i, "clear");
    }
}

function setField(fieldIndex, value) {
    fieldArray[fieldIndex] = value;
    let fieldElement = document.getElementById(fieldIndex);
    if (value == "cross") {
        fieldElement.classList.add("bi", "bi-x-lg");
        fieldElement.classList.remove("bi-circle");
    }
    if (value == "circle") {
        fieldElement.classList.add("bi", "bi-circle");
        fieldElement.classList.remove("bi-x-lg");
    }
    if (value == "clear") {
        fieldElement.classList.remove("bi", "bi-x-lg", "bi-circle");
    }

    if (value != "clear") {
        let gameIsFull = gameFull();
        let gameWon = validateGame();
    
        if (gameWon == "clear") {
            if (gameIsFull) {
                endGame();
                statusText.innerHTML = "Unentschieden"
                Body.style = "background: #f3f354"
            }
    
            return;
        }
    
        endGame();
    
        if (gameWon == "cross") {
            statusText.innerHTML = "Kreuz hat gewonnen!"
            Body.style = "background: #fe447d"
        }
        if (gameWon == "circle") {
            statusText.innerHTML = "Kreis hat gewonnen!"
            Body.style = "background: #5cd05b"
        }
    }
}

function endGame() {
    activeGame = false;
}

function fieldClicked(element) {
    let index = element.id

    if (fieldArray[index] != "clear" || activeGame == false || hasTurn == false) {
        return;
    }

    sendMessage("set-field", index);
    setHasTurn(false, true);
    setField(index, ownState);
    sendMessage("your-turn", true);

}

function validateGame() {
    if (fieldArray[0] == fieldArray[1]
        && fieldArray[1] == fieldArray[2]
        && fieldArray[0] != "clear") {
        return fieldArray[0];
    }
    if (fieldArray[3] == fieldArray[4]
        && fieldArray[4] == fieldArray[5]
        && fieldArray[3] != "clear") {
        return fieldArray[3];
    }
    if (fieldArray[6] == fieldArray[7]
        && fieldArray[7] == fieldArray[8]
        && fieldArray[6] != "clear") {
        return fieldArray[6];
    }
    if (fieldArray[0] == fieldArray[3]
        && fieldArray[3] == fieldArray[6]
        && fieldArray[0] != "clear") {
        return fieldArray[0];
    }
    if (fieldArray[1] == fieldArray[4]
        && fieldArray[4] == fieldArray[7]
        && fieldArray[1] != "clear") {
        return fieldArray[1];
    }
    if (fieldArray[2] == fieldArray[5]
        && fieldArray[5] == fieldArray[8]
        && fieldArray[2] != "clear") {
        return fieldArray[2];
    }
    if (fieldArray[0] == fieldArray[4]
        && fieldArray[4] == fieldArray[8]
        && fieldArray[0] != "clear") {
        return fieldArray[0];
    }
    if (fieldArray[2] == fieldArray[4]
        && fieldArray[4] == fieldArray[6]
        && fieldArray[2] != "clear") {
        return fieldArray[2];
    }
    return "clear";
}

function gameFull() {
    for (let i = 0; i < 9; i++) {
        if (fieldArray[i] == "clear") {
            return false;
        }
    }

    return true;
}

function sendMessage(action, value) {
    connection.send(JSON.stringify({
        action: action,
        value: value
    }));
}

function displayConnectionStatus() {
    let ownId = document.getElementById("connection-id");
    let connectionId = document.getElementById("enemy-id");
    let connectionBtn = document.getElementById("connect-btn");
    let status = document.getElementById("status-text");

    // Wenn ein Peer objekt existiert und zum broker verbunden ist, zeige die eigene Id an
    if (peer && peer.id) {
        ownId.innerHTML = peer.id;
    }

    console.log(connection);

    // Wenn eine aktive Verbindung besteht, sperre die Eingabefelder
    if (connection && connection.open) {
        connectionId.setAttribute("disabled", null);
        connectionId.value = connection.peer;
        connectionBtn.setAttribute("disabled", null);
        connectionBtn.innerHTML = "Verbunden";
        status.innerHTML = "Verbunden mit Gegenspieler";
    }
    else {
        connectionId.removeAttribute("disabled");
        connectionBtn.removeAttribute("disabled");
        connectionBtn.innerHTML = "Verbinden";
        status.innerHTML = "Kein Gegenspieler";
    }
}

function dataRecieved(data) {
    // Bastel aus unserem JSON String das Objekt zusammen
    data = JSON.parse(data);

    switch (data.action) {
        case "your-turn":
            setHasTurn(data.value, true);
            break;

        case "set-field":
            setField(data.value, enemyState);
            break;

        case "restart":
            startGame();
            break;

        default:
            break;
    }
}

// Erstellt einen Peer und wartet, bis er bereit ist
async function setupPeer() {
    let peer = new Peer(
        {
            debug: 3 // Schalte debug logs an
        }
    );

    // Warte bis der Peer geöffnet ist
    await new Promise(resolve => peer.on('open', resolve));

    console.log(peer.id);

    peer.on('connection', con => playerJoined(con))

    return peer;
}

function setupConnection(con) {
    // Die Funktion, die bei einem Fehler mit der Host-Verbindung ausgeführt werden soll
    con.on('error', function (error) {
        console.error(error); // Gib lediglich den Fehler aus
    });

    // Die Funktion, die bei dem erhalt von Daten über die Host-Verbindung ausgeführt werden soll
    con.on('data', dataRecieved);

    // Die Funktion, die bei Trennen der Verbindung zum Host ausgeführt werden soll
    con.on('close', () => {
        console.log("Connection closed");
        endGame();
        displayConnectionStatus()
    });
}

async function playerJoined(con) {
    // Wenn noch peer objekt noch nicht initilalisiert, breche ab
    if (!peer) {
        return;
    }

    await new Promise(resolve => con.on('open', resolve));

    setupConnection(con);
    connection = con;

    displayConnectionStatus();

    ownState = hostState;
    enemyState = (hostState == "cross") ? "circle" : "cross";

    // Punkte zurücksetzen
    ownPoints = 0;
    enemyPoints = 0;

    startGame();

    // Randomize who will start
    if (Math.random() < 0.5) {
        setHasTurn(true, true);

        connection.send(JSON.stringify({
            action: "your-turn",
            value: false
        }));
    }
    else {
        setHasTurn(false, true);

        connection.send(JSON.stringify({
            action: "your-turn",
            value: true
        }));
    }

}

async function joinGame(id) {
    // Wenn peer objekt noch nicht initilalisiert, breche ab
    if (!peer) {
        return;
    }

    // Mit dem host verbinden
    let hostConnection = peer.connect(id);
    await new Promise(resolve => hostConnection.on('open', resolve));

    setupConnection(hostConnection);
    connection = hostConnection;

    displayConnectionStatus();

    enemyState = hostState;
    ownState = (hostState == "cross") ? "circle" : "cross";

    // Punkte zurücksetzen
    ownPoints = 0;
    enemyPoints = 0;

    startGame();
    setHasTurn(false, true);
}

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
// Funktion die aufgerufen wird, wenn auf den "Verbinden" Button gedrückt wird
function connectBtnClicked() {
    let idElement = document.getElementById("enemy-id");

    joinGame(idElement.value, peer);
}

// Funktion die aufgerufen wird, wenn auf den "Neustarten" Button gedrückt wird
function restartBtnClicked() {
    // Schicke die Information an den Gegner, dass das Spiel neugestartet werden soll
    connection.send(JSON.stringify({
        action: "restart"
    }));

    startGame();

    // Randomize who will start
    if (Math.random() < 0.5) {
        setHasTurn(true, true);

        connection.send(JSON.stringify({
            action: "your-turn",
            value: false
        }));
    }
    else {
        setHasTurn(false, true);

        connection.send(JSON.stringify({
            action: "your-turn",
            value: true
        }));
    }
}

// Ändere die globale Variable setTurn und zeige den Status des Zuges an
function setHasTurn(value, showStatus) {
    // Wenn kein aktives Spiel existiert, darf hasTurn nicht wahr sein
    if (value && !activeGame) {
        return;
    }

    hasTurn = value;

    let status = document.getElementById("status-text");

    if (value) {
        if (showStatus) {
            status.innerHTML = "Du bist am Zug - " + ownPoints + ":" + enemyPoints;
        }

    }
    else {
        if (showStatus) {
            status.innerHTML = "Der Gegner ist am Zug - " + ownPoints + ":" + enemyPoints;
        }
    }
}
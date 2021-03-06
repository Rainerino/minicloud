var ledChart = {};
var motionChart = {};
var tempChart = {};
var humChart = {};
var dataChart = {};
var ledStatus;
var ledPublishTime;
var cameraPublishTime;
var endpoint = mqttClient.config.endpoint;
var password;
var timeStartPicker;
var timeEndPicker;
var defaultStartTimeDelta = 1000 * 3600 * 24;

// Subscribe to topics
function mqttClientConnectHandler() {
	mqttClient.subscribe("sensor/camera/image");
	mqttClient.subscribe("sensor/led/payload");
	mqttClient.subscribe("sensor/motion/payload");
	mqttClient.subscribe("sensor/temp/payload");
};

// Respond to subscribed topics when they are published to
function mqttClientMessageHandler(topic, payload) {
	var message = 'message: ' + topic + ':' + payload.toString();
	console.log(message);
	var payloadObj = JSON.parse(payload);
	var date = new Date(payloadObj["timeStampIso"]).toLocaleString();

	// If new camera image, display it
	if (topic == "sensor/camera/image") {
		// Calculate delay and display it
		var sender = payloadObj["sender"];
		if (sender == getGoogleToken()) {
			var delay = Date.now() - cameraPublishTime;
			var cameraDelay = document.getElementById("cameraDelay");
			cameraDelay.innerHTML = delay + " ms";
		}

		// Set the image and corresponding text
		setImage(payloadObj);
	}

	// If sensor status changes, add to graph, and update current status
	if (topic == "sensor/led/payload") {
		// Update led status
		ledStatus = payloadObj["status"];

		// Calculate delay and display it
		var sender = payloadObj["sender"];
		if (sender == getGoogleToken()) {
			var delay = Date.now() - ledPublishTime;
			var ledDelay = document.getElementById("ledDelay");
			ledDelay.innerHTML = delay + " ms";
		}

		// Graph the new data point
		var dataLength = ledChart.chart.data.datasets[0].data.length;
		ledChart.chart.data.datasets[0].data[dataLength] = payloadObj["status"];
		ledChart.chart.data.labels[dataLength] = date;
		ledChart.chart.update();

		// Update text 
		setLedButtonStatus(payloadObj["status"]);
		var ledText = document.getElementById("ledStatus");
		var ledUpdated = document.getElementById("ledUpdatedTime");
		ledText.innerHTML = payloadObj["status"] == 1 ? "LED On" : "LED Off";
		ledUpdated.innerHTML = date;
	}
	if (topic == "sensor/motion/payload") {
		var dataLength = motionChart.chart.data.datasets[0].data.length;
		motionChart.chart.data.datasets[0].data[dataLength] = payloadObj["status"];
		motionChart.chart.data.labels[dataLength] = date;
		motionChart.chart.update();

		var motionText = document.getElementById("motionStatus");
		var motionUpdated = document.getElementById("motionUpdatedTime");
		motionText.innerHTML = payloadObj["status"] == 1 ? "Motion Detected" : "No Motion Detected";
		motionUpdated.innerHTML = date;
	}
	// Temperature and humidity data are emitted together
	if (topic == "sensor/temp/payload") {
		var dataLength = tempChart.chart.data.datasets[0].data.length;
		tempChart.chart.data.datasets[0].data[dataLength] = payloadObj["temp"];
		humChart.chart.data.datasets[0].data[dataLength] = payloadObj["humidity"];
		tempChart.chart.data.labels[dataLength] = date;
		humChart.chart.data.labels[dataLength] = date;
		tempChart.chart.update();
		humChart.chart.update();

		var tempText = document.getElementById("tempStatus");
		var tempUpdated = document.getElementById("tempUpdatedTime");
		var humidityText = document.getElementById("humidityStatus");
		var humidityUpdated = document.getElementById("humidityUpdatedTime");

		tempText.innerHTML = payloadObj["temp"] + " \xB0C";
		tempUpdated.innerHTML = date;
		humidityText.innerHTML = payloadObj["humidity"] + "%";
		humidityUpdated.innerHTML = date;
	}
};

mqttClient.on('connect', mqttClientConnectHandler);
mqttClient.on('message', mqttClientMessageHandler);

window.onload = function() {
	setupCurrSensorStatus();
	getCurrImage();
	timeStartPicker = flatpickr("#timeStartPicker", {
		enableTime: true,
		dateFormat: "Y-m-d H:i",
		defaultDate: (new Date().getTime()) - defaultStartTimeDelta,
	});
	timeEndPicker = flatpickr("#timeEndPicker", {
		enableTime: true,
		dateFormat: "Y-m-d H:i",
		defaultDate: new Date(),
	});
	plotCustomGraph();
	var isSignedIn = gapi.auth2.getAuthInstance().isSignedIn.get();
	showSignInPrompt(!isSignedIn)
}

// Get current status of sensors. Display and set up the graphs.
function setupCurrSensorStatus() {
	var xhttp = new XMLHttpRequest();
	xhttp.open("GET", endpoint + "/currstatus");

	xhttp.onload = function(e) {
		if (this.status != 200) {
			console.error("Error getting current sensor status");
			return;
		}

		var sensorStatus = JSON.parse(xhttp.response)["Items"];

		var ledText = document.getElementById("ledStatus");
		var motionText = document.getElementById("motionStatus");
		var tempText = document.getElementById("tempStatus");
		var humidityText = document.getElementById("humidityStatus");

		var ledUpdated = document.getElementById("ledUpdatedTime");
		var motionUpdated = document.getElementById("motionUpdatedTime");
		var tempUpdated = document.getElementById("tempUpdatedTime");
		var humidityUpdated = document.getElementById("humidityUpdatedTime");

		var timeStart = (new Date().getTime()) - defaultStartTimeDelta;

		// Create the graphs for the sensors
		for (var i = 0; i < sensorStatus.length; i++) {
			var date = new Date(sensorStatus[i].payload.timeStampIso).toLocaleString();
			if (sensorStatus[i].sensorId == "led") {
				var status = sensorStatus[i].payload.status;
				status = status == 1 ? "LED On" : "LED Off";
				ledText.innerHTML = status;
				ledUpdated.innerHTML = date;
				ledStatus = sensorStatus[i].payload.status;
				setLedButtonStatus(sensorStatus[i].payload.status);
				setupSensorData("led", document.getElementById('ledChart').getContext('2d'), ledChart, timeStart, null, true);
			}
			if (sensorStatus[i].sensorId == "motion") {
				var status = sensorStatus[i].payload.status;
				status = status == 1 ? "Motion Detected" : "No Motion Detected";
				motionText.innerHTML = status;
				motionUpdated.innerHTML = date;
				setupSensorData("motion", document.getElementById('motionChart').getContext('2d'), motionChart, timeStart, null, true);
			}
			// Temperature and humidity data are emitted together
			if (sensorStatus[i].sensorId == "temp") {
				var temp = sensorStatus[i].payload.temp;
				var humidity = sensorStatus[i].payload.humidity;
				tempText.innerHTML = temp + " \xB0C";
				tempUpdated.innerHTML = date;
				humidityText.innerHTML = humidity + "%";
				humidityUpdated.innerHTML = date;
				setupSensorData("temp", document.getElementById('tempChart').getContext('2d'), tempChart, timeStart, null, true);
				setupSensorData("humidity", document.getElementById('humChart').getContext('2d'), humChart, timeStart, null, true);
			}
		}
	}

	xhttp.send();
}

// Graph data for a given sensor and time range
function setupSensorData(sensor, sensorCtx, sensorChart, timeStart, timeEnd, steppedLine) {
	// Temp and humidity are grouped under temp for API
	var querySensor = sensor;
	if (sensor == "humidity") {
		querySensor = "temp";
	}

	var xhttp = new XMLHttpRequest();
	reqUrl = endpoint + "/status/" + querySensor + "?timestart=" + timeStart
	if (timeEnd) {
		reqUrl += "&timeEnd=" + timeEnd
	}
	xhttp.open("GET", reqUrl);

	xhttp.onload = function(e) {
		if (this.status != 200) {
			console.error("Error getting sensor data");
			return;
		}

		var responseData = JSON.parse(xhttp.response)["Items"];
		console.log(responseData)

		var timeStamps = [];
		var data = [];

		for (var i = 0; i < responseData.length; i++) {
			timeStamps.push(new Date(responseData[i].payload["timeStampIso"]).toLocaleString());
			var val;
			if (sensor == "temp") {
				val = responseData[i].payload["temp"];
			} else if (sensor == "humidity") {
				val = responseData[i].payload["humidity"];
			} else {
				val = responseData[i].payload["status"];
			}
			data.push(val);
		}

		console.log(timeStamps);
		console.log(data);

		if (sensorChart.chart) {
			sensorChart.chart.destroy();
		}

		// createChart(sensor, sensorCtx, sensorChart, data, timeStamps, steppedLine);
		if (sensor == "temp" || sensor == "humidity") {
			createChart(sensor, sensorCtx, sensorChart, data, timeStamps, steppedLine);
		} else {
			createStatusChart(sensor, sensorCtx, sensorChart, data, timeStamps, steppedLine);
		}
	}

	xhttp.send();
}

function createChart(sensor, sensorCtx, sensorChart, data, timeStamps, steppedLine) {
	sensorChart.chart = new Chart(sensorCtx, {
		type: 'line',
		data: {
			labels: timeStamps,
			datasets: [{
				label: sensor + " Status",
				data: data,
				steppedLine: steppedLine,
				backgroundColor: "rgba(153,255,51,0.4)"
			}]
		},
		options: {
			elements: {
				point: {
					radius: 0
				}
			},
			scales: {
				xAxes: [{
					type: 'time',
				}],
				yAxes: [{
					ticks: {
						suggestedMin: 0
					}
				}],
			}
		}
	});
}

function createStatusChart(sensor, sensorCtx, sensorChart, data, timeStamps, steppedLine) {
	sensorChart.chart = new Chart(sensorCtx, {
		type: 'line',
		data: {
			labels: timeStamps,
			datasets: [{
				label: sensor + " Status",
				data: data,
				steppedLine: steppedLine,
				backgroundColor: "rgba(153,255,51,0.4)"
			}]
		},
		options: {
			scales: {
				xAxes: [{
					type: 'time',
				}],
				yAxes: [{
					ticks: {
						min: 0,
						max: 1,
						stepSize: 1,
						suggestedMin: 0,
						suggestedMax: 1,
						callback: function(label, index, labels) {
							switch (label) {
								case 0:
									return 'OFF';
								case 1:
									return 'ON';
							}
						}
					}
				}],
			}
		}
	});
}

// Get the current camera image and display it
function getCurrImage() {
	var xhttp = new XMLHttpRequest();
	xhttp.open("GET", endpoint + "/getpicture");

	xhttp.onload = function(e) {
		var response = JSON.parse(xhttp.response)["Items"][0]["payload"];
		setImage(response);
	}

	xhttp.send();
}

// Uses the provided response from IoT and sets the camera image, labels, and human detected text accordingly
function setImage(response) {
	var cameraImage = document.getElementById("cameraImage");
	var rekLabels = document.getElementById("rekLabels");
	var imageDate = document.getElementById("imageDate");
	var humanDetected = document.getElementById("humanDetected");

	var src = response["url"];
	var labels = response["labels"];
	var imageDateText = response["timeStampIso"];

	cameraImage.src = src;
	imageDate.innerText = new Date(imageDateText).toLocaleString();

	var isHuman = false;
	var rekText = "";
	for (var i = 0; i < labels.length; i++) {
		isHuman |= labels[i]["Name"] == "Human";
		rekText += "\n" + labels[i]["Name"] + ": " + labels[i]["Confidence"].toFixed(2);
	}
	rekLabels.innerText = rekText;

	humanDetected.innerText = isHuman ? "Human detected" : "No human detected";
}

function setLedButtonStatus(newStatus) {
	var ledButton = document.getElementById("ledButton");
	ledButton.innerHTML = newStatus == "1" ? "Turn LED Off" : "Turn LED On";
}


function onLedButtonClick() {
	var xhttp = new XMLHttpRequest();
	xhttp.open("PUT", endpoint + "/setstatus/led");
	var token = getGoogleToken();
	console.log(token);
	xhttp.setRequestHeader("authorizationToken", token);

	xhttp.onload = function(e) {
		console.log(xhttp.response);
	}

	xhttp.onerror = function(e) {
		alert("You can send commands again in 24 hours");
	}

	var newStatus = ledStatus == "1" ? "0" : "1";

	// Record time published to calculate delay later
	ledPublishTime = Date.now();
	xhttp.send(JSON.stringify({ "status": newStatus, "sender": token }));
}

function onCameraButtonClick() {
	var xhttp = new XMLHttpRequest();
	xhttp.open("POST", endpoint + "/takepicture");
	var token = getGoogleToken();
	xhttp.setRequestHeader("authorizationToken", token);

	xhttp.onload = function(e) {
		console.log(xhttp.response);
	}

	xhttp.onerror = function(e) {
		alert("You can send commands again in 24 hours");
	}

	// Record time published to calculate delay later
	cameraPublishTime = Date.now();
	xhttp.send(JSON.stringify({ "sender": token }));
}

function onGraphButtonClick() {
	plotCustomGraph();
}

function plotCustomGraph() {
	var sensorSelect = document.getElementById("sensorSelect");

	var timeStart = timeStartPicker.selectedDates[0].getTime();
	var timeEnd = timeEndPicker.selectedDates[0].getTime();

	if (timeStart > timeEnd) {
		alert("Time Start cannot be lower than Time End");
		return;
	}

	var steppedLine = false;
	steppedLine = sensorSelect.value == "led" || sensorSelect.value == "motion";
	setupSensorData(sensorSelect.value, document.getElementById('dataChart').getContext('2d'), dataChart, timeStart, timeEnd, steppedLine);
}

function onSignIn(googleUser) {
	// Useful data for your client-side scripts:
	var profile = googleUser.getBasicProfile();
	console.log("ID: " + profile.getId()); // Don't send this directly to your server!
	console.log('Full Name: ' + profile.getName());
	console.log('Given Name: ' + profile.getGivenName());
	console.log('Family Name: ' + profile.getFamilyName());
	console.log("Image URL: " + profile.getImageUrl());
	console.log("Email: " + profile.getEmail());

	// The ID token you need to pass to your backend:
	var id_token = googleUser.getAuthResponse().id_token;
	console.log("ID Token: " + id_token);

	showSignInPrompt(false);
};

function signOut() {
	var auth2 = gapi.auth2.getAuthInstance();
	auth2.signOut().then(function() {
		console.log('User signed out.');
	});

	showSignInPrompt(true);
}

function getGoogleToken() {
	return gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().id_token;
}

function showSignInPrompt(show) {
	if (show) {
		document.getElementById("signInText").style.display = 'block';
		document.getElementById("buttonDiv").style.display = 'none';
		document.getElementById("googleSignout").style.display = 'none';
	} else {
		document.getElementById("signInText").style.display = 'none';
		document.getElementById("buttonDiv").style.display = 'block';
		document.getElementById("googleSignout").style.display = 'block';
	}
}
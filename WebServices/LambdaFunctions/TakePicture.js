const AWS = require('aws-sdk');
const iotData = new AWS.IotData({ endpoint: process.env.AWS_IOT_ENDPOINT });

function returnResult(callback, statusCode, body) {
	callback(null, {
		statusCode: statusCode,
		headers: {
			"Access-Control-Allow-Origin": "*",
		},
		body: JSON.stringify(body)
	});
}

exports.handler = (event, context, callback) => {

	let payload = {};
	let date = new Date();
	payload.timeStampEpoch = date.getTime();
	payload.timeStampIso = date.toISOString();
	payload.sender = event.sender;
	if (event.body) {
		let body = JSON.parse(event.body);
		if (body.sender) {
			payload.sender = body.sender;
		}
	}

	console.log(payload);

	const params = {
		topic: 'sensor/camera/takepicture',
		payload: JSON.stringify(payload)
	};

	iotData.publish(params, (err, res) => {
		if (err) {
			returnResult(callback, 400, "IoT Publish Error");
		}

		console.log(res);
		returnResult(callback, 200, payload);
	});
};
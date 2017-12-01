# minicloud
MiniCloud Database for constrained devices


### Frontend
Written in JS with Chart.js for graphing sensor data. Uses AWS IoT SDK (with Browserify) for IoT topic subscribes.
Consumes AWS API Gateway endpoints to query data and perform IoT publishes. 
Features: Toggle LED, Take Picture, current sensor status, graphing sensor data in a custom time range, displaying camera images from the Pi with computer vision analysis.
Also sends images to Slack, alerting everyone if a human is in the image. 

### Web Services
Contains the Node.js functions to upload to AWS Lambda that can query data and perform IoT publishes (Set LED, Take picture)
These need to be mapped to an AWS API Gateway endpoint.
See http://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-create-api-as-simple-proxy-for-lambda.html for more details.

### Raspberry Pi
The Python code that the Raspberry Pi device runs. Connects to AWS IoT SDK and performs subscribe/publishes. For example, listening 
to taking picture requests from the website, or emitting light sensor status. Uploads pictures taken to S3, and also analyzes them
using AWS Rekognition to check for humans. The picture URL and resulting computer vision labels are sent to the website via an IoT publish. 

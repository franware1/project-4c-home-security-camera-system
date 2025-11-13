Inside the Esp32Cam folder you need to create a config_secrets.h file and paste this:
#pragma once
#define WIFI_SSID "your wifi name"
#define WIFI_PASS "your wifi password"

Inside the backend folder you need to create a .env file and paste this:

ESP_HOST= "esp url host" (once you run the esp it will show it on the serial monitor)
PORT= esp port (same thing the serial monitor will show)

To make the project work: 
1.first the esp gotta be running (once connected to power supply u should press the restart button on the esp), and it will automatically run the airplanemode_active
2. next we gotta run the backend, go to the directory of the backend and run:
    nodemon dev (nodemon is a package that lets u easily rerun the backend on change file)
    You can test if the esp and backend are connecting by going to the Backend listening (will display on the terminal) and add /api/stream (or any api that the esp lets you)
3. the last we gotta run the frontend, go to the frontend directory and run:
    npm run dev
    Should easily run the fronend and it is automatically connected to the backend


There is a .gitignore file to not publish the libraries and secret variables like the wifi pass/name. Usually the first time you get the application on both backend and frontent
you need to run a coomand such as:
    npm i (installing all the requried libraries for the project)

//thanks to zwerch (https://github.com/zwerch) for the blinds model as the basis for this accessory

var request = require("request");
var Service, Characteristic;


module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-httpmulti", "HttpMulti", HttpMulti); 
  console.log("Loading HttpMulti accessory");
}


function HttpMulti(log, config) {
  this.log = log;
  this.up_url = config["up_url"];
  this.down_url = config["down_url"];
  this.open_url = config["open_url"];
  this.close_url = config["close_url"];  
  this.on_url = config["on_url"];
  this.off_url = config["off_url"];
  this.lock_url = config["lock_url"];
  this.unlock_url = config["unlock_url"];
  this.brightness_url = config["brightness_url"];
  if (this.brightness_url === undefined) this.brightness_url = config["speed_url"];
  if (this.brightness_url === undefined) this.brightness_url = config["setpoint_url"];
  this.gettemp_url = config["gettemp_url"];
  this.mode_off_url = config["mode_off_url"];
  this.mode_heat_url = config["mode_heat_url"];
  this.mode_cool_url = config["mode_cool_url"];
  this.mode_auto_url = config["mode_auto_url"];  
  this.unit_type = "C";
  if (config["tempunits"] !== undefined) this.units = config["tempunits"]; 
  this.status_url = config["status_url"];
  this.name = config["name"];
  this.deviceType = config["deviceType"];
  this.method = config["http_method"];
  if (this.method === undefined) this.method = "GET";
  
//TODO add this to ServiceInformation  
  this.serviceName = config["serviceName"];
  if (this.serviceName === undefined) this.serviceName = this.name;
  this.manufacturer = config["accessory"];
  this.model = config["model"];
  if (this.model === undefined) this.model = this.deviceType;
  this.serialNum = config["serialNum"];
  if (this.serialNum === undefined) {
  	var hash;
  	for (var i = 0; i < this.name.length; i++) {
  		var character  = this.name.charCodeAt(i);
        hash  = ((hash<<5)-hash)+character;
        hash = hash & hash; // Convert to 32bit integer
    }
  	this.serialNum = "X"+Math.abs(hash);
  }
  
  if (this.deviceType.toUpperCase() == "BLIND") {
  	this.log("HttpMulti Blind Object Initializing...");
  	    // state vars
    this.lastPosition = 0; // last known position of the blinds, down by default
    this.currentPositionState = 2; // stopped by default
    this.currentTargetPosition = 0; // down by default

    // register the service and provide the functions
    this.service = new Service.WindowCovering(this.name);

    // the current position (0-100%)
    // https://github.com/KhaosT/HAP-NodeJS/blob/master/lib/gen/HomeKitTypes.js#L493
    this.service
        .getCharacteristic(Characteristic.CurrentPosition)
        .on('get', this.getCurrentPosition.bind(this));

    // the position state
    // 0 = DECREASING; 1 = INCREASING; 2 = STOPPED;
    // https://github.com/KhaosT/HAP-NodeJS/blob/master/lib/gen/HomeKitTypes.js#L1138
    this.service
        .getCharacteristic(Characteristic.PositionState)
        .on('get', this.getPositionState.bind(this));

    // the target position (0-100%)
    // https://github.com/KhaosT/HAP-NodeJS/blob/master/lib/gen/HomeKitTypes.js#L1564
    this.service
        .getCharacteristic(Characteristic.TargetPosition)
        .on('get', this.getTargetPosition.bind(this))
        .on('set', this.setTargetPosition.bind(this));
        
        
    } else if (this.deviceType.toUpperCase() == "LIGHT") {
  		this.log("HttpMulti Light Object Initializing...");
    
     	this.lastState = 0; 
    	this.currentState = 0;  
    	this.TargetState = 0;
    	this.lastUpdate = Date.now();

    // register the service and provide the functions
    this.service = new Service.Lightbulb(this.name);

    this.service
        .getCharacteristic(Characteristic.On)
        .on('get', this.getCurrentState.bind(this))
        .on('set', this.setCurrentState.bind(this));

    this.service
        .getCharacteristic(Characteristic.Brightness)
        .on('get', this.getCurrentState.bind(this))
        .on('set', this.setCurrentStatePartial.bind(this));

    } else if (this.deviceType.toUpperCase() == "FAN") {
  		this.log("HttpMulti Fan Object Initializing...");

     	this.lastState = 0; 
    	this.currentState = 0;  
    	this.TargetState = 0;

    // register the service and provide the functions
    this.service = new Service.Fan(this.name);

    this.service
        .getCharacteristic(Characteristic.On)
        .on('get', this.getCurrentState.bind(this))
        .on('set', this.setCurrentState.bind(this));

    this.service
        .getCharacteristic(Characteristic.RotationSpeed)
        .on('get', this.getCurrentState.bind(this))
        .on('set', this.setCurrentStatePartial.bind(this));


    } else if (this.deviceType.toUpperCase() == "SWITCH") {
  	this.log("HttpMulti Switch Object Initializing...");

     	this.lastState = 0; 
    	this.currentState = 0;  
    	this.TargetState = 0;

    // register the service and provide the functions
    this.service = new Service.Switch(this.name);

    this.service
        .getCharacteristic(Characteristic.On)
        .on('get', this.getCurrentState.bind(this))
        .on('set', this.setCurrentState.bind(this));


    } else if (this.deviceType.toUpperCase() == "GARAGEDOOR") {
  	this.log("HttpMulti Garage door Object Initializing...");

 	    // state vars
    this.lastPosition = 0; 
    this.currentPositionState = 0; 
    this.currentTargetPosition = 0; 
    this.lastObstructed = false;

    // register the service and provide the functions
    this.service = new Service.GarageDoorOpener(this.name);

   this.service
        .getCharacteristic(Characteristic.CurrentDoorState)
        .on('get', this.getCurrentPosition.bind(this))
        

    this.service
        .getCharacteristic(Characteristic.TargetDoorState)
        .on('get', this.getTargetPosition.bind(this))
        .on('set', this.setTargetDoorPosition.bind(this));

    this.service
        .getCharacteristic(Characteristic.ObstructionDetected)
        .on('get', this.getObstructed.bind(this));


    } else if (this.deviceType.toUpperCase() == "LOCK") {
  	this.log("HttpMulti Lock Object Initializing...");

     	this.lastState = 0; 
    	this.currentState = 0;  
    	this.TargetState = 0;

    // register the service and provide the functions
    this.service = new Service.LockMechanism(this.name);

    this.service
        .getCharacteristic(Characteristic.LockCurrentState)
        .on('get', this.getCurrentState.bind(this));

    this.service
        .getCharacteristic(Characteristic.LockTargetState)
        .on('get', this.getCurrentState.bind(this))
        .on('set', this.setCurrentLockState.bind(this));

    } else if (this.deviceType.toUpperCase() == "THERMOSTAT") {

     	this.lastState = 0; // 0 OFF, 1 HEAT, 2 COOL
    	this.currentState = 0;  
    	this.TargetState = 0;
     	this.lastTemp = 15;
     	this.currentTemp = 15;
     	this.TargetTemp = 15;
     	this.units = 0; // 0 Celcius, 1 Fahrenheit 
     	if (this.unit_type !== "C") this.units = 1;

   this.service = new Service.Thermostat(this.name);

    this.service
        .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
        .on('get', this.getCurrentState.bind(this));

   this.service
        .getCharacteristic(Characteristic.TargetHeatingCoolingState)
        .on('get', this.getCurrentState.bind(this))
        .on('set', this.setCurrentThermoState.bind(this));

   this.service
        .getCharacteristic(Characteristic.CurrentTemperature)
        .on('get', this.getCurrentTemp.bind(this));

   this.service
        .getCharacteristic(Characteristic.TargetTemperature)
        .on('get', this.getCurrentTemp.bind(this))
        .on('set', this.setCurrentStatePartial.bind(this));


   this.service
        .getCharacteristic(Characteristic.TemperatureDisplayUnits)
        .on('get', this.getCurrentUnits.bind(this))

   
	} else {
		this.log("Unknown device type "+this.deviceType);
	}
  this.log("HttpMulti Initialization complete for "+this.deviceType+":"+this.name+":"+this.serialNum);
}

HttpMulti.prototype.getObstructed = function(callback) {
    this.log("Requested Obstructed: %s", this.lastObstructed);
    callback(null, this.lastObstructed);
}

HttpMulti.prototype.getCurrentPosition = function(callback) {
    this.log("Requested CurrentPosition: %s", this.lastPosition);
    callback(null, this.lastPosition);
}

HttpMulti.prototype.getCurrentState = function(callback) {
    this.log("Requested CurrentState: %s", this.lastState);
    if (this.status_url2 !== undefined) {
    	this.log("Status_URL: %s", this.status_url);
    	this.httpRequest(this.status_url, this.httpMethod, function(error,response,data) {
    		if (error)	{
        		this.log("Error reading status: %s", error.message);
        	} else {
        		this.log("Data returned is: %s", data);
       		}
    	});
    }
    callback(null, this.lastState);
    
}

HttpMulti.prototype.getCurrentUnits = function(callback) {
    this.log("Requested CurrentPosition: %s", this.lastPosition);
    callback(null, this.units);
}

HttpMulti.prototype.getCurrentTemp = function(callback) {
    this.log("Requested CurrentPosition: %s", this.lastPosition);
    callback(null, this.lastTemp);
}

HttpMulti.prototype.getPositionState = function(callback) {
    this.log("Requested PositionState: %s", this.currentPositionState);
    callback(null, this.currentPositionState);
}

HttpMulti.prototype.getTargetPosition = function(callback) {
    this.log("Requested TargetPosition: %s", this.currentTargetPosition);
    callback(null, this.currentTargetPosition);
}


HttpMulti.prototype.setTargetPosition = function(pos, callback) {
    this.log("Set TargetPosition: %s", pos);
    this.currentTargetPosition = pos;
    const moveUp = (this.currentTargetPosition >= this.lastPosition);
    this.log((moveUp ? "Moving up" : "Moving down"));

    this.service
        .setCharacteristic(Characteristic.PositionState, (moveUp ? 1 : 0));
        
	this.log("up="+this.up_url+" down="+this.down_url+" method="+this.httpMethod);
    this.httpRequest((moveUp ? this.up_url : this.down_url), this.httpMethod, function() {
        this.log("Success moving %s", (moveUp ? "up (to 100)" : "down (to 0)"))
        this.service
            .setCharacteristic(Characteristic.CurrentPosition, (moveUp ? 100 : 0));
        this.service
            .setCharacteristic(Characteristic.PositionState, 2);
        this.lastPosition = (moveUp ? 100 : 0);
		this.lastState = (moveUp ? 1 : 0 );
        callback(null);
    }.bind(this));
}

HttpMulti.prototype.setTargetDoorPosition = function(pos, callback) {
    this.log("Set TargetDoorPosition: %s", pos);
    this.currentTargetPosition = pos;
    const moveUp = (this.currentTargetPosition >= this.lastPosition);
    this.log((moveUp ? "Moving up" : "Moving down"));
        
	this.log("up="+this.up_url+" down="+this.down_url+" method="+this.httpMethod);
    this.httpRequest((moveUp ? this.up_url : this.down_url), this.httpMethod, function() {
        this.log("Success moving %s", (moveUp ? "up (to 100)" : "down (to 0)"))
        this.lastPosition = (moveUp ? 100 : 0);
		this.lastState = (moveUp ? 1 : 0 );
        callback(null);
    }.bind(this));
}

HttpMulti.prototype.setCurrentState = function(value, callback) {
    this.log("Set CurrentState: %s", value);
    this.currentTargetState = value;
    this.log((value ? "Turning On" : "Turning Off"));
	if (value == 1 && this.lastState > 1) {
		//It's a dim operation, so don't turn the light on
		this.log("Ignoring on since light is dim?");
		callback(null);
	} else {
		this.log("on="+this.on_url+" off="+this.off_url+" method="+this.httpMethod);
    	this.httpRequest((value ? this.on_url : this.off_url), this.httpMethod, function() {
        	this.log("Success turning %s", (value ? "on" : "off"))
        	this.lastState = value;
        	callback(null);
    	}.bind(this));
    }
}

HttpMulti.prototype.setCurrentThermoState = function(value, callback) {
    this.log("Set CurrentState: %s", value);
    this.currentTargetState = value;
	var myURL;
	if (value == 0) {
		myURL = this.mode_off_url;
		this.log("0 Off "+myURL);
	} else if (value == 1) {
		myURL = this.mode_heat_url;
		this.log("1 HEAT "+myURL);
	}else if (value == 2) {
		myURL = this.mode_cool_url;
		this.log("2 COOL "+myURL);
	} else if (value == 3) {
		myURL = this.mode_auto_url;
		this.log("3 AUTO "+myURL);
	}
    this.httpRequest(myURL, this.httpMethod, function() {
        this.log("Success turning %s", value)
        this.lastState = value;
        	callback(null);
    	}.bind(this));
}

HttpMulti.prototype.setCurrentStatePartial = function(value, callback) {
    this.log("Set Partial State: %s", value);
    this.currentTargetState = value;
//	if (this.lastUpdate > (Date.now() + 1000)) {
	    var myURL = this.brightness_url;
	    if (myURL === undefined) {
        	this.log("Error, brightness URL not defined!");
    	} else {
        	// replace %VALUE% with value in the URL
        	myURL = myURL.replace("%VALUE%",value);
  		}      
		this.log("brightness URL="+myURL);
    	this.httpRequest(myURL, this.httpMethod, function() {
        	this.log("Success turning %s", (value))
        	this.lastState = value;
        	callback(null);
    	}.bind(this));
    	this.lastUpdate = Date.now();
//    } else {
//      this.log("Brightness not changing due to throttle. Last update is: %s", this.lastUpdate);  
//    }
}

HttpMulti.prototype.setCurrentLockState = function(value, callback) {
    this.log("Set LockState: %s", value);
    this.currentTargetState = value;
    this.log((value ? "Locking" : "Unlocking"));

	this.log("lock="+this.lock_url+" unlock="+this.unlock_url+" method="+this.httpMethod);
    this.httpRequest((value ? this.lock_url : this.unlock_url), this.httpMethod, function() {
        this.log("Success turning %s", (value ? "lock" : "unlock"))
        this.lastState = value;

        callback(null);
    }.bind(this));
}


HttpMulti.prototype.httpRequest = function(url, method, callback) {
  request({
    method: method,
    url: url,
  }, function(err, response, body) {
    if (!err && response.statusCode == 200) {
      callback(null);
    } else {
      this.log("Error getting state (status code %s): %s", response.StatusCode, err);
      callback(err);
    }
  }.bind(this));
}

HttpMulti.prototype.getServices = function() {
  return [this.service];
}


//module.exports.accessory = HttpMulti;

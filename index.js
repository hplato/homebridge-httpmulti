//thanks to zwerch (https://github.com/zwerch) for the blinds model as the basis for this accessory

//todo: add in the models & serial #s
//      clean up and refactor the get status

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
  this.mode_url = config["mode_url"];  
  this.unit_type = "C";
  if (config["tempunits"] !== undefined) this.units = config["tempunits"]; 
  this.status_url = config["status_url"];
  this.name = config["name"];
  this.deviceType = config["deviceType"];
  this.method = config["http_method"];
  this.httpMethod = config["http_method"];
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
  
  if (this.deviceType.match(/^blind/i)) {
  	this.log("HttpMulti Blind Object Initializing...");
  	    // state vars
    this.lastPosition = 0; // last known position of the blinds, down by default
    this.lastStatePartial = 0;
    this.currentPositionState = 2; // stopped by default
    this.currentTargetPosition = 0; // down by default

    // register the service and provide the functions
    this.service = new Service.WindowCovering(this.name);

    // the current position (0-100%)
    // https://github.com/KhaosT/HAP-NodeJS/blob/master/lib/gen/HomeKitTypes.js#L493
    this.service
        .getCharacteristic(Characteristic.CurrentPosition)
        .on('get', this.getCurrentStatePartial.bind(this));

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
        .on('get', this.getCurrentStatePartial.bind(this))
        .on('set', this.setTargetPosition.bind(this));
        
        
    } else if (this.deviceType.match(/^light/i)) {
  		this.log("HttpMulti Light Object Initializing...");
    
     	this.lastState = 0; 
     	this.lastStatePartial = 0;
    	this.currentState = 0;  
    	this.TargetState = 0;
    	this.lastUpdate = Date.now();
    	this.partial = 0;

    // register the service and provide the functions
    this.service = new Service.Lightbulb(this.name);

    this.service
        .getCharacteristic(Characteristic.On)
        .on('get', this.getCurrentState.bind(this))
        .on('set', this.setCurrentState.bind(this));

    this.service
        .getCharacteristic(Characteristic.Brightness)
        .on('get', this.getCurrentStatePartial.bind(this))
        .on('set', this.setCurrentStatePartial.bind(this));

    } else if (this.deviceType.match(/^fan/i)) {
  		this.log("HttpMulti Fan Object Initializing...");

     	this.lastState = 0; 
     	this.lastStatePartial = 0;
    	this.currentState = 0;  
    	this.TargetState = 0;
    	this.partial = 0;

    // register the service and provide the functions
    this.service = new Service.Fan(this.name);

    this.service
        .getCharacteristic(Characteristic.On)
        .on('get', this.getCurrentState.bind(this))
        .on('set', this.setCurrentState.bind(this));

    this.service
        .getCharacteristic(Characteristic.RotationSpeed)
        .on('get', this.getCurrentStatePartial.bind(this))
        .on('set', this.setCurrentStatePartial.bind(this));


    } else if (this.deviceType.match(/^switch/i)) {
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


    } else if (this.deviceType.match(/^garagedoor/i)) {
  		this.log("HttpMulti Garage door Object Initializing...");

 	    // state vars
//		this.lastPosition = 0; 	    
    	this.lastState = 0; 
    	this.currentPositionState = 0; 
    	this.currentTargetPosition = 0; 
    	this.lastObstructed = false;

    	// register the service and provide the functions
    	this.service = new Service.GarageDoorOpener(this.name);

		// 0 - OPEN, 1 - CLOSED, 2 - OPENING, 3 - CLOSING, 4 - STOPPED
   		this.service
        	.getCharacteristic(Characteristic.CurrentDoorState)
//        	.on('get', this.getCurrentPosition.bind(this))
        	.on('get', this.getCurrentState.bind(this))

        
		//0 - OPEN, 1 - CLOSED
    	this.service
        	.getCharacteristic(Characteristic.TargetDoorState)
        	.on('get', this.getCurrentState.bind(this))
        	.on('set', this.setTargetDoorPosition.bind(this));

    	this.service
        	.getCharacteristic(Characteristic.ObstructionDetected)
        	.on('get', this.getObstructed.bind(this));


    } else if (this.deviceType.match(/^lock/i)) {
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

    } else if (this.deviceType.match(/^thermostat/i)) {
  		this.log("HttpMulti Thermostat Object Initializing...");

     	this.lastState = 0; // 0 OFF, 1 HEAT, 2 COOL
    	this.currentState = 0;  
    	this.TargetState = 0;
     	//this.lastTemp = ;
     	//this.TargetTemp = 15;
     	this.units = 0; // 0 Celcius, 1 Fahrenheit 
     	if (this.unit_type !== "C") this.units = 1;

   		this.service = new Service.Thermostat(this.name);

    	this.service
       		.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
        	.on('get', this.getCurrentStatePartial.bind(this));

   		this.service
        	.getCharacteristic(Characteristic.TargetHeatingCoolingState)
        	.on('get', this.getCurrentStatePartial.bind(this))
        	.on('set', this.setCurrentThermoState.bind(this));

   		this.service
        	.getCharacteristic(Characteristic.CurrentTemperature)
        	.on('get', this.getCurrentTemp.bind(this));

   		this.service
        	.getCharacteristic(Characteristic.TargetTemperature)
        	.on('get', this.getCurrentTemp.bind(this))
        	.on('set', this.setCurrentTemp.bind(this));


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
    callback(null, this.lastState);
}

HttpMulti.prototype.getCurrentState = function(callback) {
    this.log("Requested CurrentState: %s", this.lastState);
    if (this.status_url !== undefined) {
    	request.get({
    		url: this.status_url,
  			}, function(error, response, body) {
  			this.log("Status_URL: %s", this.status_url);
  			if (!error && response.statusCode == 200) {
    			if (body !== undefined) {
    				if (!isNaN(parseFloat(body)) && isFinite(body)) {
	    			    this.lastState = (parseInt(body) > 0);	
	    				this.log("Got Status %s",this.lastState);

	    			} else {
	    				this.log("Warning, status returned isn't numeric: %s",body);
	    			}
    			} else {
    				this.log("Warning, data returned isn't defined");
    			}  	
    		this.log("callback CurrentState: %s", this.lastState);      				
  			callback(null, this.lastState);
  			}
    	}.bind(this));
    } else {
  		callback(null, this.lastState);
    }
}

HttpMulti.prototype.getCurrentStatePartial = function(callback) {
    this.log("Requested CurrentState: %s", this.lastStatePartial);
    if (this.status_url !== undefined) {
    	request.get({
    		url: this.status_url,
  			}, function(error, response, body) {
  			this.log("Status_URL: %s", this.status_url);
  			if (!error && response.statusCode == 200) {
    			if (body !== undefined) {
    				if (!isNaN(parseFloat(body)) && isFinite(body)) {
	    			    this.lastStatePartial = parseInt(body);	
	    				this.log("Got Status %s",this.lastStatePartial);
	    			} else {
	    				this.log("Warning, status returned isn't numeric: %s",body);
	    			}
    			} else {
    				this.log("Warning, data returned isn't defined");
    			}  	
    		this.log("callback CurrentState: %s", this.lastStatePartial);      				
  			callback(null, this.lastStatePartial);
  			}
    	}.bind(this));
    } else {
  		callback(null, this.lastStatePartial);
    }
}

HttpMulti.prototype.getCurrentUnits = function(callback) {
    this.log("Requested CurrentUnits: %s", this.units);
    callback(null, this.units);
}

HttpMulti.prototype.getCurrentTemp = function(callback) {
    this.log("Requested CurrentTemp: %s", this.lastTemp);
    if (this.gettemp_url !== undefined) {
    	request.get({
    		url: this.gettemp_url,
  			}, function(error, response, body) {
  			this.log("Gettemp_URL: %s", this.gettemp_url);
  			if (!error && response.statusCode == 200) {
    			if (body !== undefined) {
    				if (!isNaN(parseFloat(body)) && isFinite(body)) {
	    			    this.lastTemp = parseInt(body);	
	    				this.log("Got Temp %s",this.lastTemp);
    					callback(null, this.lastTemp);
	    			} else {
	    				this.log("Warning, status returned isn't numeric: %s",body);
	    			}
    			} else {
    				this.log("Warning, data returned isn't defined");
    			}  				
  			}
    	}.bind(this));
    } else {
    	callback(null, this.lastTemp);
    }
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
    // 0 down, >0 up.
    this.currentTargetPosition = pos;
    const moveUp = (pos > 0);
    this.log((moveUp ? "Moving up" : "Moving down"));

    this.service
        .setCharacteristic(Characteristic.PositionState, (moveUp ? 1 : 0));
        
	this.log("up="+this.up_url+" down="+this.down_url+" method="+this.httpMethod);
    this.httpRequest((moveUp ? this.up_url : this.down_url), this.httpMethod, function() {
        this.log("Success moving %s", (moveUp ? "up (to 100)" : "down (to 0)"))
        this.service
            .setCharacteristic(Characteristic.CurrentPosition, (moveUp ? 100 : 0));
//        this.service
//            .setCharacteristic(Characteristic.PositionState, 2);
        this.lastPosition = (moveUp ? 100 : 0);
		this.lastState = (moveUp ? 1 : 0 );
        callback(null);
    }.bind(this));
}

HttpMulti.prototype.setTargetDoorPosition = function(pos, callback) {
    this.log("Set TargetDoorPosition: %s", pos);
    this.currentTargetPosition = pos;
    //const moveUp = (this.currentTargetPosition >= this.lastPosition);
    this.log((pos ? "Moving down" : "Moving up"));
        
	this.log("up="+this.up_url+" down="+this.down_url+" method="+this.httpMethod);
    this.httpRequest((pos ? this.down_url : this.up_url), this.httpMethod, function() {
        this.log("Success moving %s", (pos ? "down (to 0)" : "up (to 1)"));
        this.service
        	.setCharacteristic(Characteristic.CurrentDoorState, pos);
		this.lastState = pos; //(pos ? 0 : 1 );
        callback(null);
    }.bind(this));
}

HttpMulti.prototype.setCurrentState = function(value, callback) {
    this.log("Set CurrentState: %s", value);
    this.currentTargetState = value;
    this.log((value ? "Turning On" : "Turning Off"));
	if (this.partial == 1) {
		//It's a dim operation, so don't turn the light on
		this.log("Ignoring on since device is partially on");
		this.partial = 0;
		callback(null);
	} else {
		this.log("on="+this.on_url+" off="+this.off_url+" method="+this.httpMethod);
    	this.httpRequest((value ? this.on_url : this.off_url), this.httpMethod, function() {
        	this.log("Success turning %s", (value ? "on" : "off"));
        	this.lastState = value;
        	this.partial = 0;
        	callback(null);
    	}.bind(this));
    }
}

HttpMulti.prototype.setCurrentThermoState = function(value, callback) {
    this.log("Set CurrentThermoState: %s", value);
    this.currentTargetState = value;
	var myURL = this.mode_url;
	myURL = myURL.replace("%VALUE%",value);

	if (value == 0) {
		this.log("0 Off "+myURL);
	} else if (value == 1) {
		this.log("1 HEAT "+myURL);
	}else if (value == 2) {
		this.log("2 COOL "+myURL);
	} else if (value == 3) {
		this.log("3 AUTO "+myURL);
	}
    this.httpRequest(myURL, this.httpMethod, function() {
        this.log("Success turning %s", value)
        this.lastState = value;
        	callback(null);
    	}.bind(this));
}

HttpMulti.prototype.setCurrentTemp = function(value, callback) {
    this.log("Set Current Temp: %s", value);
    this.lastTemp = value;
	var myURL = this.mode_url;
	myURL = myURL.replace("%VALUE%",value);

    this.httpRequest(myURL, this.httpMethod, function() {
        this.log("Success setting temp %s", value)
        this.lastTemp = value;
        	callback(null);
    	}.bind(this));
}


HttpMulti.prototype.setCurrentStatePartial = function(value, callback) {
    this.log("Set Partial State: %s", value);
    this.currentTargetState = value;
           	this.partial = 1; 	

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
        	this.lastState = 1;
        	this.lastStatePartial = value;
        	this.partial = 0;
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
     	var currentState = (value == Characteristic.LockTargetState.SECURED) ?
        	Characteristic.LockCurrentState.SECURED : Characteristic.LockCurrentState.UNSECURED;
      
      	this.service.setCharacteristic(Characteristic.LockCurrentState, currentState);

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

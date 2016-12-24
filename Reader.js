const Freefare = require('freefare');
const EventEmitter = require('events');
const Config = require('./config.json');

/**
 * Interact with an NFC reader that will read UTT student ID
 * and emit event when card is read or removed.
 */
class Reader extends EventEmitter {

    /**
     * Constructor
     */
    constructor() {
        super();

        this.devices = [];
        this.studentID = null;

        // An associative array of UID to sudentID
        this.knownTags

		this.freefare = new Freefare();
		this.freefare.listDevices()
		.then(devices => {
			if(devices.length < 1) {
				console.error(new Error('NFC device not found'));
			}
			if(devices.length > 1) {
				console.warn('Warning: More than one device found, we take them all.');
			}

			this.devices = [];
			for(let device of devices) {
				device.open()
				.then(() => {
					console.info('NFC device opened : ' + device.name);
					this.devices.push(device);
				})
                .catch((error) => {
                    console.log('Error on device openning', error)
                })
			}
		})

		this.check();
    }

    /**
     * Check for cards
     */
    check() {
		// Restart in case of crash
		let watchdog = setTimeout(() => {
			console.warn('Warning: Reader.check() hasn\'t stop the timeout. Restarting Reader.check()...');
			this.check();
		}, 3000);

        // Number of device that are till working
        let devicesLeft = this.devices.length;
        let studentId = null;

		for (let device of this.devices) {
			device.listTags()
			.then(tags => {
				let promise = Promise.resolve();
				for (let tag of tags) {
					promise = promise.then(() => {
                        console.info(tag.getUID() + ': ' + tag.getFriendlyName() + ' tag found');
                        if(tag.getType() == 'MIFARE_CLASSIC_1K') {
                            return tag.open()
                            .then(() => {
                                // -----------
                                console.log(tag.getUID()+': Authenticate');
                                return tag.authenticate(Config.classic.file, new Buffer(Config.classic.key, 'hex'), Config.classic.keyType);
                            })
                            .then(() => {
                                // -----------
                                console.log(tag.getUID()+': Read block');
                                return tag.read(Config.classic.file);
                            })
                            .then((data) => {
                                if(studentId === null) {
                                    studentId = data.toString('utf8', 8, 13);
                                    console.log(tag.getUID()+': Student ID found ========> ' + studentId + ' <========');
                                }
                                else {
                                    console.log(tag.getUID()+': Another student ID found but ignored ========> ' + data.toString('utf8', 8, 13) + ' <========');
                                }
                                console.log(tag.getUID()+': Close tag');
                                return tag.close();
                            });
                        }
                        else if (tag.getType() == 'MIFARE_DESFIRE'){
                            return tag.open()
                            .then(() => {
                                console.log(tag.getUID()+': Select application');
                                return tag.selectApplication(Config.desfire.appId, 'hex');
                            })
                            .then(() => {
                                console.log(tag.getUID()+': Authenticate with a read only-key');
                                return tag.authenticate3DES(Config.desfire.keyId, new Buffer(Config.desfire.key, 'hex'));
                            })
                            .then(() => {
                                console.log(tag.getUID()+': Read file');
                                return tag.read(Config.desfire.file, 8, 5);
                            })
                            .then((data) => {
                                if(studentId === null) {
                                    studentId = data.toString('utf8');
                                    console.log(tag.getUID()+': Student ID found ========> ' + studentId + ' <========');
                                }
                                else {
                                    console.log(tag.getUID()+': Another student ID found but ignored ========> ' + data.toString('utf8') + ' <========');
                                }
                                // -----------
                                console.log(tag.getUID()+': Close tag');
                                return tag.close();
                            });
                        }
                        else {
                            console.info(tag.getUID()+': Tag ignored');
                            return Promise.resolve();
                        }
					})
				}

                if(tags.length <= 0) {
                    studentId = null;
                }
				return promise;
			})
            .then(() => {
                // We are done with this device
                devicesLeft--;
                if(devicesLeft <= 0) {
                    // We update studentID state and emit events
                    if(studentId != this.studentId) {
                        this.studentId = studentId;
                        if(studentId === null) {
                            this.emit('tagRemoved');
                        }
                        else {
                            this.emit('newTag', studentId);
                        }
                    }

                    // We are now restarting the function
                    clearTimeout(watchdog);
                    setImmediate(() => {
                        this.check();
                    });
                }
            })
			.catch(error => {
				console.log(error);
                // We have an error with that device
                devicesLeft--;
                if(devicesLeft <= 0) {
                    // We are now restarting the function
                    clearTimeout(watchdog);
                    setImmediate(() => {
                        this.check();
                    });
                }
			});
		}
    }
}

module.exports = Reader;

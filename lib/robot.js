var api = require(__dirname + '/api');
var crypto = require('crypto');

const NUCLEO_BASE_URL = 'https://nucleo.neatocloud.com:4443/vendors/neato/robots/';
const BEEHIVE_BASE_URL = 'https://beehive.neatocloud.com/users/me/robots/';

const CATEGORY = {
    OFF: 0,
    MANUAL: 1,
    HOUSE: 2,
    SPOT: 3,
    HOUSE_PERSISTENT_MAP: 4,
}

const MODE = {
    ECO: 1,
    TURBO: 2,
}

const CLEANING_FREQUENCY = {
    NORMAL: 1,
    DOUBLE: 2,
}

const NAVIGATION_MODE = {
    NORMAL: 1,
    EXTRA_CARE: 2,
}

class Robot {
    constructor(name, serial, secret, token) {
        this.name = name;
        this._serial = serial;
        this._secret = secret;
        this._token = token;

        //updated when getState() is called
        this.isCharging = null;
        this.isDocked = null;
        this.isScheduleEnabled = null;
        this.dockHasBeenSeen = null;
        this.charge = null;
        this.canStart = null;
        this.canStop = null;
        this.canPause = null;
        this.canResume = null;
        this.canGoToBase = null;
        this.eco = null;
        this.noGoLines = null;
        this.extraCare = null;
        this.spotWidth = 0;
        this.spotHeight = 0;
        this.spotRepeat = null;
        this.cleaningBoundaryId = null;

        this.meta = null;
        this.availableServices = null;
    }

    async getState() {
        let response = await doAction(this, 'getRobotState', null)

        if (response.data === undefined) {
            throw new Error('No result');
        } else if (response.data && 'message' in response.data) {
            throw new Error(response.data.message);
        } else {
            let state = response.data;
            this.fillState(state);
            return state;
        }
    }
    
    fillState(state) {
        this.isCharging = state.details.isCharging;
        this.isDocked = state.details.isDocked;
        this.isScheduleEnabled = state.details.isScheduleEnabled;
        this.dockHasBeenSeen = state.details.dockHasBeenSeen;
        this.charge = state.details.charge;

        this.canStart = state.availableCommands.start;
        this.canStop = state.availableCommands.stop;
        this.canPause = state.availableCommands.pause;
        this.canResume = state.availableCommands.resume;
        this.canGoToBase = state.availableCommands.goToBase;

        this.eco = state.cleaning.mode === MODE.ECO;
        this.noGoLines = state.cleaning.category === CATEGORY.HOUSE_PERSISTENT_MAP;
        this.extraCare = state.cleaning.navigationMode == NAVIGATION_MODE.EXTRA_CARE;
        this.spotWidth = state.cleaning.spotWidth === 0 ? this.spotWidth : state.cleaning.spotWidth;
        this.spotHeight = state.cleaning.spotHeight === 0 ? this.spotHeight : state.cleaning.spotHeight;
        this.spotRepeat = state.cleaning.modifier === CLEANING_FREQUENCY.DOUBLE;
        this.cleaningBoundaryId = state.cleaning.boundaryId;

        this.meta = state.meta;
        this.availableServices = state.availableServices;
    }

    async getSchedule() {
        let response = await doAction(this, 'getSchedule', null)

        if (response.data === undefined) {
            throw new Error('No result');
        } else if (response.data && 'message' in response.data) {
            throw new Error(response.data.message);
        } else if (response.data && response.data.result === 'ko') {
            throw new Error('Internal error');
        } else {
            return response.data
        }
    }

    async enableSchedule() {
        let response = await doAction(this, 'enableSchedule', null);

        if (response.data === undefined) {
            throw new Error('No result');
        } else if (response.data && 'message' in response.data) {
            throw new Error(response.data.message);
        } else if (response.data && response.data.result === 'ko') {
            throw new Error('Internal error');
        } else {
            this.isScheduleEnabled = true;
            return response.data.result;
        }
    }

    async disableSchedule() {
        let response = await doAction(this, 'disableSchedule', null)

        if (response.data === undefined) {
            throw new Error('No result');
        } else if (response.data && 'message' in response.data) {
            throw new Error(response.data.message);
        } else if (response.data && response.data.result === 'ko') {
            throw new Error('Internal error');
        } else {
            this.isScheduleEnabled = false;
            return response.data.result;
        }
    }

    async sendToBase() {
        let response = await doAction(this, 'sendToBase', null)

        if (response.data === undefined) {
            throw new Error('No result');
        } else if (response.data && 'message' in response.data) {
            throw new Error(response.data.message);
        } else if (response.data && response.data.result === 'ko') {
            throw new Error('Internal error');
        } else {
            this.fillState(response.data);
            return response.data.result;
        }
    }
    
    async stopCleaning() {
        let response = await doAction(this, 'stopCleaning', null);

        if (response.data === undefined) {
            throw new Error('No result');
        } else if (response.data && 'message' in response.data) {
            throw new Error(response.data.message);
        } else if (response.data && response.data.result === 'ko') {
            throw new Error('Internal error');
        } else {
            this.fillState(response.data);
            return response.data.result;
        } 
    }

    async pauseCleaning() {
        let response = await doAction(this, 'pauseCleaning', null)

        if (response.data === undefined) {
            throw new Error('No result');
        } else if (response.data && 'message' in response.data) {
            throw new Error(response.data.message);
        } else if (response.data && response.data.result === 'ko') {
            throw new Error('Internal error');
        } else {
            this.fillState(response.data);
            return response.data.result;
        } 
    }
    
    async resumeCleaning() {
        let response = await doAction(this, 'resumeCleaning', null)

        if (response.data === undefined) {
            throw new Error('No result');
        } else if (response.data && 'message' in response.data) {
            throw new Error(response.data.message);
        } else if (response.data && response.data.result === 'ko') {
            throw new Error('Internal error');
        } else {
            this.fillState(response.data);
            return response.data.result;
        } 
    }

    async startCleaning(eco = this.eco, extraCare = this.extraCare, noGoLines = this.noGoLines) {    
        var params = {
            category: noGoLines ? CATEGORY.HOUSE_PERSISTENT_MAP : CATEGORY.HOUSE, 
            mode: eco ? MODE.ECO : MODE.TURBO,
            modifier: CLEANING_FREQUENCY.NORMAL,
            navigationMode: extraCare ? NAVIGATION_MODE.EXTRA_CARE : NAVIGATION_MODE.NORMAL 
        };

        let response = await doAction(this, 'startCleaning', params)
        
        if (response.data === undefined) {
            throw new Error('No result');
        } else if (response.data && 'message' in response.data) {
            throw new Error(response.data.message);
        } else if (response.data && response.data.result === 'ko') {
            throw new Error('Internal error');
        } else {
            this.fillState(response.data);
            return response.data.result;
        } 
    }

    async startSpotCleaning(eco = this.eco,  extraCare = this.extraCare, repeat = this.spotRepeat, width = this.spotWidth, height = this.spotHeight) {
        var params = {
            category: CATEGORY.SPOT, 
            mode: eco ? MODE.ECO : MODE.TURBO,
            modifier: repeat ? CLEANING_FREQUENCY.DOUBLE : CLEANING_FREQUENCY.NORMAL,
            navigationMode: extraCare ? NAVIGATION_MODE.EXTRA_CARE : NAVIGATION_MODE.NORMAL, 
            spotWidth: width,
            spotHeight: height
        };

        let response = await doAction(this, 'startCleaning', params)
        
        if (response.data === undefined) {
            throw new Error('No result');
        } else if (response.data && 'message' in response.data) {
            throw new Error(response.data.message);
        } else if (response.data && response.data.result === 'ko') {
            throw new Error('Internal error');
        } else {
            this.fillState(response.data);
            return response.data.result;
        } 
    }

    /**
     * Start cleaning a specific boundary (of type polygone)
     *
     * @param {bool} eco - enable eco cleaning or do a turbo clean
     * @param {bool} extraCare - enable extra care
     * @param {string} boundaryId - A {@link Boundary} id to clean (uuid-v4)
     */
    async startCleaningBoundary(boundaryId, eco = this.eco, extraCare = this.extraCare) {
        
        if (boundaryId === undefined) throw new Error('No boundary specified');
        
        var params = {
            boundaryId: boundaryId, // Boundary to clean
            category: CATEGORY.HOUSE_PERSISTENT_MAP,
            mode: eco ? MODE.ECO : MODE.TURBO,
            navigationMode: extraCare ? NAVIGATION_MODE.EXTRA_CARE : NAVIGATION_MODE.NORMAL
        };

        let response = await doAction(this, 'startCleaning', params);
        
        if (response.data === undefined) {
            throw new Error('No result');
        } else if (response.data && 'message' in response.data) {
            throw new Error(response.data.message);
        } else if (response.data && response.data.result === 'ko') {
            throw new Error('Internal error');
        } else {
            this.fillState(response.data);
            return response.data.result;
        } 
    };

    /**
     * A Map
     * 
     * @typedef {Object} Map
     * @property {string} id - The title
     * @property {string} name - The artist
     * @property {string} raw_floor_map_url - url pointing to a png image of the raw floor map
     * @property {string} url - url pointing to a png image of the floor map
     * @property {number} url_valid_for_seconds - number of seconds the map urls are valid
     */

    /**
     * Get an array of persistent maps for this robot
     * @returns {Map[]} maps - The list of {@link Map} for this robot
     */
    async getPersistentMaps() {
        let response = await robotRequest(this, 'beehive', 'GET', '/persistent_maps', null);
        
        if (response.data === undefined) {
            throw new Error('No result');
        } else if (response.data && 'message' in response.data) {
            throw new Error(response.data.message);
        } else if (response.data && response.data.result === 'ko') {
            throw new Error('Internal error');
        } else {
            return response.data;
        } 

    }

    /**
     * A Boundary (zone or no go line)
     *
     * @typedef {Object} Boundary
     * @property {string} color - color hex code for a type polygone or '#000000' for a type polyline
     * @property {bool} enabled - always true, unknown usage
     * @property {string} id - boundary id (uuid-v4)
     * @property {string} name - polygone name or empty string for a type polyline
     * @property {number[]} [relevancy] - array of 2 number, center of a type polygone
     * @property {string} type - either polyline (for a no go lines) or polygon (for a zone)
     * @property {number[][]} vertices - array of array of two points, coordinates of the points
     */

    /**
     * Get an array of {@link Boundary} for the specified {@link Map}
     *
     * @param {string} mapId - An id from a {@link Map} to request its list of {@link Boundary}
     * @returns {Boundary[]|*} - An array of {@link Boundary} for the specified {@link Map} or the request result if an error occur
     */
    async getMapBoundaries(mapId) {

        let response = await doAction(this, 'getMapBoundaries', { mapId: mapId });

        if (response.data === undefined) {
            throw new Error('No result');
        } else if (response.data && 'message' in response.data) {
            throw new Error(response.data.message);
        } else if (response.data && response.data.result === 'ko') {
            throw new Error('Internal error');
        } else {
            return { mapId: mapId, boundaries: response.data.boundaries };
        } 
    }

    /**
     * Let the robot emit a sound and light to find him
     */
    async findMe() {
        var params = {};

        let response = doAction(this, 'findMe', params);

        if (response.data === undefined) {
            throw new Error('No result');
        } else if (response.data && 'message' in response.data) {
            throw new Error(response.data.message);
        } else if (response.data && response.data.result === 'ko') {
            throw new Error('Internal error');
        } else {
            this.fillState(response.data);
            return response.data.result;
        } 
    }

}

var robotMessagesRequestId = 1;
function doAction(robot, command, params) {
    var payload = {
        reqId: robotMessagesRequestId++,
        cmd: command
    };
    if (params) {
        payload.params = params;
    }
    return robotRequest(robot, 'nucleo', 'POST', '/messages', payload);
}

function robotRequest(robot, service, type, endpoint, payload) {
    if (robot._serial && robot._secret) {
        payload = JSON.stringify(payload);
        var date = new Date().toUTCString();
        var data = [robot._serial.toLowerCase(), date, payload].join("\n");
        var headers = {
            Date: date
        };
        var url;
        if (service === 'nucleo') {
            var hmac = crypto.createHmac('sha256', robot._secret).update(data).digest('hex');
            headers.Authorization = 'NEATOAPP ' + hmac;
            url = NUCLEO_BASE_URL + robot._serial + endpoint
        } else if (service === 'beehive') {
            headers.Authorization = robot._token;
            url = BEEHIVE_BASE_URL + robot._serial + endpoint
        } else {
            throw new Error('Service' + service + 'unknown');
        }

        return api.request(url, payload, type, headers);

    } else {
        throw new Error('No serial or secret');
    }
}

module.exports = Robot;
